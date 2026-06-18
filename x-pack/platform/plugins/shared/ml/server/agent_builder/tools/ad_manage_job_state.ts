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
import { AD_MANAGE_JOB_STATE_TOOL_ID } from './tool_ids';

const schema = z.object({
  operation: z.enum([
    'open_job',
    'close_job',
    'start_datafeed',
    'stop_datafeed',
    'revert_model_snapshot',
    'preview_datafeed',
  ]),
  job_id: z.string().describe('The anomaly detection job ID.'),
  snapshot_id: z
    .string()
    .optional()
    .describe('Model snapshot ID. Required for revert_model_snapshot.'),
  start: z
    .string()
    .optional()
    .describe('Start time for start_datafeed (ISO 8601). Omit for real-time datafeed.'),
  end: z
    .string()
    .optional()
    .describe('End time for start_datafeed (ISO 8601). Omit for open-ended.'),
});

export const adManageJobStateTool: BuiltinToolDefinition<typeof schema> = {
  id: AD_MANAGE_JOB_STATE_TOOL_ID,
  type: ToolType.builtin,
  tags: ['ml', 'anomaly-detection'],
  description:
    'Change ML job and datafeed state: open/close job, start/stop datafeed, revert to a model snapshot, or preview a datafeed.',
  schema,
  handler: async (
    { operation, job_id: jobId, snapshot_id: snapshotId, start, end },
    { esClient }
  ) => {
    const ml = esClient.asCurrentUser.ml;
    const datafeedId = `datafeed-${jobId}`;

    try {
      switch (operation) {
        case 'open_job': {
          const response = await ml.openJob({ job_id: jobId });
          return { results: [{ type: ToolResultType.other, data: response }] };
        }

        case 'close_job': {
          const response = await ml.closeJob({ job_id: jobId });
          return { results: [{ type: ToolResultType.other, data: response }] };
        }

        case 'start_datafeed': {
          const body: Record<string, unknown> = {};
          if (start) body.start = start;
          if (end) body.end = end;
          const response = await ml.startDatafeed({ datafeed_id: datafeedId, body: body as any });
          return { results: [{ type: ToolResultType.other, data: response }] };
        }

        case 'stop_datafeed': {
          const response = await ml.stopDatafeed({ datafeed_id: datafeedId });
          return { results: [{ type: ToolResultType.other, data: response }] };
        }

        case 'revert_model_snapshot': {
          if (!snapshotId) {
            return {
              results: [createErrorResult('snapshot_id is required for revert_model_snapshot')],
            };
          }
          const response = await ml.revertModelSnapshot({
            job_id: jobId,
            snapshot_id: snapshotId,
          });
          return { results: [{ type: ToolResultType.other, data: response }] };
        }

        case 'preview_datafeed': {
          const response = await ml.previewDatafeed({ datafeed_id: datafeedId });
          return { results: [{ type: ToolResultType.other, data: response }] };
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
