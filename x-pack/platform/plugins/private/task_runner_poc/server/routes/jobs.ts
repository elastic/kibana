/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  API_PRIVILEGES,
  INTERNAL_API_BASE_PATH,
  INTERNAL_API_VERSION,
  RESULT_INDEX,
  TASK_TYPE,
} from '../../common';
import { grantTaskApiKey } from '../api_keys';
import { errorToResponse, getErrorMessage } from '../errors';
import { identityMeta } from '../log_meta';
import type { TaskRunnerLogMeta } from '../log_meta';
import { createJobBodySchema, jobIdParamsSchema, limitQuerySchema } from './schemas';
import type { RouteDependencies } from './types';

const JOB_TIMEOUT = '60s';
const JOB_MAX_EXECUTIONS = 3;
const ONE_SHOT_KEY_LIFETIME_SECONDS = 3600;

/**
 * A scheduled job's key never expires. A one-shot job's key lasts an hour past the time it
 * fires, which covers the task timeout and its retries.
 */
const keyExpiration = (scheduled: boolean, runAtMs: number | undefined, nowMs: number) => {
  if (scheduled) {
    return undefined;
  }
  const delaySeconds = runAtMs === undefined ? 0 : Math.max(0, Math.ceil((runAtMs - nowMs) / 1000));
  return delaySeconds === 0 ? '1h' : `${delaySeconds + ONE_SHOT_KEY_LIFETIME_SECONDS}s`;
};

export const registerJobRoutes = ({
  router,
  logger,
  projectId,
  serviceClient,
  getApiKeys,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: `${INTERNAL_API_BASE_PATH}/jobs`,
      access: 'internal',
      summary: 'Create a one-shot or scheduled ES|QL job on the task runner service',
      security: { authz: { requiredPrivileges: [API_PRIVILEGES.manage] } },
    })
    .addVersion(
      { version: INTERNAL_API_VERSION, validate: { request: { body: createJobBodySchema } } },
      async (_context, request, response) => {
        const { query, everySeconds } = request.body;
        const idempotencyKey = request.body.idempotencyKey ?? `kbn-${uuidv4()}`;
        const scheduled = everySeconds !== undefined;
        const runAtMs =
          request.body.runAt === undefined ? undefined : Date.parse(request.body.runAt);
        const runAt = runAtMs === undefined ? undefined : new Date(runAtMs).toISOString();
        try {
          const apiKey = await grantTaskApiKey(await getApiKeys(), request, {
            name: scheduled ? 'task_runner_poc scheduled job' : 'task_runner_poc one-shot job',
            expiration: keyExpiration(scheduled, runAtMs, Date.now()),
            metadata: { projectId, idempotencyKey },
          });
          const created = await serviceClient.createJob({
            taskType: TASK_TYPE,
            params: { query, resultIndex: RESULT_INDEX },
            apiKey: apiKey.encoded,
            ...(scheduled ? { every: `${everySeconds}s` } : {}),
            ...(runAt ? { runAt } : {}),
            timeout: JOB_TIMEOUT,
            maxExecutions: JOB_MAX_EXECUTIONS,
            idempotencyKey,
          });
          const firesAt = runAt ? `, first firing at ${runAt}` : '';
          logger.info<TaskRunnerLogMeta>(
            scheduled
              ? `Created scheduled job ${created.jobId} (every ${everySeconds}s${firesAt})`
              : `Created one-shot job ${created.jobId}${runAt ? ` (fires at ${runAt})` : ''}`,
            identityMeta(
              { projectId, jobId: created.jobId, taskId: created.taskId },
              { action: 'job-created', outcome: 'success' }
            )
          );
          return response.ok({ body: created });
        } catch (error) {
          logger.warn<TaskRunnerLogMeta>(
            `Failed to create job: ${getErrorMessage(error)}`,
            identityMeta({ projectId }, { action: 'job-created', outcome: 'failure' })
          );
          return errorToResponse(response, error);
        }
      }
    );

  router.versioned
    .get({
      path: `${INTERNAL_API_BASE_PATH}/jobs`,
      access: 'internal',
      summary: "List the project's jobs",
      security: { authz: { requiredPrivileges: [API_PRIVILEGES.read] } },
    })
    .addVersion(
      { version: INTERNAL_API_VERSION, validate: { request: { query: limitQuerySchema } } },
      async (_context, request, response) => {
        try {
          return response.ok({ body: await serviceClient.listJobs(request.query.limit) });
        } catch (error) {
          return errorToResponse(response, error);
        }
      }
    );

  router.versioned
    .get({
      path: `${INTERNAL_API_BASE_PATH}/jobs/{jobId}`,
      access: 'internal',
      summary: 'Get one job with its last task',
      security: { authz: { requiredPrivileges: [API_PRIVILEGES.read] } },
    })
    .addVersion(
      { version: INTERNAL_API_VERSION, validate: { request: { params: jobIdParamsSchema } } },
      async (_context, request, response) => {
        try {
          return response.ok({ body: await serviceClient.getJob(request.params.jobId) });
        } catch (error) {
          return errorToResponse(response, error);
        }
      }
    );

  router.versioned
    .delete({
      path: `${INTERNAL_API_BASE_PATH}/jobs/{jobId}`,
      access: 'internal',
      summary: 'Delete a job so it stops firing',
      security: { authz: { requiredPrivileges: [API_PRIVILEGES.manage] } },
    })
    .addVersion(
      { version: INTERNAL_API_VERSION, validate: { request: { params: jobIdParamsSchema } } },
      async (_context, request, response) => {
        const { jobId } = request.params;
        try {
          await serviceClient.deleteJob(jobId);
          logger.info<TaskRunnerLogMeta>(
            `Deleted job ${jobId}`,
            identityMeta({ projectId, jobId }, { action: 'job-deleted', outcome: 'success' })
          );
          return response.noContent();
        } catch (error) {
          logger.warn<TaskRunnerLogMeta>(
            `Failed to delete job ${jobId}: ${getErrorMessage(error)}`,
            identityMeta({ projectId, jobId }, { action: 'job-deleted', outcome: 'failure' })
          );
          return errorToResponse(response, error);
        }
      }
    );
};
