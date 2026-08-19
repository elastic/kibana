/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAgentNotFoundError } from '@kbn/agent-builder-common';
import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import { AGENTS_WRITE_SECURITY } from '../route_security';
import type { InternalAgentDefinition } from '../../services/agents/agent_registry';
import { hasAgentUseAccess } from '../../services/agents/access_control';

/**
 * Picker endpoints for the access flyout.
 *
 * V1 only supports **user** principals — there is no role-listing endpoint here. The
 * upstream Elasticsearch privilege change required to list roles without
 * `manage_security` is tracked separately; role grants will land in V2 once that
 * change is in.
 */
export function registerAccessPrincipalsRoutes({
  router,
  logger,
  coreSetup,
  getInternalServices,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // Suggest user profiles (browser calls coreStart.userProfile.suggest pointing here).
  router.post(
    {
      path: '/internal/agent_builder/_suggest_user_profiles',
      security: AGENTS_WRITE_SECURITY,
      validate: {
        body: schema.object({
          name: schema.string({ minLength: 0, maxLength: 256 }),
          size: schema.maybe(schema.number({ min: 1, max: 100 })),
          dataPath: schema.maybe(schema.string()),
          agent_id: schema.maybe(schema.string({ maxLength: 256 })),
        }),
      },
      options: { access: 'internal' },
    },
    wrapHandler(async (ctx, request, response) => {
      const [, deps] = await coreSetup.getStartServices();
      if (!deps.security) {
        return response.ok({ body: [] });
      }
      const spaceId = (await ctx.agentBuilder).spaces.getSpaceId();
      const profiles = await deps.security.userProfiles.suggest({
        name: request.body.name,
        size: request.body.size,
        dataPath: request.body.dataPath,
        requiredPrivileges: {
          spaceId,
          privileges: {
            kibana: [deps.security.authz.actions.login],
          },
        },
      });

      const { agent_id: agentId } = request.body;
      if (!agentId) {
        return response.ok({ body: profiles });
      }

      const { agents } = getInternalServices();
      let agent: InternalAgentDefinition;
      try {
        const registry = await agents.getRegistry({ request });
        agent = await registry.get(agentId);
      } catch (error) {
        if (isAgentNotFoundError(error)) {
          return response.ok({ body: profiles });
        }
        throw error;
      }

      return response.ok({
        body: profiles.map((profile) => ({
          ...profile,
          has_agent_access: hasAgentUseAccess({
            accessControl: agent.access_control,
            owner: agent.created_by,
            currentUser: { id: profile.uid, username: profile.user.username },
            isAdmin: false,
          }),
        })),
      });
    })
  );
}
