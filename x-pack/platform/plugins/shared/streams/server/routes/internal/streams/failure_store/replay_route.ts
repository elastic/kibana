/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { forbidden } from '@hapi/boom';
import { FAILURE_STORE_SELECTOR, STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';

/**
 * Schema for the replay task status response
 */
const replayStatusResponseSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('not_started'),
  }),
  z.object({
    status: z.literal('in_progress'),
    taskId: z.string(),
    total: z.number().optional(),
    created: z.number().optional(),
    updated: z.number().optional(),
    deleted: z.number().optional(),
    batches: z.number().optional(),
    versionConflicts: z.number().optional(),
    noops: z.number().optional(),
    retries: z
      .object({
        bulk: z.number(),
        search: z.number(),
      })
      .optional(),
    requestsPerSecond: z.number().optional(),
    throttledMillis: z.number().optional(),
    throttledUntilMillis: z.number().optional(),
  }),
  z.object({
    status: z.literal('completed'),
    taskId: z.string(),
    total: z.number(),
    created: z.number(),
    updated: z.number(),
    deleted: z.number(),
    batches: z.number(),
    versionConflicts: z.number(),
    noops: z.number(),
    retries: z.object({
      bulk: z.number(),
      search: z.number(),
    }),
    took: z.number(),
    failures: z.array(z.any()).optional(),
  }),
  z.object({
    status: z.literal('failed'),
    taskId: z.string().optional(),
    error: z.string(),
    failures: z.array(z.any()).optional(),
  }),
  z.object({
    status: z.literal('canceled'),
    taskId: z.string(),
  }),
]);

export type ReplayStatusResponse = z.infer<typeof replayStatusResponseSchema>;

/**
 * Start a replay operation that reindexes ingest-pipeline failures from the failure store
 * back into the main data stream.
 *
 * This will:
 * 1. Read documents from the failure store where error.pipeline exists (ingest failures only)
 * 2. Use a script to extract the original document from the failure store wrapper
 * 3. Index the extracted documents back into the main stream
 */
export const startFailureStoreReplayRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/failure_store/replay',
  options: {
    access: 'internal',
    summary: 'Start failure store replay',
    description:
      'Starts a background reindex task to replay ingest pipeline failures from the failure store back into the main data stream',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
  }),
  handler: async ({ params, request, getScopedClients }) => {
    const { scopedClusterClient, streamsClient } = await getScopedClients({
      request,
    });

    const { name } = params.path;
    const failureStoreIndex = `${name}${FAILURE_STORE_SELECTOR}`;

    // Check privileges
    const privileges = await streamsClient.getPrivileges(name);
    if (!privileges.manage_failure_store) {
      throw forbidden('Missing manage_failure_store privilege');
    }

    // Check for existing running replay task
    try {
      const existingTasks = await scopedClusterClient.asCurrentUser.tasks.list({
        actions: ['*reindex*'],
        detailed: true,
      });

      // Check if there's already a running replay task for this stream
      if (existingTasks.nodes) {
        for (const node of Object.values(existingTasks.nodes)) {
          if (node.tasks) {
            for (const task of Object.values(node.tasks)) {
              if (
                task.description?.includes(failureStoreIndex) &&
                task.description?.includes(name) &&
                !task.description?.includes(FAILURE_STORE_SELECTOR)
              ) {
                // Found an existing task
                const existingTaskId = `${task.node}:${task.id}`;
                return {
                  status: 'in_progress' as const,
                  taskId: existingTaskId,
                  total: (task.status as { total?: number })?.total,
                  created: (task.status as { created?: number })?.created,
                  updated: (task.status as { updated?: number })?.updated,
                  deleted: (task.status as { deleted?: number })?.deleted,
                  batches: (task.status as { batches?: number })?.batches,
                  versionConflicts: (task.status as { version_conflicts?: number })
                    ?.version_conflicts,
                  noops: (task.status as { noops?: number })?.noops,
                };
              }
            }
          }
        }
      }
    } catch {
      // Continue even if task listing fails
    }

    // Start the reindex operation as a background task
    // The script extracts the original document from the failure store wrapper format
    const reindexResponse = await scopedClusterClient.asCurrentUser.reindex({
        wait_for_completion: false,
        refresh: true,
        source: {
          index: failureStoreIndex,
          query: {
            bool: {
              must: [
                // Only replay ingest pipeline failures
                { exists: { field: 'error.pipeline' } },
                // Defensive: ensure document was originally destined for this stream
                { term: { 'document.index': name } },
              ],
            },
          },
        },
        dest: {
          index: name,
          op_type: 'create',
        },
        // Script to extract the original document from the failure store wrapper
        // Failure store documents have the structure: { document: { source: {...original...}, ... }, error: {...} }
        script: {
          source: `
            if (ctx._source.containsKey('document') && ctx._source.document.containsKey('source')) {
              def originalDoc = ctx._source.document.source;
              ctx._source.clear();
              for (entry in originalDoc.entrySet()) {
                ctx._source[entry.getKey()] = entry.getValue();
              }
            }
          `,
          lang: 'painless',
        },
        // Use automatic slicing for better performance
        slices: 'auto',
      });

    const taskId = String(reindexResponse.task);

    return {
      status: 'in_progress' as const,
      taskId,
    };
  },
});

