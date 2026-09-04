/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { createErrorResult } from '@kbn/agent-builder-server';
import type { ResolveMlCapabilities } from '@kbn/ml-common-types/capabilities';
import type { MlLicense } from '../../../common/license';
import type { MlFeatures } from '../../../common/constants/app';
import type { MlAuthorizationService } from '../../lib/capabilities/check_capabilities';
import { hasMlCapabilitiesProvider } from '../../lib/capabilities/check_capabilities';
import type { BuildMlClientFn } from '../ml_client_factory';
import { AD_MANAGE_JOB_STATE_TOOL_ID } from './tool_ids';

/** Groups that mark a scratch job created by the agent builder. */
const SCRATCH_GROUP = 'ml-agent-scratch';

const schema = z.object({
  operation: z.enum([
    'open_job',
    'close_job',
    'start_datafeed',
    'stop_datafeed',
    'revert_model_snapshot',
    'preview_datafeed',
    'delete_job',
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
  allow_non_scratch: z
    .boolean()
    .optional()
    .describe(
      'For delete_job: allow deleting a job not in the ml-agent-scratch group. Default false.'
    ),
  delete_user_annotations: z
    .boolean()
    .optional()
    .describe('For delete_job: also delete user annotations. Default true.'),
});

export const createAdManageJobStateTool = (
  resolveMlCapabilities: ResolveMlCapabilities,
  authorization?: MlAuthorizationService,
  mlLicense?: MlLicense,
  enabledFeatures?: MlFeatures,
  buildMlClient?: BuildMlClientFn
): BuiltinSkillBoundedTool<typeof schema> => ({
  id: AD_MANAGE_JOB_STATE_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Change ML job and datafeed state: open/close job, start/stop datafeed, revert to a model snapshot, preview a datafeed, delete a scratch job, or block until a batch datafeed run completes.',
  experimental: true,
  schema,
  handler: async (
    {
      operation,
      job_id: jobId,
      snapshot_id: snapshotId,
      start,
      end,
      allow_non_scratch: allowNonScratch,
      delete_user_annotations: deleteUserAnnotations = true,
    },
    { esClient, savedObjectsClient, request, events }
  ) => {
    const hasMlCapabilities = hasMlCapabilitiesProvider(
      resolveMlCapabilities,
      request,
      authorization,
      mlLicense,
      enabledFeatures
    );
    const ml = esClient.asCurrentUser.ml;
    const datafeedId = `datafeed-${jobId}`;
    const mlClient = buildMlClient?.(esClient, savedObjectsClient, request);

    try {
      switch (operation) {
        case 'open_job': {
          await hasMlCapabilities(['canOpenJob']);
          if (mlClient) {
            const response = await mlClient.openJob({ job_id: jobId });
            return { results: [{ type: ToolResultType.other, data: response }] };
          }
          const response = await ml.openJob({ job_id: jobId });
          return { results: [{ type: ToolResultType.other, data: response }] };
        }

        case 'close_job': {
          await hasMlCapabilities(['canCloseJob']);
          if (mlClient) {
            const response = await mlClient.closeJob({ job_id: jobId });
            return { results: [{ type: ToolResultType.other, data: response }] };
          }
          const response = await ml.closeJob({ job_id: jobId });
          return { results: [{ type: ToolResultType.other, data: response }] };
        }

        case 'start_datafeed': {
          await hasMlCapabilities(['canStartStopDatafeed']);
          const body: Record<string, unknown> = {};
          if (start) body.start = start;
          if (end) body.end = end;
          if (mlClient) {
            const response = await mlClient.startDatafeed({
              datafeed_id: datafeedId,
              body: body as any,
            });
            return { results: [{ type: ToolResultType.other, data: response }] };
          }
          const response = await ml.startDatafeed({ datafeed_id: datafeedId, body: body as any });
          return { results: [{ type: ToolResultType.other, data: response }] };
        }

        case 'stop_datafeed': {
          await hasMlCapabilities(['canStartStopDatafeed']);
          if (mlClient) {
            const response = await mlClient.stopDatafeed({ datafeed_id: datafeedId });
            return { results: [{ type: ToolResultType.other, data: response }] };
          }
          const response = await ml.stopDatafeed({ datafeed_id: datafeedId });
          return { results: [{ type: ToolResultType.other, data: response }] };
        }

        case 'revert_model_snapshot': {
          await hasMlCapabilities(['canUpdateJob']);
          if (!snapshotId) {
            return {
              results: [createErrorResult('snapshot_id is required for revert_model_snapshot')],
            };
          }
          if (mlClient) {
            const response = await mlClient.revertModelSnapshot({
              job_id: jobId,
              snapshot_id: snapshotId,
            });
            return { results: [{ type: ToolResultType.other, data: response }] };
          }
          const response = await ml.revertModelSnapshot({
            job_id: jobId,
            snapshot_id: snapshotId,
          });
          return { results: [{ type: ToolResultType.other, data: response }] };
        }

        case 'preview_datafeed': {
          await hasMlCapabilities(['canPreviewDatafeed']);
          const response = await ml.previewDatafeed({ datafeed_id: datafeedId });
          return { results: [{ type: ToolResultType.other, data: response }] };
        }

        case 'delete_job': {
          await hasMlCapabilities(['canDeleteJob']);

          // Use mlClient when available so that saved-object lifecycle hooks run,
          // keeping the ML UI in sync after deletion.
          const deleteClient = mlClient ?? ml;

          // "Scratch" jobs are temporary batch jobs created for the user to initially preview/confirm configurations with historical data
          // before creating a permanent job, real time job
          // So in specific operations, we only want agent to only be able to delete these temporary "scratch" jobs
          if (!allowNonScratch) {
            const jobInfo = await deleteClient.getJobs({ job_id: jobId });
            const job = jobInfo.jobs?.[0];
            const groups: string[] = Array.isArray(job?.groups) ? job.groups : [];
            if (!groups.includes(SCRATCH_GROUP)) {
              return {
                results: [
                  createErrorResult(
                    `Job "${jobId}" is not in the "${SCRATCH_GROUP}" group. Only scratch jobs may be deleted. Pass allow_non_scratch: true to override.`
                  ),
                ],
              };
            }
          }

          // Stop datafeed (ignore 404 — may already be stopped or never created)
          try {
            await deleteClient.stopDatafeed({
              datafeed_id: datafeedId,
              body: { force: true } as any,
            });
          } catch {
            // datafeed not running or does not exist — proceed
          }

          // Delete datafeed (ignore 404)
          try {
            await deleteClient.deleteDatafeed({ datafeed_id: datafeedId });
          } catch {
            // datafeed does not exist — proceed
          }

          const response = await deleteClient.deleteJob({
            job_id: jobId,
            delete_user_annotations: deleteUserAnnotations,
          });
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
});
