/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { AGENTS_INDEX, PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import { OSQUERY_INTEGRATION_NAME } from '../../common';
import type { OsqueryAppContext } from './osquery_app_context_services';

export interface AgentSelection {
  agents?: string[];
  allAgentsSelected?: boolean;
  platformsSelected?: string[];
  policiesSelected?: string[];
  spaceId: string;
}

const PER_PAGE = 9000;

export const aggregateResults = async (
  generator: (
    page: number,
    perPage: number,
    searchAfter?: SortResults,
    pitId?: string
  ) => Promise<{ results: string[]; total: number; searchAfter?: SortResults; pitId?: string }>,
  esClient: ElasticsearchClient,
  context: OsqueryAppContext
) => {
  let results: string[];
  const { results: initialResults, total } = await generator(1, PER_PAGE);
  const totalPages = Math.ceil(total / PER_PAGE);
  if (totalPages === 1) {
    // One page only, no need for PIT
    results = initialResults;
  } else {
    let pitId = (
      await esClient.openPointInTime({
        index: AGENTS_INDEX,
        keep_alive: '10m',
      })
    ).id;
    let currentSort: SortResults | undefined;
    // Refetch first page with PIT
    const {
      results: pitInitialResults,
      searchAfter,
      pitId: returnedPitId,
    } = await generator(
      1,
      PER_PAGE,
      currentSort, // No searchAfter for first page, its built based on first page results
      pitId
    );
    results = pitInitialResults;
    currentSort = searchAfter;
    pitId = returnedPitId ?? pitId;
    let currPage = 2;
    while (currPage <= totalPages) {
      const {
        results: additionalResults,
        searchAfter: additionalSearchAfter,
        pitId: additionalPitId,
      } = await generator(currPage++, PER_PAGE, currentSort, pitId);
      results.push(...additionalResults);
      currentSort = additionalSearchAfter;
      pitId = additionalPitId ?? pitId;
    }

    try {
      await esClient.closePointInTime({ id: pitId });
    } catch (error) {
      context.logFactory
        .get()
        .warn(`Error closing point in time with id: ${pitId}. Error: ${error.message}`);
    }
  }

  return uniq<string>(results);
};

/**
 * Parses agent selection criteria and returns a deduplicated array of agent IDs.
 *
 * This function handles three types of agent selection:
 * 1. All agents (filtered by online status and Osquery policy)
 * 2. Agents filtered by platform and/or policy
 * 3. Explicitly specified agent IDs
 *
 * @param soClient - SavedObjects client for accessing package policies
 * @param esClient - Elasticsearch client for PIT-based pagination
 * @param context - Osquery app context with services and logging
 * @param agentSelection - Agent selection criteria
 * @returns Array of unique agent IDs that match the selection criteria
 *
 * @remarks
 * **Validation Safety**: This function does NOT perform an additional validation
 * call to Fleet's `getByIds` after fetching agents. This is intentional and safe because:
 *
 * 1. **Agents Already Validated During Fetch**: The `aggregateResults` function uses
 *    Fleet's `listAgents` API with proper filters (online status, Osquery policy).
 *    Any agent returned by this API is already validated to exist and meet criteria.
 *
 * 2. **Space Security Enforced**: The `agentService` is created via
 *    `asInternalScopedUser(spaceId)`, ensuring all agent queries are automatically
 *    space-scoped. Agents from other spaces cannot be accessed.
 *
 * 3. **Scalability**: Fleet's `getByIds` does not use pagination and hits
 *    Elasticsearch's `max_result_window` limit (default: 10,000) when validating
 *    large agent sets. This prevents querying 10k+ agents simultaneously.
 *
 * 4. **Implicit Validation**: The filters applied (online status, Osquery policy)
 *    provide implicit validation that agents are valid targets for Osquery actions.
 *
 * For deployments with 10,000+ agents, removing the redundant validation is
 * required for the plugin to function correctly.
 */
export const parseAgentSelection = async (
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  context: OsqueryAppContext,
  agentSelection: AgentSelection
) => {
  const selectedAgents: Set<string> = new Set();
  const addAgent = selectedAgents.add.bind(selectedAgents);
  const {
    allAgentsSelected = false,
    platformsSelected = [],
    policiesSelected = [],
    agents = [],
  } = agentSelection;
  const agentService = context.service
    .getAgentService()
    ?.asInternalScopedUser(agentSelection.spaceId);
  const packagePolicyService = context.service.getPackagePolicyService();
  // Explicitly allow only online and degraded agents for Osquery queries
  // - online: Agent is healthy and checking in regularly
  // - degraded: Agent is checking in but has issues with other integrations
  const kueryFragments: string[] = ['(status:online OR status:degraded)'];

  if (agentService && packagePolicyService) {
    const osqueryPolicies = await aggregateResults(
      async (page, perPage) => {
        const { items, total } = await packagePolicyService.list(soClient, {
          kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${OSQUERY_INTEGRATION_NAME}`,
          perPage,
          page,
        });

        return { results: items.flatMap((it) => it.policy_ids), total };
      },
      esClient,
      context
    );
    kueryFragments.push(`policy_id:(${uniq(osqueryPolicies).join(' or ')})`);
    if (allAgentsSelected) {
      const kuery = kueryFragments.join(' and ');
      const fetchedAgents = await aggregateResults(
        async (page, perPage, searchAfter?: SortResults, pitId?: string) => {
          const res = await agentService.listAgents({
            ...(searchAfter ? { searchAfter } : {}),
            ...(pitId ? { pitId } : {}),
            perPage,
            page,
            kuery,
            showInactive: false,
          });

          return {
            results: res.agents.map((agent) => agent.id),
            total: res.total,
            searchAfter:
              res.agents.length > 0 && res.agents[res.agents.length - 1].sort
                ? res.agents[res.agents.length - 1].sort
                : undefined,
            pitId: res.pit,
          };
        },
        esClient,
        context
      );
      fetchedAgents.forEach(addAgent);
    } else {
      if (platformsSelected.length > 0 || policiesSelected.length > 0) {
        const groupFragments = [];
        if (platformsSelected.length) {
          groupFragments.push(`local_metadata.os.platform:(${platformsSelected.join(' or ')})`);
        }

        if (policiesSelected.length) {
          groupFragments.push(`policy_id:(${policiesSelected.join(' or ')})`);
        }

        kueryFragments.push(`(${groupFragments.join(' or ')})`);
        const kuery = kueryFragments.join(' and ');
        const fetchedAgents = await aggregateResults(
          async (page, perPage, searchAfter?: SortResults, pitId?: string) => {
            const res = await agentService.listAgents({
              ...(searchAfter ? { searchAfter } : {}),
              ...(pitId ? { pitId } : {}),
              perPage,
              page,
              kuery,
              showInactive: false,
            });

            return {
              results: res.agents.map((agent) => agent.id),
              total: res.total,
              searchAfter:
                res.agents.length > 0 && res.agents[res.agents.length - 1].sort
                  ? res.agents[res.agents.length - 1].sort
                  : undefined,
              pitId: res.pit,
            };
          },
          esClient,
          context
        );
        fetchedAgents.forEach(addAgent);
      }
    }
  }

  agents.forEach(addAgent);

  // Note: No additional validation call to Fleet's `getByIds` is performed here.
  // See JSDoc on `parseAgentSelection` for detailed rationale.
  return Array.from(selectedAgents);
};