/**
 * Get the status of a failure store replay operation
 */
export const getFailureStoreReplayStatusRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/failure_store/replay',
  options: {
    access: 'internal',
    summary: 'Get failure store replay status',
    description: 'Gets the status of a failure store replay operation for a stream',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
    query: z
      .object({
        taskId: z.string().optional(),
      })
      .optional(),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<ReplayStatusResponse> => {
    const { scopedClusterClient, streamsClient } = await getScopedClients({
      request,
    });

    const { name } = params.path;
    const taskId = params.query?.taskId;
    const failureStoreIndex = `${name}${FAILURE_STORE_SELECTOR}`;

    // Check privileges
    const privileges = await streamsClient.getPrivileges(name);
    if (!privileges.manage_failure_store) {
      throw forbidden('Missing manage_failure_store privilege');
    }

    // If no taskId provided, try to find an active replay task
    if (!taskId) {
      try {
        const existingTasks = await scopedClusterClient.asCurrentUser.tasks.list({
          actions: ['*reindex*'],
          detailed: true,
        });

        if (existingTasks.nodes) {
          for (const node of Object.values(existingTasks.nodes)) {
            if (node.tasks) {
              for (const [, task] of Object.entries(node.tasks)) {
                if (
                  task.description?.includes(failureStoreIndex) &&
                  task.description?.includes(`[${name}]`)
                ) {
                  const foundTaskId = `${task.node}:${task.id}`;
                  const status = task.status as {
                    total?: number;
                    created?: number;
                    updated?: number;
                    deleted?: number;
                    batches?: number;
                    version_conflicts?: number;
                    noops?: number;
                    retries?: { bulk: number; search: number };
                    requests_per_second?: number;
                    throttled_millis?: number;
                    throttled_until_millis?: number;
                  };

                  return {
                    status: 'in_progress',
                    taskId: foundTaskId,
                    total: status?.total,
                    created: status?.created,
                    updated: status?.updated,
                    deleted: status?.deleted,
                    batches: status?.batches,
                    versionConflicts: status?.version_conflicts,
                    noops: status?.noops,
                    retries: status?.retries,
                    requestsPerSecond: status?.requests_per_second,
                    throttledMillis: status?.throttled_millis,
                    throttledUntilMillis: status?.throttled_until_millis,
                  };
                }
              }
            }
          }
        }
      } catch {
        // Continue to return not_started
      }

      return { status: 'not_started' };
    }

    // Get specific task status
    try {
      const taskResponse = await scopedClusterClient.asCurrentUser.tasks.get({
        task_id: taskId,
        wait_for_completion: false,
      });

      if (!taskResponse.completed) {
        const status = taskResponse.task.status as {
          total?: number;
          created?: number;
          updated?: number;
          deleted?: number;
          batches?: number;
          version_conflicts?: number;
          noops?: number;
          retries?: { bulk: number; search: number };
          requests_per_second?: number;
          throttled_millis?: number;
          throttled_until_millis?: number;
          canceled?: string;
        };

        // Check if task was canceled
        if (status?.canceled) {
          return {
            status: 'canceled',
            taskId,
          };
        }

        return {
          status: 'in_progress',
          taskId,
          total: status?.total,
          created: status?.created,
          updated: status?.updated,
          deleted: status?.deleted,
          batches: status?.batches,
          versionConflicts: status?.version_conflicts,
          noops: status?.noops,
          retries: status?.retries,
          requestsPerSecond: status?.requests_per_second,
          throttledMillis: status?.throttled_millis,
          throttledUntilMillis: status?.throttled_until_millis,
        };
      }

      // Task completed
      const response = taskResponse.response as {
        total?: number;
        created?: number;
        updated?: number;
        deleted?: number;
        batches?: number;
        version_conflicts?: number;
        noops?: number;
        retries?: { bulk: number; search: number };
        took?: number;
        failures?: Array<{ cause?: { type?: string; reason?: string } }>;
      };

      // Check for failures
      if (response?.failures && response.failures.length > 0) {
        return {
          status: 'failed',
          taskId,
          error: `Reindex completed with ${response.failures.length} failure(s)`,
          failures: response.failures,
        };
      }

      // Clean up the completed task from .tasks index (best effort)
      try {
        await scopedClusterClient.asCurrentUser.delete({
          index: '.tasks',
          id: taskId,
        });
      } catch {
        // Ignore cleanup errors
      }

      return {
        status: 'completed',
        taskId,
        total: response?.total ?? 0,
        created: response?.created ?? 0,
        updated: response?.updated ?? 0,
        deleted: response?.deleted ?? 0,
        batches: response?.batches ?? 0,
        versionConflicts: response?.version_conflicts ?? 0,
        noops: response?.noops ?? 0,
        retries: response?.retries ?? { bulk: 0, search: 0 },
        took: response?.took ?? 0,
        failures: response?.failures,
      };
    } catch (error: unknown) {
      // Task not found - either never existed or was already cleaned up
      const isNotFound =
        error instanceof Error &&
        (error.message?.includes('404') || error.message?.includes('not found'));
      if (isNotFound) {
        return { status: 'not_started' };
      }

      return {
        status: 'failed',
        taskId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

/**
 * Cancel a running failure store replay operation
 */
export const cancelFailureStoreReplayRoute = createServerRoute({
  endpoint: 'DELETE /internal/streams/{name}/failure_store/replay',
  options: {
    access: 'internal',
    summary: 'Cancel failure store replay',
    description: 'Cancels a running failure store replay operation for a stream',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
    query: z.object({
      taskId: z.string(),
    }),
  }),
  handler: async ({ params, request, getScopedClients }) => {
    const { scopedClusterClient, streamsClient } = await getScopedClients({
      request,
    });

    const { name } = params.path;
    const { taskId } = params.query;

    // Check privileges
    const privileges = await streamsClient.getPrivileges(name);
    if (!privileges.manage_failure_store) {
      throw forbidden('Missing manage_failure_store privilege');
    }

    try {
      await scopedClusterClient.asCurrentUser.tasks.cancel({
        task_id: taskId,
      });

      return {
        status: 'canceled' as const,
        taskId,
      };
    } catch (error: unknown) {
      return {
        status: 'failed' as const,
        taskId,
        error: error instanceof Error ? error.message : 'Failed to cancel task',
      };
    }
  },
});

export const failureStoreReplayRoutes = {
  ...startFailureStoreReplayRoute,
  ...getFailureStoreReplayStatusRoute,
  ...cancelFailureStoreReplayRoute,
};
