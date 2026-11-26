/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import { AuthzDisabled } from '@kbn/core-security-server';
import { handleEsError } from '@kbn/es-ui-shared-plugin/server';
import { PROFILES_API_PATH, RULES_API_PATH } from '../../common/constants';
import type { GetBoostProfilesResponse, GetBoostRulesResponse } from '../../common/types';
import { getBoostProfiles, getBoostRules } from '../lib/boost_client';
import { getRuleListItems } from '../lib/coverage';
import { getDataStreams } from '../lib/data_streams';
import { getStorageSizes, getTargetDetails } from '../lib/target_details';
// Temporary until Elasticsearch can explain every index and data stream (see `local_explain.ts`).
import { explainTargets, getBoostTargets, resolveIndices } from '../lib/local_explain';

const SECURITY = { authz: AuthzDisabled.delegateToESClient };

export const registerRoutes = (router: IRouter, logger: Logger) => {
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
        const [rules, profiles, indices, dataStreams, storageSizes] = await Promise.all([
          getBoostRules(client.asCurrentUser),
          getBoostProfiles(client.asCurrentUser),
          resolveIndices(client),
          getDataStreams(client),
          getStorageSizes(client, logger),
        ]);
        const explanations = explainTargets(rules, profiles, getBoostTargets(indices, dataStreams));
        const details = getTargetDetails(storageSizes, dataStreams);
        const body: GetBoostRulesResponse = {
          rules: getRuleListItems(rules, profiles, explanations, details),
        };
        return response.ok({ body });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
};
