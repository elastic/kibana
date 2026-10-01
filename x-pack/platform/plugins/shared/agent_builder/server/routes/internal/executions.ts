/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { Observable } from 'rxjs';
import { defer, map, skip, switchMap } from 'rxjs';
import type { ServerSentEvent } from '@kbn/sse-utils';
import { AgentExecutionMode } from '@kbn/agent-builder-common';
import { observableIntoEventSourceStream, cloudProxyBufferSize } from '@kbn/sse-utils-server';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import { internalApiPath } from '../../../common/constants';
import { apiPrivileges } from '../../../common/features';
import { AGENT_SOCKET_TIMEOUT_MS, getSSEResponseHeaders } from '../utils';
import { filterEventsNativeApiEvents, filterLegacyApiEvents } from '../converse_helpers';
import { waitForConversationAccess } from './wait_for_conversation_access';

export function registerInternalExecutionRoutes({
  coreSetup,
  router,
  getInternalServices,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.get(
    {
      path: `${internalApiPath}/executions/_find`,
      security: {
        authz: {
          requiredPrivileges: [apiPrivileges.readAgentBuilder],
        },
      },
      options: { access: 'internal' },
      validate: {
        query: schema.object({
          metadataKey: schema.string({ minLength: 1, maxLength: 512 }),
          metadataValue: schema.string({ minLength: 1, maxLength: 1024 }),
        }),
      },
    },
    wrapHandler(async (context, request, response) => {
      const { execution: executionService } = getInternalServices();
      const { metadataKey, metadataValue } = request.query;

      const executions = await executionService.findExecutions(request, {
        filter: { metadata: { [metadataKey]: metadataValue } },
        size: 1,
      });

      return response.ok({ body: { executionId: executions[0]?.executionId ?? null } });
    })
  );

  router.get(
    {
      path: `${internalApiPath}/executions/{executionId}/follow`,
      security: {
        authz: {
          requiredPrivileges: [apiPrivileges.readAgentBuilder],
        },
      },
      options: { access: 'internal' },
      validate: {
        params: schema.object({
          executionId: schema.string(),
        }),
        query: schema.object({
          since: schema.maybe(schema.number({ min: 0 })),
        }),
      },
    },
    wrapHandler(async (context, request, response) => {
      const { execution: executionService } = getInternalServices();
      const { executionId } = request.params;
      const { since } = request.query;

      const abortController = new AbortController();
      request.events.aborted$.subscribe(() => {
        abortController.abort();
      });

      const events$ = executionService
        .followExecution(executionId, { since })
        .pipe(filterLegacyApiEvents());
      return response.ok({
        headers: getSSEResponseHeaders(),
        body: observableIntoEventSourceStream(events$ as unknown as Observable<ServerSentEvent>, {
          signal: abortController.signal,
          logger,
        }),
      });
    })
  );

  router.get(
    {
      path: `${internalApiPath}/executions/{executionId}/reattach`,
      security: {
        authz: {
          requiredPrivileges: [apiPrivileges.readAgentBuilder],
        },
      },
      options: {
        access: 'internal',
        timeout: {
          idleSocket: AGENT_SOCKET_TIMEOUT_MS,
        },
      },
      validate: {
        params: schema.object({
          executionId: schema.string({ minLength: 1, maxLength: 256 }),
        }),
        query: schema.object({
          offset: schema.number({ min: 0, defaultValue: 0 }),
        }),
      },
    },
    wrapHandler(async (context, request, response) => {
      const [, { cloud }] = await coreSetup.getStartServices();
      const { execution: executionService, conversations: conversationsService } =
        getInternalServices();
      const { executionId } = request.params;
      const { offset } = request.query;

      const spaceId = (await context.agentBuilder).spaces.getSpaceId();
      const execution = await executionService.getExecution(executionId);
      const conversationId =
        execution?.executionMode === AgentExecutionMode.conversation
          ? execution.agentParams.conversationId
          : undefined;
      if (!execution || execution.spaceId !== spaceId || !conversationId) {
        return response.notFound({
          body: { message: `Execution not found: ${executionId}` },
        });
      }

      const conversationClient = await conversationsService.getScopedClient({ request });

      const abortController = new AbortController();
      request.events.aborted$.subscribe(() => {
        abortController.abort();
      });

      // `offset` counts events after the events-native filter, so it is applied after filtering.
      const events$: Observable<ServerSentEvent> = defer(() =>
        waitForConversationAccess({
          conversationClient,
          conversationId,
          executionService,
          executionId,
          signal: abortController.signal,
        })
      ).pipe(
        switchMap(() => executionService.followExecution(executionId)),
        filterEventsNativeApiEvents(),
        skip(offset),
        map((event) => ({ ...event }))
      );
      return response.ok({
        headers: getSSEResponseHeaders(),
        body: observableIntoEventSourceStream(events$, {
          signal: abortController.signal,
          flushThrottleMs: 100,
          flushMinBytes: cloud?.isCloudEnabled ? cloudProxyBufferSize : undefined,
          logger,
        }),
      });
    })
  );

  router.post(
    {
      path: `${internalApiPath}/executions/{executionId}/abort`,
      security: {
        authz: {
          requiredPrivileges: [apiPrivileges.readAgentBuilder],
        },
      },
      options: { access: 'internal' },
      validate: {
        params: schema.object({
          executionId: schema.string(),
        }),
        query: schema.object({
          /**
           * By default the call returns once the interruption is recorded on the conversation, so a
           * client that re-reads the conversation afterwards sees the aborted execution. Pass
           * `false` to return right after the abort is requested.
           */
          wait_for_terminal: schema.boolean({ defaultValue: true }),
        }),
      },
    },
    wrapHandler(async (context, request, response) => {
      const { execution: executionService } = getInternalServices();
      const { executionId } = request.params;
      const { wait_for_terminal: waitForTerminal } = request.query;

      const [coreStart] = await coreSetup.getStartServices();
      const user = coreStart.security.authc.getCurrentUser(request);
      const { acknowledged, terminalPersisted } = await executionService.abortExecution(
        executionId,
        {
          reason: {
            source: 'api',
            ...(user
              ? { actor: { id: user.profile_uid ?? user.username, username: user.username } }
              : {}),
          },
          waitForTerminal,
        }
      );

      return response.ok({ body: { acknowledged, terminal_persisted: terminalPersisted } });
    })
  );
}
