/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { MlClient } from '../../../lib/ml_client';
import { DFA_CREATE_JOB_TOOL_ID } from '../tool_ids';
import { buildDfaConfig, createConfigSchema } from './job_config';
import {
  countSourceDocuments,
  dataResults,
  errorResults,
  formatDfaToolError,
  requireMlClient,
  type DfaToolDeps,
} from './tool_utils';

const schema = createConfigSchema;

/**
 * Create writes the job as the current user. MlClient.putDataFrameAnalytics uses
 * asSecondaryAuthUser, so source and destination index privileges are that user's.
 * This tool does not start the job.
 */
export const createDfaCreateJobTool = (
  deps: DfaToolDeps
): BuiltinSkillBoundedTool<typeof schema> => ({
  id: DFA_CREATE_JOB_TOOL_ID,
  type: ToolType.builtin,
  description:
    "Create a data frame analytics job. Does not start it. Call ml.dfa_explain first. When training_percent is omitted, regression and classification count the source index: more than 100000 documents use 10, a few hundred documents such as about 700 use 60, and other sizes use 80. Runs as the current user, so a missing source or destination index privilege returns that user's security_exception. Leave hyperparameters unset so optimization fills them.",
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

    const sourceDocCount =
      params.analysis_type !== 'outlier_detection' && params.training_percent === undefined
        ? await countSourceDocuments(esClient, params.source_index)
        : undefined;
    const built = buildDfaConfig(params, { sourceDocCount });
    if (built.error || !built.built) {
      return errorResults(built.error ?? 'Invalid data frame analytics config.');
    }

    try {
      const response = await loaded.mlClient.putDataFrameAnalytics({
        id: params.id,
        body: built.built.body,
      } as Parameters<MlClient['putDataFrameAnalytics']>[0]);
      return dataResults({
        created: true,
        id: params.id,
        started: false,
        training_percent_applied: built.built.training_percent_applied,
        notes: built.built.notes,
        config: built.built.body,
        response,
      });
    } catch (error) {
      return errorResults(formatDfaToolError('create the data frame analytics job', error));
    }
  },
});
