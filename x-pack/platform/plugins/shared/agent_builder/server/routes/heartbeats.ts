/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { publicApiPath } from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type {
  ListHeartbeatsResponse,
  GetHeartbeatResponse,
  CreateHeartbeatResponse,
  UpdateHeartbeatResponse,
  DeleteHeartbeatResponse,
  PauseHeartbeatResponse,
  ResumeHeartbeatResponse,
} from '../../common/http_api/heartbeats';

const HEARTBEAT_INTERVAL_UNIT_SCHEMA = schema.oneOf([
  schema.literal('minutes'),
  schema.literal('hours'),
  schema.literal('days'),
]);

const agentId = schema.string({
  meta: { description: 'The ID of the agent that owns the heartbeat.' },
});

const heartbeatId = schema.string({
  meta: { description: 'The unique ID of the heartbeat.' },
});

export const registerHeartbeatRoutes = ({
  router,
  getInternalServices,
  logger,
}: RouteDependencies) => {
  const wrapHandler = getHandlerWrapper({ logger });

  // ── List heartbeats for an agent ──────────────────────────────────────────

  router.versioned
    .get({
      path: `${publicApiPath}/agents/{agent_id}/heartbeats`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'internal',
      summary: 'List heartbeats for an agent',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: schema.object({ agent_id: agentId }),
          },
        },
      },
      wrapHandler(async (_ctx, request, response) => {
        const { heartbeats } = getInternalServices();
        const client = heartbeats.getScopedClient({ request });
        const results = await client.list(request.params.agent_id);
        return response.ok<ListHeartbeatsResponse>({ body: { results } });
      })
    );

  // ── Get a single heartbeat ────────────────────────────────────────────────

  router.versioned
    .get({
      path: `${publicApiPath}/agents/{agent_id}/heartbeats/{heartbeat_id}`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'internal',
      summary: 'Get a heartbeat',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: schema.object({ agent_id: agentId, heartbeat_id: heartbeatId }),
          },
        },
      },
      wrapHandler(async (_ctx, request, response) => {
        const { heartbeats } = getInternalServices();
        const client = heartbeats.getScopedClient({ request });
        const heartbeat = await client.get(request.params.heartbeat_id);
        return response.ok<GetHeartbeatResponse>({ body: heartbeat });
      })
    );

  // ── Create a heartbeat ────────────────────────────────────────────────────

  router.versioned
    .post({
      path: `${publicApiPath}/agents/{agent_id}/heartbeats`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.writeAgentBuilder] },
      },
      access: 'internal',
      summary: 'Create a heartbeat',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: schema.object({ agent_id: agentId }),
            body: schema.object({
              name: schema.string({
                meta: { description: 'Human-readable label for this heartbeat.' },
              }),
              prompt: schema.string({
                meta: { description: 'The prompt sent to the agent on each beat.' },
              }),
              interval_value: schema.number({
                min: 1,
                meta: { description: 'Number of interval units between beats (e.g. 15).' },
              }),
              interval_unit: HEARTBEAT_INTERVAL_UNIT_SCHEMA,
              start_time: schema.maybe(
                schema.string({
                  meta: {
                    description:
                      'ISO8601 timestamp of when the first beat should fire. Omit to start immediately.',
                  },
                })
              ),
            }),
          },
        },
      },
      wrapHandler(async (_ctx, request, response) => {
        const { heartbeats } = getInternalServices();
        const client = heartbeats.getScopedClient({ request });
        const heartbeat = await client.create(request.params.agent_id, request.body);
        return response.ok<CreateHeartbeatResponse>({ body: heartbeat });
      })
    );

  // ── Update a heartbeat ────────────────────────────────────────────────────

  router.versioned
    .put({
      path: `${publicApiPath}/agents/{agent_id}/heartbeats/{heartbeat_id}`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.writeAgentBuilder] },
      },
      access: 'internal',
      summary: 'Update a heartbeat',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: schema.object({ agent_id: agentId, heartbeat_id: heartbeatId }),
            body: schema.object({
              name: schema.maybe(schema.string()),
              prompt: schema.maybe(schema.string()),
              interval_value: schema.maybe(schema.number({ min: 1 })),
              interval_unit: schema.maybe(HEARTBEAT_INTERVAL_UNIT_SCHEMA),
              start_time: schema.maybe(schema.string()),
            }),
          },
        },
      },
      wrapHandler(async (_ctx, request, response) => {
        const { heartbeats } = getInternalServices();
        const client = heartbeats.getScopedClient({ request });
        const heartbeat = await client.update(request.params.heartbeat_id, request.body);
        return response.ok<UpdateHeartbeatResponse>({ body: heartbeat });
      })
    );

  // ── Delete a heartbeat ────────────────────────────────────────────────────

  router.versioned
    .delete({
      path: `${publicApiPath}/agents/{agent_id}/heartbeats/{heartbeat_id}`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.writeAgentBuilder] },
      },
      access: 'internal',
      summary: 'Delete a heartbeat',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: schema.object({ agent_id: agentId, heartbeat_id: heartbeatId }),
          },
        },
      },
      wrapHandler(async (_ctx, request, response) => {
        const { heartbeats } = getInternalServices();
        const client = heartbeats.getScopedClient({ request });
        const success = await client.delete(request.params.heartbeat_id);
        return response.ok<DeleteHeartbeatResponse>({ body: { success } });
      })
    );

  // ── Pause a heartbeat ─────────────────────────────────────────────────────

  router.versioned
    .post({
      path: `${publicApiPath}/agents/{agent_id}/heartbeats/{heartbeat_id}/pause`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.writeAgentBuilder] },
      },
      access: 'internal',
      summary: 'Pause a heartbeat',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: schema.object({ agent_id: agentId, heartbeat_id: heartbeatId }),
          },
        },
      },
      wrapHandler(async (_ctx, request, response) => {
        const { heartbeats } = getInternalServices();
        const client = heartbeats.getScopedClient({ request });
        const heartbeat = await client.pause(request.params.heartbeat_id);
        return response.ok<PauseHeartbeatResponse>({ body: heartbeat });
      })
    );

  // ── Resume a heartbeat ────────────────────────────────────────────────────

  router.versioned
    .post({
      path: `${publicApiPath}/agents/{agent_id}/heartbeats/{heartbeat_id}/resume`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.writeAgentBuilder] },
      },
      access: 'internal',
      summary: 'Resume a heartbeat',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: schema.object({ agent_id: agentId, heartbeat_id: heartbeatId }),
          },
        },
      },
      wrapHandler(async (_ctx, request, response) => {
        const { heartbeats } = getInternalServices();
        const client = heartbeats.getScopedClient({ request });
        const heartbeat = await client.resume(request.params.heartbeat_id);
        return response.ok<ResumeHeartbeatResponse>({ body: heartbeat });
      })
    );
};
