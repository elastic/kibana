/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { Subject, Observable } from 'rxjs';
import { ServerSentEvent } from '@kbn/sse-utils';
import { observableIntoEventSourceStream } from '@kbn/sse-utils-server';
import type { ChatAgentEvent } from '@kbn/onechat-common';
import type { CallAgentResponse } from '../../common/http_api/agents';
import { apiPrivileges } from '../../common/features';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';

export function registerAgentRoutes({ router, getInternalServices, logger }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.post(
    {
      path: '/internal/onechat/agents/invoke',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      validate: {
        body: schema.object({
          agentId: schema.string({}),
          agentParams: schema.recordOf(schema.string(), schema.any()),
        }),
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { agents } = getInternalServices();
      const { agentId, agentParams } = request.body;
      const agentRegistry = agents.registry.asPublicRegistry();

      const agent = await agentRegistry.get({ agentId, request });
      const agentResult = await agent.execute({
        agentParams: agentParams as any,
      });

      return response.ok<CallAgentResponse>({
        body: agentResult,
      });
    })
  );

  // stream agent events endpoint
  router.post(
    {
      path: '/internal/onechat/agents/stream',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      validate: {
        body: schema.object({
          agentId: schema.string({}),
          agentParams: schema.recordOf(schema.string(), schema.any()),
        }),
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { agents } = getInternalServices();
      const { agentId, agentParams } = request.body;
      const agentRegistry = agents.registry.asPublicRegistry();

      const abortController = new AbortController();
      request.events.aborted$.subscribe(() => {
        abortController.abort();
      });

      const subject$ = new Subject<ChatAgentEvent>();

      const agent = await agentRegistry.get({ agentId, request });
      agent
        .execute({
          agentParams: agentParams as any,
          onEvent: (event) => {
            subject$.next(event);
          },
        })
        .then(
          (result) => {
            // TODO: should we emit an event with the final result?
            subject$.complete();
          },
          (error) => {
            subject$.error(error);
          }
        );

      return response.ok({
        body: observableIntoEventSourceStream(subject$ as unknown as Observable<ServerSentEvent>, {
          signal: abortController.signal,
          logger,
        }),
      });
    })
  );
}
