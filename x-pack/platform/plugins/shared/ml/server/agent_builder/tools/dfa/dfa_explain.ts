/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { MlClient } from '../../../lib/ml_client';
import { DFA_EXPLAIN_TOOL_ID } from '../tool_ids';
import { buildDfaConfig, explainConfigSchema, type DfaConfigInput } from './job_config';
import {
  countSourceDocuments,
  dataResults,
  errorResults,
  formatDfaToolError,
  requireMlClient,
  type DfaToolDeps,
} from './tool_utils';

const schema = explainConfigSchema;

/**
 * Explain reads the source index as the current user. MlClient.explainDataFrameAnalytics
 * calls asSecondaryAuthUser, so a missing index privilege surfaces as that user's security_exception.
 */
export const createDfaExplainTool = (
  deps: DfaToolDeps
): BuiltinSkillBoundedTool<typeof schema> => ({
  id: DFA_EXPLAIN_TOOL_ID,
  type: ToolType.builtin,
  description:
    "Explain a data frame analytics config before creating it, or explain an existing job by id. Returns field selection and the memory estimate. Runs as the current user, so a missing source-index privilege returns that user's security_exception. Does not create or start a job.",
  experimental: true,
  schema,
  handler: async (params, { esClient, savedObjectsClient, request }) => {
    const loaded = await requireMlClient(
      deps,
      request,
      esClient,
      savedObjectsClient,
      'canCreateDataFrameAnalytics'
    );
    if ('error' in loaded) {
      return loaded.error;
    }

    const hasConfig =
      params.source_index !== undefined ||
      params.dest_index !== undefined ||
      params.analysis_type !== undefined;
    if (params.job_id && hasConfig) {
      return errorResults('Pass either job_id or a proposed config, not both.');
    }
    if (!params.job_id && !hasConfig) {
      return errorResults(
        'Pass job_id to explain an existing job, or source_index, dest_index, and analysis_type to explain a proposed config.'
      );
    }

    try {
      if (params.job_id && !hasConfig) {
        const explanation = await loaded.mlClient.explainDataFrameAnalytics({
          id: params.job_id,
        } as Parameters<MlClient['explainDataFrameAnalytics']>[0]);
        return dataResults({ explanation });
      }

      if (!params.source_index || !params.dest_index || !params.analysis_type) {
        return errorResults(
          'A proposed config requires source_index, dest_index, and analysis_type.'
        );
      }
      const proposed = {
        ...params,
        id: params.job_id ?? 'explain-only',
      } as DfaConfigInput;
      const sourceDocCount =
        proposed.analysis_type !== 'outlier_detection' && proposed.training_percent === undefined
          ? await countSourceDocuments(esClient, proposed.source_index)
          : undefined;
      const built = buildDfaConfig(proposed, { sourceDocCount });
      if (built.error || !built.built) {
        return errorResults(built.error ?? 'Invalid data frame analytics config.');
      }
      const explanation = await loaded.mlClient.explainDataFrameAnalytics(
        built.built.body as Parameters<MlClient['explainDataFrameAnalytics']>[0]
      );
      return dataResults({
        config: built.built.body,
        notes: built.built.notes,
        training_percent_applied: built.built.training_percent_applied,
        explanation,
      });
    } catch (error) {
      return errorResults(formatDfaToolError('explain the data frame analytics config', error));
    }
  },
});
