/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SUGGEST_USER_PROFILES_URL } from '../../../common/constants';
import { ESCALATIONS_API_PRIVILEGE_MANAGE } from '../constants';
import { INVESTIGATIONS_API_PRIVILEGE_MANAGE } from '../../investigations/constants';
import type { EscalationRouteDependencies } from '../types';

/**
 * Suggests user profiles for both the escalation collaborator picker and the investigation
 * assignee picker. Requires either manage privilege: users who can manage investigations
 * need this to suggest assignees even when they cannot manage escalations.
 *
 * Deliberately an unversioned `router.post` (not `router.versioned`), consistent with every
 * other internal user-profile suggest route in Kibana — the core suggest client sends no
 * `elastic-api-version` header, and adding one would break the route.
 */
export const registerSuggestUsersRoute = ({
  router,
  getSpaceId,
  getSecurity,
}: EscalationRouteDependencies) => {
  router.post(
    {
      path: SUGGEST_USER_PROFILES_URL,
      security: {
        authz: {
          requiredPrivileges: [
            {
              anyRequired: [ESCALATIONS_API_PRIVILEGE_MANAGE, INVESTIGATIONS_API_PRIVILEGE_MANAGE],
            },
          ],
        },
      },
      validate: {
        body: schema.object({
          name: schema.string({ minLength: 0, maxLength: 256 }),
          size: schema.maybe(schema.number({ min: 1, max: 100 })),
          dataPath: schema.maybe(schema.string({ maxLength: 256 })),
        }),
      },
      options: { access: 'internal' },
    },
    async (ctx, request, response) => {
      const security = await getSecurity();
      if (!security) {
        // Fail-soft: without the security plugin there are no profiles to enumerate.
        return response.ok({ body: [] });
      }

      const spaceId = getSpaceId(request);
      const profiles = await security.userProfiles.suggest({
        name: request.body.name,
        size: request.body.size,
        dataPath: request.body.dataPath,
        requiredPrivileges: {
          spaceId,
          privileges: {
            kibana: [security.authz.actions.login],
          },
        },
      });

      return response.ok({ body: profiles });
    }
  );
};
