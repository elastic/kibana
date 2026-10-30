/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import {
  ACCESS_CONTROL_ROUTE_SECURITY,
  createAccessControlHandler,
  typeParamsSchema,
} from './common';
import type { RouteDefinitionParams } from '..';

/**
 * Suggests users who can receive grants. Users without feature privileges are suggested too, with
 * the levels they can actually use, so that access managers see why a grant will have no effect yet.
 * Service accounts are not suggested: the UI accepts a typed ID and the server validates it.
 */
export function defineSuggestPrincipalsRoute(params: RouteDefinitionParams) {
  params.router.post(
    {
      path: '/internal/security/access_control/{type}/_suggest_principals',
      validate: {
        params: typeParamsSchema,
        body: schema.object({
          name: schema.string({ maxLength: 1024 }),
          size: schema.number({ min: 1, max: 50, defaultValue: 20 }),
        }),
      },
      security: ACCESS_CONTROL_ROUTE_SECURITY,
      options: { access: 'internal' },
    },
    createAccessControlHandler(
      params,
      async ({ request, response, aclService, policy, spaceId }) => {
        // Only access managers need suggestions, and managing access needs the type's edit privileges.
        const editActions = aclService.getLevelPrivilegeActions(policy, 'edit');
        const { hasAllRequested } = await params.authz
          .checkPrivilegesWithRequest(request)
          .atSpace(spaceId, { kibana: editActions });
        if (!hasAllRequested) {
          return response.forbidden();
        }

        if (!params.license.getFeatures().allowUserProfileCollaboration) {
          return response.forbidden({
            body: { message: "Current license doesn't support user profile collaboration APIs." },
          });
        }

        const { name, size } = request.body;
        const profiles = await params
          .getUserProfileService()
          .suggest({ name, size, dataPath: 'avatar' });

        const uids = new Set(profiles.map(({ uid }) => uid));
        const eligibleLevels = new Map<string, string[]>();
        for (const level of uids.size > 0 ? policy.entryLevels : []) {
          const { hasPrivilegeUids } = await params.authz
            .checkUserProfilesPrivileges(uids)
            .atSpace(spaceId, { kibana: aclService.getLevelPrivilegeActions(policy, level) });
          for (const uid of hasPrivilegeUids) {
            eligibleLevels.set(uid, [...(eligibleLevels.get(uid) ?? []), level]);
          }
        }

        return response.ok({
          body: {
            users: profiles.map(({ uid, enabled, user, data }) => ({
              uid,
              enabled,
              user: { username: user.username, full_name: user.full_name, email: user.email },
              data,
              eligible_levels: eligibleLevels.get(uid) ?? [],
            })),
          },
        });
      }
    )
  );
}
