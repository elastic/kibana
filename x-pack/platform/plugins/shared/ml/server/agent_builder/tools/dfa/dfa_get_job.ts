/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { MlClient } from '../../../lib/ml_client';
import {
  DFA_SCATTERPLOT_MATRIX_ATTACHMENT_TYPE,
  DFA_TOTAL_FEATURE_IMPORTANCE_ATTACHMENT_TYPE,
} from '../../attachment_types/constants';
import { DFA_GET_JOB_TOOL_ID } from '../tool_ids';
import { jobIdSchema } from './job_config';
import {
  analysisTypeOf,
  dataResults,
  errorResults,
  formatDfaToolError,
  jobsFrom,
  requireMlClient,
  requirePrivilege,
  slimJob,
  type DfaJobRecord,
  type DfaToolDeps,
} from './tool_utils';

const schema = lazySchema(() =>
  z.object({
    job_id: jobIdSchema
      .optional()
      .describe('Analytics job id. Omit to list up to 50 jobs in the current space.'),
    include_model_metadata: z
      .boolean()
      .optional()
      .describe(
        'When true and job_id is set, create the feature importance chart and scatterplot matrix. Copy chart_attachment.render and scatterplot_attachment.render into the reply. chart_attachment.render is the feature importance chart. Do not build another chart from total_feature_importance or from per-row samples. Do not call attachments.read. The confusion matrix is a custom content chart from platform.core.create_visualization, named with the classes from this job. It is not this tool. Requires canGetTrainedModels for model totals. Outlier jobs have no feature-importance chart.'
      ),
  })
);

const LIST_SIZE = 50;
const MAX_CHART_FEATURES = 100;

function chartSeries(value: unknown): unknown[] | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }
  return value.slice(0, MAX_CHART_FEATURES);
}

function renderAttachment(attachment: { id: string; current_version: number }) {
  return {
    attachment_id: attachment.id,
    version: attachment.current_version,
    render: `<render_attachment id="${attachment.id}" version="${attachment.current_version}" />`,
  };
}

function dependentVariableOf(job: DfaJobRecord): string | undefined {
  const analysisType = analysisTypeOf(job);
  if (analysisType !== 'classification' && analysisType !== 'regression') {
    return undefined;
  }
  const analysis = job.analysis?.[analysisType] as { dependent_variable?: unknown } | undefined;
  return typeof analysis?.dependent_variable === 'string' ? analysis.dependent_variable : undefined;
}

function boundedFields(values: string[] | undefined): string[] | undefined {
  const fields = values?.filter((value) => value.length > 0 && value.length <= 256).slice(0, 50);
  return fields && fields.length > 0 ? fields : undefined;
}

function isAvailableMetadata(
  metadata: unknown
): metadata is { available: true; total_feature_importance?: unknown } {
  return (
    typeof metadata === 'object' &&
    metadata !== null &&
    'available' in metadata &&
    metadata.available === true
  );
}

function findDfaModel<T extends { metadata?: object }>(models: T[], jobId: string): T | undefined {
  return (
    models.find((model) => {
      // The Elasticsearch type omits analytics_config; data frame analytics models include it.
      const metadata = model.metadata as { analytics_config?: { id?: string } } | undefined;
      return metadata?.analytics_config?.id === jobId;
    }) ?? (models.length === 1 ? models[0] : undefined)
  );
}

async function readModelMetadata(mlClient: MlClient, job: DfaJobRecord) {
  if (!job.id) {
    return { available: false, reason: 'Job id is missing, so the trained model cannot be read.' };
  }
  if (analysisTypeOf(job) === 'outlier_detection') {
    return {
      available: false,
      reason:
        'Outlier detection does not create a trained model. Read per-document feature_influence from METADATA _source.',
    };
  }
  try {
    const modelId = `${job.id}*`;
    const [importanceResponse, baselineResponse] = await Promise.all([
      mlClient.getTrainedModels({
        model_id: modelId,
        allow_no_match: true,
        include: 'total_feature_importance',
      }),
      mlClient.getTrainedModels({
        model_id: modelId,
        allow_no_match: true,
        include: 'feature_importance_baseline',
      }),
    ]);
    const match = findDfaModel(importanceResponse.trained_model_configs ?? [], job.id);
    if (!match) {
      return {
        available: false,
        reason: 'Trained model is not available until the job finishes the inference phase.',
      };
    }
    const baseline = findDfaModel(baselineResponse.trained_model_configs ?? [], job.id);
    return {
      available: true,
      model_id: match.model_id,
      total_feature_importance: match.metadata?.total_feature_importance,
      feature_importance_baseline: baseline?.metadata?.feature_importance_baseline,
    };
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 404) {
      return {
        available: false,
        reason: 'Trained model is not available until the job finishes the inference phase.',
      };
    }
    return { available: false, reason: formatDfaToolError('read trained model metadata', error) };
  }
}

