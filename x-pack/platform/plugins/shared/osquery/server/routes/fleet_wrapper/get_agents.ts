/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { ListWithKuery } from '@kbn/fleet-plugin/server/types';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { filter, flatMap, mapKeys, uniq } from 'lodash';
import type { PackagePolicy } from '@kbn/fleet-plugin/server/types';
import { satisfies } from 'semver';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { mergeVersionSuffixedPolicyBuckets } from '../../utils/merge_version_suffixed_policy_buckets';
import { buildPolicyIdKuery } from '../../../common/utils/build_policy_id_kuery';
import { processAggregations } from '../../../common/utils/aggregations';
import { getAgentsRequestQuerySchema } from '../../../common/api';
import type { GetAgentsRequestQuerySchema } from '../../../common/api';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import { API_VERSIONS, OSQUERY_INTEGRATION_NAME } from '../../../common/constants';
import { PLUGIN_ID } from '../../../common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';

export const getAgentsRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .get({
      access: 'internal',
      path: '/internal/osquery/fleet_wrapper/agents',
      security: {
        authz: {
          requiredPrivileges: [`${PLUGIN_ID}-read`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: buildRouteValidation<
              typeof getAgentsRequestQuerySchema,
              GetAgentsRequestQuerySchema
            >(getAgentsRequestQuerySchema),
          },
        },
      },
      async (context, request, response) => {
        let esAgents;
        const query = request.query as ListWithKuery & {
          showAgentless?: boolean;
          showInactive: boolean;
          searchAfter?: SortResults;
          pitId?: string;
          getStatusSummary?: boolean;
        };

        const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
          osqueryContext,
          request
        );
        const space = await osqueryContext.service.getActiveSpace(request);

        const packagePolicyService = osqueryContext.service.getPackagePolicyService();
        const agentPolicyService = osqueryContext.service.getAgentPolicyService();

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

        // FIND agents by policy_name
        // `use_all_agents` emits the `policy_name` clause as the last term of the search group, and
        // the search text also appears unescaped in earlier clauses, so the last match is the real one.
        const policyNamePattern = /policy_name:([^ ]+)/g;
        let kuery = query.kuery;
        const policyNameClause = [...kuery.matchAll(policyNamePattern)].pop();
        const policyName: string | undefined = policyNameClause?.[1];

        const foundPolicyByName = policyName
          ? agentPolicies?.filter((policy) =>
              policy.name.toLowerCase().includes(policyName.toLowerCase())
            ) ?? []
          : [];

        // `policy_name` is not an agent field, and Fleet rejects unmapped kuery fields, so the
        // clause is replaced by the policy ids it resolved to. Its value may contain spaces, so the
        // clause runs up to the closing `)` of the search group. No match yields a match-nothing clause.
        if (policyNameClause?.index !== undefined) {
          const clauseStart = policyNameClause.index;
          const groupEnd = kuery.lastIndexOf(')');
          const clauseEnd = groupEnd > clauseStart ? groupEnd : kuery.length;
          kuery =
            kuery.slice(0, clauseStart) +
            buildPolicyIdKuery(foundPolicyByName.map((p) => p.id)) +
            ' ' +
            kuery.slice(clauseEnd);
        }

        const agentPolicyById = mapKeys(agentPolicies, 'id');

        try {
          esAgents = await osqueryContext.service
            .getAgentService()
            ?.asInternalScopedUser(space?.id ?? DEFAULT_SPACE_ID)
            .listAgents({
              page: query.page,
              perPage: query.perPage,
              sortField: query.sortField,
              sortOrder: query.sortOrder,
              showUpgradeable: query.showUpgradeable,
              getStatusSummary: query.getStatusSummary,
              pitId: query.pitId,
              searchAfter: query.searchAfter,
              kuery,
              showAgentless: query.showAgentless,
              showInactive: query.showInactive,
              aggregations: {
                platforms: {
                  terms: {
                    field: 'local_metadata.os.platform',
                  },
                },
                policies: {
                  terms: {
                    field: 'policy_id',
                    size: 2000,
                  },
                },
              },
            });
        } catch (error) {
          return response.badRequest({ body: error });
        }

        const { platforms, overlap, policies } = processAggregations(esAgents?.aggregations);

        return response.ok({
          body: {
            total: esAgents?.total ?? 0,
            groups: {
              platforms,
              overlap,
              policies: mergeVersionSuffixedPolicyBuckets(policies).map((p) => {
                const name = agentPolicyById[p.id]?.name ?? p.name;

                return {
                  ...p,
                  name,
                };
              }),
            },
            agents: esAgents?.agents ?? [],
          },
        });
      }
    );
};
