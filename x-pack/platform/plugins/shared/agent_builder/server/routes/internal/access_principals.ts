/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { AuthzDisabled } from '@kbn/core-security-server';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import { AGENTS_WRITE_SECURITY } from '../route_security';

export function registerAccessPrincipalsRoutes({ router, logger, coreSetup }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // Suggest user profiles (browser uses coreStart.userProfile.suggest pointing here).
  router.post(
    {
      path: '/internal/agent_builder/_suggest_user_profiles',
      security: AGENTS_WRITE_SECURITY,
      validate: {
        body: schema.object({
          name: schema.string({ minLength: 0, maxLength: 256 }),
          size: schema.maybe(schema.number({ min: 1, max: 100 })),
          dataPath: schema.maybe(schema.string()),
        }),
      },
      options: { access: 'internal' },
    },
    wrapHandler(async (ctx, request, response) => {
      const [, deps] = await coreSetup.getStartServices();
      if (!deps.security) {
        // Security plugin is optional in our manifest; in practice it's always present
        // in deployments where Agent Builder runs, but guard for the type.
        return response.ok({ body: [] });
      }

      // requiredPrivileges is hard-coded server-side per the user_profile_examples guidance.
      // We require login on the current space so we don't suggest deactivated users or
      // users without access to the workspace the agent lives in.
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

      return response.ok({ body: profiles });
    })
  );

  // List predefined (reserved) Elasticsearch roles.
  router.get(
    {
      path: '/internal/agent_builder/predefined_roles',
      security: {
        authz: AuthzDisabled.delegateToESClient,
      },
      validate: false,
      options: { access: 'internal' },
    },
    wrapHandler(async (ctx, request, response) => {
      const esClient = (await ctx.core).elasticsearch.client;
      const elasticsearchRoles = await esClient.asCurrentUser.security.getRole();

      const predefined = Object.entries(elasticsearchRoles)
        .filter(([, role]) => role.metadata?._reserved === true)
        .map(([name, role]) => ({
          name,
          description:
            (typeof role.metadata?.description === 'string' && role.metadata.description) ||
            undefined,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      return response.ok({ body: predefined });
    })
  );
}
