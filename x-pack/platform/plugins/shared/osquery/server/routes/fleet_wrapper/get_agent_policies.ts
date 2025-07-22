/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { filter, uniq, flatMap } from 'lodash';
import { satisfies } from 'semver';
import type { GetAgentPoliciesResponseItem, PackagePolicy } from '@kbn/fleet-plugin/common';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import type { IRouter } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { API_VERSIONS } from '../../../common/constants';
import { OSQUERY_INTEGRATION_NAME, PLUGIN_ID } from '../../../common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';

export const getAgentPoliciesRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .get({
      access: 'internal',
      path: '/internal/osquery/fleet_wrapper/agent_policies',
      security: {
        authz: {
          requiredPrivileges: [`${PLUGIN_ID}-read`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {},
      },
      async (context, request, response) => {
        const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
          osqueryContext,
          request
        );
        const space = await osqueryContext.service.getActiveSpace(request);

        const agentService = osqueryContext.service.getAgentService();
        const agentPolicyService = osqueryContext.service.getAgentPolicyService();
        const packagePolicyService = osqueryContext.service.getPackagePolicyService();

        const { items: packagePolicies } = (await packagePolicyService?.list(spaceScopedClient, {
          kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${OSQUERY_INTEGRATION_NAME}`,
          perPage: 1000,
          page: 1,
        })) ?? { items: [] as PackagePolicy[] };
        const supportedPackagePolicyIds = filter(packagePolicies, (packagePolicy) =>
          satisfies(packagePolicy.package?.version ?? '', '>=0.6.0')
        );
        const agentPolicyIds = uniq(flatMap(supportedPackagePolicyIds, 'policy_ids'));
        const agentPolicies = await agentPolicyService?.getByIds(spaceScopedClient, agentPolicyIds);

        if (agentPolicies?.length) {
          await pMap(
            agentPolicies,
            (agentPolicy: GetAgentPoliciesResponseItem) =>
              agentService
                ?.asInternalScopedUser(space?.id ?? DEFAULT_SPACE_ID)
                .getAgentStatusForAgentPolicy(agentPolicy.id)
                .then(({ active: agentTotal }) => (agentPolicy.agents = agentTotal)),
            { concurrency: 10 }
          );
        }

        return response.ok({ body: agentPolicies });
      }
    );
};
