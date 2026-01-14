/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { TaskStatus } from '@kbn/streams-schema';
import { conflict } from '@hapi/boom';
import { CancellationInProgressError } from '../../../../lib/tasks/cancellation_in_progress_error';
import { isStale } from '../../../../lib/tasks/is_stale';
import {
  DESCRIPTION_GENERATION_TASK_TYPE,
  getDescriptionGenerationTaskId,
  type DescriptionGenerationTaskParams,
  type GenerateDescriptionResult,
} from '../../../../lib/tasks/task_definitions/description_generation';
import { checkAccess } from '../../../../lib/streams/stream_crud';
import { SecurityError } from '../../../../lib/streams/errors/security_error';
import { resolveConnectorId } from '../../../utils/resolve_connector_id';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { createServerRoute } from '../../../create_server_route';
import { AcknowledgingIncompleteError } from '../../../../lib/tasks/acknowledging_incomplete_error';

const dateFromString = z.string().transform((input) => new Date(input));

export type DescriptionGenerationTaskResult =
  | {
      status:
        | TaskStatus.NotStarted
        | TaskStatus.InProgress
        | TaskStatus.Stale
        | TaskStatus.BeingCanceled
        | TaskStatus.Canceled;
    }
  | {
      status: TaskStatus.Failed;
      error: string;
    }
  | ({
      status: TaskStatus.Completed | TaskStatus.Acknowledged;
    } & GenerateDescriptionResult);

export const descriptionGenerationStatusRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/_description_generation/_status',
  options: {
    access: 'internal',
    summary: 'Check the status of a stream description generation task',
    description:
      'Description generation happens as a background task, this endpoint allows the user to check the status of this task. This endpoint combines with POST /internal/streams/{name}/_description_generation/_task which manages the task lifecycle.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<DescriptionGenerationTaskResult> => {
    const { scopedClusterClient, licensing, uiSettingsClient, taskClient } = await getScopedClients(
      {
        request,
      }
    );

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      path: { name },
    } = params;

    const { read } = await checkAccess({ name, scopedClusterClient });

    if (!read) {
      throw new SecurityError(
        `Cannot generate stream description for ${name}, insufficient privileges`
      );
    }

    const task = await taskClient.get<DescriptionGenerationTaskParams, GenerateDescriptionResult>(
      getDescriptionGenerationTaskId(name)
    );

    if (task.status === TaskStatus.InProgress && isStale(task.created_at)) {
      return {
        status: TaskStatus.Stale,
      };
    } else if (task.status === TaskStatus.Failed) {
      return {
        status: TaskStatus.Failed,
        error: task.task.error,
      };
    } else if (task.status === TaskStatus.Completed || task.status === TaskStatus.Acknowledged) {
      return {
        status: task.status,
        ...task.task.payload,
      };
    }

    return {
      status: task.status,
    };
  },
});

export const descriptionGenerationTaskRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/_description_generation/_task',
  options: {
    access: 'internal',
    summary: 'Generate a stream description',
    description:
      'Generate a stream description based on data in the stream using an LLM, this happens as a background task and this endpoint manages the task lifecycle.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
    body: z.discriminatedUnion('action', [
      z.object({
        action: z.literal('schedule'),
        from: dateFromString,
        to: dateFromString,
        connectorId: z
          .string()
          .optional()
          .describe(
            'Optional connector ID. If not provided, the default AI connector from settings will be used.'
          ),
      }),
      z.object({
        action: z.literal('cancel'),
      }),
      z.object({
        action: z.literal('acknowledge'),
      }),
    ]),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<DescriptionGenerationTaskResult> => {
    const { scopedClusterClient, licensing, uiSettingsClient, taskClient } = await getScopedClients(
      {
        request,
      }
    );

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const {
      path: { name },
      body,
    } = params;

    const { read } = await checkAccess({ name, scopedClusterClient });

    if (!read) {
      throw new SecurityError(`Cannot update features for stream ${name}, insufficient privileges`);
    }

    const { action } = body;

    if (action === 'schedule') {
      const { from: start, to: end, connectorId: connectorIdParam } = body;

      const connectorId = await resolveConnectorId({
        connectorId: connectorIdParam,
        uiSettingsClient,
        logger,
      });

      try {
        await taskClient.schedule<DescriptionGenerationTaskParams>({
          task: {
            type: DESCRIPTION_GENERATION_TASK_TYPE,
            id: getDescriptionGenerationTaskId(name),
            space: '*',
            stream: name,
          },
          params: {
            connectorId,
            start: start.getTime(),
            end: end.getTime(),
          },
          request,
        });

        return {
          status: TaskStatus.InProgress,
        };
      } catch (error) {
        if (error instanceof CancellationInProgressError) {
          throw conflict(error.message);
        }

        throw error;
      }
    } else if (action === 'cancel') {
      await taskClient.cancel(getDescriptionGenerationTaskId(name));

      return {
        status: TaskStatus.BeingCanceled,
      };
    }

    try {
      const task = await taskClient.acknowledge<
        DescriptionGenerationTaskParams,
        GenerateDescriptionResult
      >(getDescriptionGenerationTaskId(name));

      return {
        status: TaskStatus.Acknowledged,
        ...task.task.payload,
      };
    } catch (error) {
      if (error instanceof AcknowledgingIncompleteError) {
        throw conflict(error.message);
      }

      throw error;
    }
  },
});

export const internalDescriptionGenerationRoutes = {
  ...descriptionGenerationStatusRoute,
  ...descriptionGenerationTaskRoute,
};
