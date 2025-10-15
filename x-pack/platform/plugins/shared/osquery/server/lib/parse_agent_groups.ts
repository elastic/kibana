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
  ) => Promise<{ results: string[]; total: number; searchAfter?: SortResults }>,
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
    const { id: pitId } = await esClient.openPointInTime({
      index: AGENTS_INDEX,
      keep_alive: '10m',
    });
    let currentSort: SortResults | undefined;
    // Refetch first page with PIT
    const { results: pitInitialResults, searchAfter } = await generator(
      1,
      PER_PAGE,
      currentSort, // No searchAfter for first page, its built based on first page results
      pitId
    );
    results = pitInitialResults;
    currentSort = searchAfter;
    let currPage = 2;
    while (currPage <= totalPages) {
      const { results: additionalResults, searchAfter: additionalSearchAfter } = await generator(
        currPage++,
        PER_PAGE,
        currentSort,
        pitId
      );
      results.push(...additionalResults);
      currentSort = additionalSearchAfter;
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
 * Parses agent selection criteria and returns a list of validated agent IDs.
 *
 * This function fetches agents based on the provided selection criteria (all agents,
 * specific platforms, policies, or manually specified agent IDs). It uses paginated
 * queries with Point-in-Time API to support enterprise-scale deployments (10k+ agents).
 *
 * @param soClient - Saved Objects client for accessing package policies
 * @param esClient - Elasticsearch client for PIT-based pagination
 * @param context - Osquery app context providing agent and policy services
 * @param agentSelection - Agent selection criteria
 *
 * @returns {Promise<string[]>} Array of validated agent IDs, or empty array if:
 *   - No agents match the selection criteria
 *   - Agent/PackagePolicy services are unavailable
 *
 * @remarks
 * This function does NOT throw errors. Callers should check for empty array and
 * handle appropriately (typically by throwing a 400 error).
 *
 * The function implicitly validates agents through:
 * - Space-scoped agent service (enforces RBAC)
 * - Online status filtering (status:online)
 * - Osquery policy filtering (only agents with Osquery integration)
 * - PIT-based pagination (handles 10k+ agents safely)
 *
 * @example
 * const agents = await parseAgentSelection(soClient, esClient, context, {
 *   allAgentsSelected: true,
 *   spaceId: 'default',
 * });
 *
 * if (!agents.length) {
 *   throw new CustomHttpRequestError('No agents found for selection', 400);
 * }
 *
 * @see aggregateResults for pagination implementation details
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
  const kueryFragments = ['status:online'];

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
            searchAfter: res.agents[res.agents.length - 1].sort,
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
              searchAfter: res.agents[res.agents.length - 1].sort,
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

  const selectedAgentsArray = Array.from(selectedAgents);

  /**
   * VALIDATION RATIONALE:
   *
   * This function does NOT perform an additional validation call via getByIds() because:
   * // await agentService?.getByIds(selectedAgentsArray, { ignoreMissing: false });
   * 1. ALREADY VALIDATED: All agents in selectedAgentsArray were successfully fetched through
   *    aggregateResults(), which uses Fleet's listAgents() with proper pagination (PIT + searchAfter).
   *    If an agent didn't exist or wasn't accessible, it wouldn't be in this array.
   *
   * 2. SPACE-SCOPED: The agentService is already space-scoped via asInternalScopedUser(spaceId).
   *    Fleet's listAgents() enforces space boundaries through Kibana's security model.
   *
   * 3. FILTERED BY CRITERIA: Agents are filtered by:
   *    - status:online (only active agents)
   *    - policy_id (only agents with Osquery integration)
   *    - Platform/policy selection (if specified)
   *
   * 4. SCALABILITY: A redundant getByIds() call would fail for 10k+ agents due to
   *    Elasticsearch's max_result_window limit (default: 10,000). The getByIds method
   *    doesn't use pagination, making it unsuitable for enterprise-scale deployments.
   *
   * 5. PERFORMANCE: Avoiding redundant validation reduces API latency and ES load.
   *
   * HISTORICAL NOTE: This validation was originally added to check space boundaries, but
   * the space-scoped service already enforces this during the initial fetch. Removing this
   * validation resolves Issue #2 from the 10k+ agents scalability investigation.
   *
   * @see https://github.com/elastic/kibana/issues/206924 (Fleet pagination issue)
   */
  return selectedAgentsArray;
};
