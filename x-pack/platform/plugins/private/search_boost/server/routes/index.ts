/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { AuthzDisabled } from '@kbn/core-security-server';
import { handleEsError } from '@kbn/es-ui-shared-plugin/server';
import { PROFILES_API_PATH, RULES_API_PATH } from '../../common/constants';
import type { GetBoostProfilesResponse, GetBoostRulesResponse } from '../../common/types';
import { getBoostProfiles, getBoostRules } from '../lib/boost_client';
import { getRuleListItems } from '../lib/coverage';
// Temporary until Elasticsearch can explain every index and data stream (see `local_explain.ts`).
import { explainTargets, getBoostTargets } from '../lib/local_explain';

const SECURITY = { authz: AuthzDisabled.delegateToESClient };

export const registerRoutes = (router: IRouter) => {
  router.get(
    { path: PROFILES_API_PATH, security: SECURITY, validate: false },
    async (context, _request, response) => {
      const { client } = (await context.core).elasticsearch;
      try {
        const body: GetBoostProfilesResponse = {
          profiles: await getBoostProfiles(client.asCurrentUser),
        };
        return response.ok({ body });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );

  router.get(
    { path: RULES_API_PATH, security: SECURITY, validate: false },
    async (context, _request, response) => {
      const { client } = (await context.core).elasticsearch;
      try {
        const [rules, profiles, targets] = await Promise.all([
          getBoostRules(client.asCurrentUser),
          getBoostProfiles(client.asCurrentUser),
          getBoostTargets(client),
        ]);
        const explanations = explainTargets(rules, profiles, targets);
        const body: GetBoostRulesResponse = {
          rules: getRuleListItems(rules, profiles, explanations),
        };
        return response.ok({ body });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
};
