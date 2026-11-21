/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { filter } from 'lodash';
import { satisfies } from 'semver';
import type { GetAgentPoliciesResponseItem, PackagePolicy } from '@kbn/fleet-plugin/common';
import type { IRouter } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { API_VERSIONS } from '../../../common/constants';
import { PLUGIN_ID } from '../../../common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { fetchAllPackagePolicies } from '../pack/utils';

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

        const packagePolicies = await fetchAllPackagePolicies(
          packagePolicyService,
          spaceScopedClient
        );
        const supportedPackagePolicies = filter(packagePolicies, (packagePolicy) =>
          satisfies(packagePolicy.package?.version ?? '', '>=0.6.0', { includePrerelease: true })
        );
        const packagePoliciesByAgentPolicyId = new Map<
          string,
          Array<Pick<PackagePolicy, 'id' | 'name'>>
        >();
        for (const { id, name, policy_ids: policyIds } of supportedPackagePolicies) {
          for (const policyId of policyIds) {
            const integrations = packagePoliciesByAgentPolicyId.get(policyId) ?? [];
            integrations.push({ id, name });
            packagePoliciesByAgentPolicyId.set(policyId, integrations);
          }
        }

        const agentPolicyIds = [...packagePoliciesByAgentPolicyId.keys()];
        const resolvedAgentPolicies = await agentPolicyService?.getByIds(
          spaceScopedClient,
          agentPolicyIds,
          { ignoreMissing: true }
        );
        const agentPolicies = resolvedAgentPolicies?.map((agentPolicy) => {
          const integrations = packagePoliciesByAgentPolicyId.get(agentPolicy.id) ?? [];

          return {
            ...agentPolicy,
            // The singular fields are only unambiguous with exactly one osquery
            // integration; with several, consumers must read `osquery_package_policies`
            // rather than get an arbitrary one picked by package-policy iteration order.
            ...(integrations.length === 1 && {
              package_policy_id: integrations[0].id,
              package_policy_name: integrations[0].name,
            }),
            osquery_package_policies: integrations,
          };
        });

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