export const createDfaGetJobTool = (deps: DfaToolDeps): BuiltinSkillBoundedTool<typeof schema> => ({
  id: DFA_GET_JOB_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Read data frame analytics job config and runtime stats. Pass include_model_metadata to create the feature importance chart and scatterplot. Copy chart_attachment.render and scatterplot_attachment.render into the reply. chart_attachment.render is the feature importance chart. Do not build another one from the totals or from per-row samples. Do not call attachments.read. The confusion matrix is a custom content chart from platform.core.create_visualization, named with the classes from this job.',
  experimental: true,
  schema,
  handler: async ({ job_id: jobId, include_model_metadata: includeModelMetadata }, context) => {
    const { esClient, savedObjectsClient, request, attachments } = context;
    const loaded = await requireMlClient(
      deps,
      request,
      esClient,
      savedObjectsClient,
      'canGetDataFrameAnalytics'
    );
    if ('error' in loaded) {
      return loaded.error;
    }

    try {
      const [configResponse, statsResponse] = await Promise.all([
        loaded.mlClient.getDataFrameAnalytics(jobId ? { id: jobId } : { size: LIST_SIZE }),
        loaded.mlClient.getDataFrameAnalyticsStats(jobId ? { id: jobId } : { size: LIST_SIZE }),
      ]);
      const configs = jobsFrom(configResponse);
      const stats = jobsFrom(statsResponse);
      const statsById = new Map(stats.map((job) => [job.id, job]));
      const jobs = configs.map((config) => slimJob(config, statsById.get(config.id)));
      if (jobId && jobs.length === 0) {
        return errorResults(`Job not found: ${jobId}`);
      }

      let modelMetadata: unknown;
      let scatterplotAttachment: ReturnType<typeof renderAttachment> | undefined;
      if (includeModelMetadata && jobId && configs[0]) {
        const job = configs[0];
        const analysisType = analysisTypeOf(job);
        const denied = await requirePrivilege(deps, request, 'canGetTrainedModels');
        modelMetadata = denied
          ? {
              available: false,
              reason:
                'Missing Machine Learning privilege canGetTrainedModels. Job stats were still returned.',
            }
          : await readModelMetadata(loaded.mlClient, job);
        if (isAvailableMetadata(modelMetadata)) {
          const series = chartSeries(modelMetadata.total_feature_importance);
          if (series) {
            try {
              const attachment = await attachments.add({
                type: DFA_TOTAL_FEATURE_IMPORTANCE_ATTACHMENT_TYPE,
                data: {
                  job_id: jobId,
                  ...(analysisType === 'classification' || analysisType === 'regression'
                    ? { analysis_type: analysisType }
                    : {}),
                  total_feature_importance: series,
                },
                description: `Total feature importance: ${jobId}`,
                readonly: true,
              });
              modelMetadata = {
                ...modelMetadata,
                chart_attachment: renderAttachment(attachment),
              };
            } catch {
              // The numeric totals are still returned when the chart attachment cannot be stored.
            }
          }
        }

        const destIndex = job.dest?.index;
        if (
          destIndex &&
          (analysisType === 'outlier_detection' ||
            analysisType === 'regression' ||
            analysisType === 'classification')
        ) {
          const dependentVariable = dependentVariableOf(job);
          const includes = boundedFields(job.analyzed_fields?.includes);
          const excludes = boundedFields(job.analyzed_fields?.excludes);
          try {
            const attachment = await attachments.add({
              type: DFA_SCATTERPLOT_MATRIX_ATTACHMENT_TYPE,
              data: {
                job_id: jobId,
                analysis_type: analysisType,
                index: destIndex,
                results_field: job.dest?.results_field ?? 'ml',
                ...(dependentVariable ? { dependent_variable: dependentVariable } : {}),
                ...(includes ? { includes } : {}),
                ...(excludes ? { excludes } : {}),
              },
              description: `Scatterplot matrix: ${jobId}`,
              readonly: true,
            });
            scatterplotAttachment = renderAttachment(attachment);
          } catch {
            // Results are still returned when the scatterplot attachment cannot be stored.
          }
        }
      }

      return dataResults({
        count: jobs.length,
        jobs,
        model_metadata: modelMetadata,
        ...(scatterplotAttachment ? { scatterplot_attachment: scatterplotAttachment } : {}),
      });
    } catch (error) {
      return errorResults(formatDfaToolError('read data frame analytics jobs', error));
    }
  },
});
