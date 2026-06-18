/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createErrorResult } from '@kbn/agent-builder-server';
import { AD_GET_JOB_INFO_TOOL_ID } from './tool_ids';

const schema = z.object({
  operation: z.enum([
    'get_jobs',
    'get_datafeed_config',
    'get_job_messages',
    'get_model_snapshots',
    'get_calendar_events',
    'get_available_metadata',
    'validate_permissions',
  ]),
  job_id: z
    .string()
    .optional()
    .describe(
      'Job ID. Required for all operations except get_jobs (optional filter), get_available_metadata, and validate_permissions.'
    ),
});

export const adGetJobInfoTool: BuiltinToolDefinition<typeof schema> = {
  id: AD_GET_JOB_INFO_TOOL_ID,
  type: ToolType.builtin,
  tags: ['ml', 'anomaly-detection'],
  description:
    'Read ML job and datafeed state, config, messages, snapshots, calendar events, and available metadata. Run with operation=validate_permissions first if results look empty.',
  schema,
  handler: async ({ operation, job_id: jobId }, { esClient }) => {
    const ml = esClient.asCurrentUser.ml;

    try {
      switch (operation) {
        case 'get_jobs': {
          const response = await ml.getJobs(jobId ? { job_id: jobId } : {});
          return { results: [{ type: ToolResultType.other, data: response }] };
        }

        case 'get_datafeed_config': {
          if (!jobId) {
            return {
              results: [createErrorResult('job_id is required for get_datafeed_config')],
            };
          }
          const response = await ml.getDatafeeds({ datafeed_id: `datafeed-${jobId}` });
          return { results: [{ type: ToolResultType.other, data: response }] };
        }

        case 'get_job_messages': {
          if (!jobId) {
            return {
              results: [createErrorResult('job_id is required for get_job_messages')],
            };
          }
          const messagesResponse = await esClient.asCurrentUser.search({
            index: '.ml-notifications-*',
            query: { term: { job_id: jobId } },
            sort: [{ timestamp: { order: 'desc' } }],
            size: 50,
          });
          return {
            results: [{ type: ToolResultType.other, data: messagesResponse.hits.hits }],
          };
        }

        case 'get_model_snapshots': {
          if (!jobId) {
            return {
              results: [createErrorResult('job_id is required for get_model_snapshots')],
            };
          }
          const response = await ml.getModelSnapshots({ job_id: jobId });
          return { results: [{ type: ToolResultType.other, data: response }] };
        }

        case 'get_calendar_events': {
          if (!jobId) {
            return {
              results: [createErrorResult('job_id is required for get_calendar_events')],
            };
          }
          const calResponse = await ml.getCalendars({ calendar_id: `calendar-${jobId}` });
          return { results: [{ type: ToolResultType.other, data: calResponse }] };
        }

        case 'get_available_metadata': {
          const response = await esClient.asCurrentUser.esql.query({
            query: `FROM .ml-config
| WHERE job_type == "anomaly_detector"
| STATS job_count = COUNT(*),
        job_ids = VALUES(job_id),
        functions = VALUES(\`analysis_config.detectors.function\`),
        fields = VALUES(\`analysis_config.detectors.field_name\`),
        by_fields = VALUES(\`analysis_config.detectors.by_field_name\`),
        over_fields = VALUES(\`analysis_config.detectors.over_field_name\`),
        partition_fields = VALUES(\`analysis_config.detectors.partition_field_name\`),
        influencers = VALUES(\`analysis_config.influencers\`),
        bucket_spans = VALUES(\`analysis_config.bucket_span\`)`,
          });
          return { results: [{ type: ToolResultType.other, data: response }] };
        }

        case 'validate_permissions': {
          const response = await ml.info();
          const hasPermissions = await esClient.asCurrentUser.indices
            .exists({ index: '.ml-anomalies-*' })
            .catch(() => false);
          return {
            results: [
              {
                type: ToolResultType.other,
                data: { ml_info: response, has_ml_index_access: hasPermissions },
              },
            ],
          };
        }

        default:
          return {
            results: [createErrorResult(`Unknown operation: ${operation}`)],
          };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        results: [createErrorResult(`Error executing ${operation}: ${message}`)],
      };
    }
  },
};
