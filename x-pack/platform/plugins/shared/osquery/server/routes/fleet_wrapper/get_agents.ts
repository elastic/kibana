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
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { fromKueryExpression } from '@kbn/es-query';
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

        // No osquery-enabled policies: return empty result rather than unscoped query
        if (!agentPolicyIds.length) {
          return response.ok({
            body: {
              total: 0,
              groups: { platforms: [], overlap: {}, policies: [] },
              agents: [],
            },
          });
        }

        const agentPolicies = await agentPolicyService?.getByIds(spaceScopedClient, agentPolicyIds);

        // Scope derived from the server's own policy list, not client-supplied (#266739).
        const policyScope = buildPolicyIdKuery(agentPolicyIds);

        // FIND agents by policy_name
        const policyNamePattern = /policy_name:([^ ]+)/;
        const searchKuery = query.kuery ?? '';
        const policyName: string | undefined = searchKuery.match(policyNamePattern)?.[1];

        const foundPolicyByName = policyName
          ? agentPolicies?.filter((policy) =>
              policy.name.toLowerCase().includes(policyName.toLowerCase())
            )
          : [];

        // `searchKuery` is free-form text from the wire. Unbalanced input (`a) or (b`) would
        // otherwise rebalance the parentheses below and lift branches out of the policy scope,
        // since KQL binds `and` tighter than `or`. Each fragment is therefore parsed standalone
        // first, then wrapped in its own parens so it cannot reassociate with the scope clause.
        //
        // Must stay a string: Fleet's `includeUnenrolled` calls `.toLowerCase()` on it, even
        // though `ListWithKuery` types kuery as `string | KueryNode`. `toKqlExpression` can't
        // build it either — it does not round-trip escaped keywords (it emits a bare `\or`).
        let composedKuery: string;

        try {
          if (searchKuery) {
            fromKueryExpression(searchKuery);
          }

          const scopeClause = `(${policyScope})`;

          let searchClause: string | undefined;
          if (foundPolicyByName?.length) {
            // Keep the raw search terms alongside the resolved policy ids so version-suffixed
            // agents (`<id>#<major.minor>`) still match.
            const policyNameScope = buildPolicyIdKuery(foundPolicyByName.map((p) => p.id));
            searchClause = searchKuery
              ? `((${searchKuery}) or (${policyNameScope}))`
              : `(${policyNameScope})`;
          } else if (searchKuery) {
            searchClause = `(${searchKuery})`;
          }

          composedKuery = searchClause ? `${searchClause} and ${scopeClause}` : scopeClause;

          // A top-level `or` here would mean the scope is bypassable — fail closed instead.
          const composedNode = fromKueryExpression(composedKuery);
          if (searchClause && composedNode.function !== 'and') {
            throw new Error('composed kuery lost its policy scope');
          }
        } catch (error) {
          // Reject rather than fall back to a broader scope. Parser internals stay server-side.
          osqueryContext.logFactory
            .get('get_agents')
            .debug(`Rejected malformed agent search kuery: ${error.message}`);

          return response.badRequest({ body: { message: 'Invalid search query' } });
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
              kuery: composedKuery,
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
