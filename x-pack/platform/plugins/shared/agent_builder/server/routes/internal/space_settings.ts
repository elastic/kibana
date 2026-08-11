/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { AgentAccessControlMode, createBadRequestError } from '@kbn/agent-builder-common';
import type {
  SpaceSettingsResponse,
  UpdateSpaceSettingsRequestBody,
} from '../../../common/http_api/space_settings';
import { internalApiPath } from '../../../common/constants';
import { AGENT_BUILDER_READ_SECURITY, AGENTS_WRITE_SECURITY } from '../route_security';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';

/**
 * Internal routes for reading and updating the per-space Agent Builder
 * settings singleton (currently just the space's assigned default agent).
 *
 * Read is gated by the base Agent Builder read privilege so restricted users
 * can discover which agent they will be routed to; write is gated by the
 * `manageAgents` privilege (same as agent CRUD) since assigning an agent to a
 * space is an administrative action.
 */
export function registerSpaceSettingsRoutes({
  router,
  logger,
  getInternalServices,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // GET current settings for the request's space.
  router.get(
    {
      path: `${internalApiPath}/space_settings`,
      security: AGENT_BUILDER_READ_SECURITY,
      validate: false,
      options: { access: 'internal' },
    },
    wrapHandler(async (ctx, request, response) => {
      const { spaceSettings } = getInternalServices();
      // Return the raw stored assignment. Whether the assigned agent is still
      // reachable for this caller (deleted, made private, or otherwise
      // inaccessible) is resolved client-side against the agents list the UI
      // already loads, so a broken assignment degrades to "unconfigured"
      // without an extra server round-trip into the agent registry.
      const { defaultAgentId } = await spaceSettings.get(request);
      return response.ok<SpaceSettingsResponse>({
        body: { default_agent_id: defaultAgentId },
      });
    })
  );

  // PUT to assign or clear the space's default agent. Validates that the
  // agent exists (and is usable) in the current space before persisting so
  // administrators cannot lock a space to a missing agent id.
  router.put(
    {
      path: `${internalApiPath}/space_settings`,
      security: AGENTS_WRITE_SECURITY,
      validate: {
        body: schema.object({
          default_agent_id: schema.nullable(
            schema.string({
              minLength: 1,
              maxLength: 256,
              meta: {
                description:
                  'ID of the agent to assign as the space default. Pass null to clear the assignment.',
              },
            })
          ),
        }),
      },
      options: { access: 'internal' },
    },
    wrapHandler(async (ctx, request, response) => {
      const { spaceSettings, agents } = getInternalServices();
      const payload = request.body as UpdateSpaceSettingsRequestBody;

      if (payload.default_agent_id !== null) {
        // `registry.get` throws an agent-not-found error (404) for ids that do
        // not resolve in the caller's space, so it doubles as the existence
        // check. A Private agent is only visible to its owner and ACL entries,
        // so it cannot be a space default that every user is pinned to.
        const registry = await agents.getRegistry({ request });
        const profile = await registry.get(payload.default_agent_id);
        if (profile.access_control?.access_mode === AgentAccessControlMode.Private) {
          throw createBadRequestError(
            'A private agent cannot be assigned as the space default. Change the agent access to public or shared, or pick another agent.'
          );
        }
      }

      const updated = await spaceSettings.set(request, payload.default_agent_id);
      return response.ok<SpaceSettingsResponse>({
        body: { default_agent_id: updated.defaultAgentId },
      });
    })
  );
}
