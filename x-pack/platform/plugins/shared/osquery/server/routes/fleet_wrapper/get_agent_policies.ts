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
import { fetchAllPackagePolicies, isDeliveringPackagePolicy } from '../pack/utils';

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
        // Every supported integration keeps its agent policies listed, but only the ones
        // Fleet delivers through (enabled integration and input) count as the owner.
        const listedAgentPolicyIds = new Set<string>();
        const packagePoliciesByAgentPolicyId = new Map<
          string,
          Array<Pick<PackagePolicy, 'id' | 'name'>>
        >();
        for (const packagePolicy of supportedPackagePolicies) {
          const { id, name, policy_ids: policyIds } = packagePolicy;
          for (const policyId of policyIds) {
            listedAgentPolicyIds.add(policyId);
            if (!isDeliveringPackagePolicy(packagePolicy)) continue;
            const integrations = packagePoliciesByAgentPolicyId.get(policyId) ?? [];
            integrations.push({ id, name });
            packagePoliciesByAgentPolicyId.set(policyId, integrations);
          }
        }

        const agentPolicyIds = [...listedAgentPolicyIds];
        const resolvedAgentPolicies = await agentPolicyService?.getByIds(
          spaceScopedClient,
          agentPolicyIds,
          { ignoreMissing: true }
        );
        const agentPolicies = resolvedAgentPolicies?.map((agentPolicy) => {
          const integrations = packagePoliciesByAgentPolicyId.get(agentPolicy.id) ?? [];

          return {
            ...agentPolicy,
            // The singular fields are only unambiguous with exactly one delivering osquery
            // integration; with several, none is set rather than an arbitrary one picked by
            // package-policy iteration order.
            ...(integrations.length === 1 && {
              package_policy_id: integrations[0].id,
              package_policy_name: integrations[0].name,
            }),
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
