/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import { apiPrivileges } from '../../../common/features';
import { internalApiPath } from '../../../common/constants';

export function registerInternalSessionRoutes({
  router,
  getInternalServices,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // ---------------------------------------------------------------------------
  // POST /internal/agent_builder/sessions — create a standing session
  // ---------------------------------------------------------------------------
  router.post(
    {
      path: `${internalApiPath}/sessions`,
      validate: {
        body: schema.object({
          agent_id: schema.string(),
          name: schema.string(),
          system_prompt_override: schema.maybe(schema.string()),
          ttl_seconds: schema.maybe(schema.number()),
          connector_id: schema.maybe(schema.string()),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.writeAgentBuilder] },
      },
    },
    wrapHandler(async (_ctx, request, response) => {
      const { sessions } = getInternalServices();
      const client = sessions.getScopedClient({ request });

      const session = await client.create({
        agent_id: request.body.agent_id,
        name: request.body.name,
        system_prompt_override: request.body.system_prompt_override,
        ttl_seconds: request.body.ttl_seconds,
        connector_id: request.body.connector_id,
      });

      return response.ok({ body: session });
    })
  );

  // ---------------------------------------------------------------------------
  // GET /internal/agent_builder/sessions — list standing sessions
  // ---------------------------------------------------------------------------
  router.get(
    {
      path: `${internalApiPath}/sessions`,
      validate: {
        query: schema.object({
          agent_id: schema.maybe(schema.string()),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
    },
    wrapHandler(async (_ctx, request, response) => {
      const { sessions } = getInternalServices();
      const client = sessions.getScopedClient({ request });

      const list = await client.list({
        agent_id: request.query.agent_id,
      });

      return response.ok({ body: { sessions: list } });
    })
  );

  // ---------------------------------------------------------------------------
  // GET /internal/agent_builder/sessions/{id} — get a single session
  // ---------------------------------------------------------------------------
  router.get(
    {
      path: `${internalApiPath}/sessions/{id}`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
    },
    wrapHandler(async (_ctx, request, response) => {
      const { sessions } = getInternalServices();
      const client = sessions.getScopedClient({ request });

      const session = await client.get(request.params.id);
      return response.ok({ body: session });
    })
  );

  // ---------------------------------------------------------------------------
  // DELETE /internal/agent_builder/sessions/{id} — terminate a session
  // ---------------------------------------------------------------------------
  router.delete(
    {
      path: `${internalApiPath}/sessions/{id}`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.writeAgentBuilder] },
      },
    },
    wrapHandler(async (_ctx, request, response) => {
      const { sessions } = getInternalServices();
      const client = sessions.getScopedClient({ request });

      await client.terminate(request.params.id);
      return response.ok({ body: { terminated: true } });
    })
  );

  // ---------------------------------------------------------------------------
  // POST /internal/agent_builder/sessions/{id}/messages — inject a message
  // ---------------------------------------------------------------------------
  router.post(
    {
      path: `${internalApiPath}/sessions/{id}/messages`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({
          message: schema.string(),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.writeAgentBuilder] },
      },
    },
    wrapHandler(async (_ctx, request, response) => {
      const { sessions } = getInternalServices();
      const client = sessions.getScopedClient({ request });

      // Resolve the session's agent_id for attribution before injecting.
      const session = await client.get(request.params.id);
      const result = await client.enqueueTrigger(request.params.id, {
        type: 'session_message',
        subscription_id: undefined,
        event: {
          from_session_id: request.params.id,
          from_agent_id: session.agent_id,
          message: request.body.message,
          message_id: uuidv4(),
        },
      });

      return response.ok({ body: result });
    })
  );
}
