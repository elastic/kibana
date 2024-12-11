/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { AGENTS_INDEX, PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { OSQUERY_INTEGRATION_NAME } from '../../common';
import type { OsqueryAppContext } from './osquery_app_context_services';

export interface AgentSelection {
  agents?: string[];
  allAgentsSelected?: boolean;
  platformsSelected?: string[];
  policiesSelected?: string[];
}

const PER_PAGE = 9000;

export const aggregateResults = async (
  generator: (
    page: number,
    perPage: number,
    searchAfter?: unknown[],
    pitId?: string
  ) => Promise<{ results: string[]; total: number; searchAfter?: unknown[] }>,
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
    let currentSort: unknown[] | undefined;
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
  const agentService = context.service.getAgentService()?.asInternalUser;
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
        async (page, perPage, searchAfter?: unknown[], pitId?: string) => {
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
          async (page, perPage, searchAfter?: unknown[], pitId?: string) => {
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

  return Array.from(selectedAgents);
};
