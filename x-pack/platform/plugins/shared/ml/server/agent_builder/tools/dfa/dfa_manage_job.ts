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
import { DFA_MANAGE_JOB_TOOL_ID } from '../tool_ids';
import { jobIdSchema } from './job_config';
import {
  dataResults,
  errorResults,
  formatDfaToolError,
  jobsFrom,
  requireMlClient,
  type DfaJobRecord,
  type DfaToolDeps,
} from './tool_utils';

const schema = lazySchema(() =>
  z.object({
    operation: z.enum(['start', 'stop', 'update']),
    job_id: jobIdSchema,
    force: z
      .boolean()
      .optional()
      .describe(
        'Stop only. Default false. Set true only after a non-force stop failed or stats stay in started or stopping. Do not set this on the first stop.'
      ),
    description: z.string().max(1000).optional().describe('Update only. Job description.'),
    model_memory_limit: z
      .string()
      .max(20)
      .regex(/^\d+(?:\.\d+)?\s*(?:b|kb|mb|gb|tb)$/i)
      .optional()
      .describe('Update only. For example 50mb. The job must be stopped.'),
    max_num_threads: z.number().int().min(1).max(256).optional().describe('Update only.'),
    allow_lazy_start: z.boolean().optional().describe('Update only.'),
  })
);

const RUNNING = new Set(['starting', 'started', 'stopping']);

async function readStats(mlClient: MlClient, jobId: string): Promise<DfaJobRecord | undefined> {
  const response = await mlClient.getDataFrameAnalyticsStats({ id: jobId });
  return jobsFrom(response)[0];
}

export const createDfaManageJobTool = (
  deps: DfaToolDeps
): BuiltinSkillBoundedTool<typeof schema> => ({
  id: DFA_MANAGE_JOB_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Start, stop, or update a data frame analytics job. Start checks stats first and does not call start when the job is already starting or started. Stop force defaults to false; set it only after a normal stop fails. Update changes description, model_memory_limit, max_num_threads, or allow_lazy_start, and only while the job is stopped or failed. Does not delete the job. Starting a completed outlier job does not analyze new data; create a new job for a rerun.',
  experimental: true,
  schema,
  handler: async (params, { esClient, savedObjectsClient, request }) => {
    const capability =
      params.operation === 'update'
        ? 'canCreateDataFrameAnalytics'
        : 'canStartStopDataFrameAnalytics';
    const loaded = await requireMlClient(deps, request, esClient, savedObjectsClient, capability);
    if ('error' in loaded) {
      return loaded.error;
    }

    let stats: DfaJobRecord | undefined;
    try {
      stats = await readStats(loaded.mlClient, params.job_id);
    } catch (error) {
      return errorResults(formatDfaToolError(`read stats for ${params.job_id}`, error));
    }
    if (!stats) {
      return errorResults(`Job not found: ${params.job_id}`);
    }
    const state = stats.state ?? 'unknown';

    try {
      if (params.operation === 'start') {
        if (state === 'starting' || state === 'started') {
          return dataResults({
            started: false,
            reason: 'already_running',
            state,
            progress: stats.progress,
          });
        }
        if (state === 'stopping') {
          return errorResults(
            `Job ${params.job_id} is stopping. Wait until it is stopped before starting it again.`
          );
        }
        const response = await loaded.mlClient.startDataFrameAnalytics({ id: params.job_id });
        return dataResults({ started: true, previous_state: state, response });
      }

      if (params.operation === 'stop') {
        const force = params.force === true;
        if ((state === 'stopped' || state === 'failed') && !force) {
          return dataResults({ stopped: false, reason: 'already_stopped', state });
        }
        const response = await loaded.mlClient.stopDataFrameAnalytics({ id: params.job_id, force });
        return dataResults({ stopped: true, force, previous_state: state, response });
      }

      if (RUNNING.has(state)) {
        return errorResults(`Stop the job before updating it. Current state: ${state}.`);
      }
      const update: Record<string, unknown> = {};
      if (params.description !== undefined) {
        update.description = params.description;
      }
      if (params.model_memory_limit !== undefined) {
        update.model_memory_limit = params.model_memory_limit.replace(/\s+/g, '');
      }
      if (params.max_num_threads !== undefined) {
        update.max_num_threads = params.max_num_threads;
      }
      if (params.allow_lazy_start !== undefined) {
        update.allow_lazy_start = params.allow_lazy_start;
      }
      if (Object.keys(update).length === 0) {
        return errorResults(
          'Update requires description, model_memory_limit, max_num_threads, or allow_lazy_start.'
        );
      }
      const response = await loaded.mlClient.updateDataFrameAnalytics({
        id: params.job_id,
        ...update,
      } as Parameters<MlClient['updateDataFrameAnalytics']>[0]);
      return dataResults({ updated: true, state, update, response });
    } catch (error) {
      return errorResults(
        formatDfaToolError(`${params.operation} data frame analytics job ${params.job_id}`, error)
      );
    }
  },
});
