/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import type { ElasticsearchClient } from '@kbn/core/server';

import type { EsqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';

import { SO_SEARCH_LIMIT } from '../../constants';

import type {
  FleetServerAgentAction,
  ActionStatus,
  ActionErrorResult,
  AgentActionType,
  ActionStatusOptions,
} from '../../types';
import {
  AGENT_ACTIONS_INDEX,
  AGENT_ACTIONS_RESULTS_INDEX,
  AGENTS_INDEX,
  AGENT_POLICY_INDEX,
} from '../../../common';
import { appContextService } from '..';
import {
  addNamespaceFilteringToQuery,
  namespaceFilterEsql,
} from '../spaces/query_namespaces_filtering';

/**
 * Return current bulk actions.
 * These are a combination of agent actions and agent policy change actions, sorted by timestamp.
 * With page=i and perPage=N, this works by:
 * 1. fetching (i+1)*N agent actions
 * 2. fetching (i+1)*N agent policy actions
 * 3. concatenating and sorting those
 * 4. returning the [i*N : (i+1)*N[ slice of the array
 */
export async function getActionStatuses(
  esClient: ElasticsearchClient,
  options: ActionStatusOptions,
  namespace?: string
): Promise<ActionStatus[]> {
  const actionResults = await getActionResults(esClient, options, namespace);
  const policyChangeActions = await getPolicyChangeActions(esClient, options, namespace);
  const actionStatuses = [...actionResults, ...policyChangeActions]
    .sort((a: ActionStatus, b: ActionStatus) => (b.creationTime > a.creationTime ? 1 : -1))
    .slice(getPage(options), getPerPage(options));
  return actionStatuses;
}

async function getActionResults(
  esClient: ElasticsearchClient,
  options: ActionStatusOptions,
  namespace?: string
): Promise<ActionStatus[]> {
  const actions = await getActions(esClient, options, namespace);
  if (actions.length === 0) {
    return [];
  }
  const cancelledActions = await getCancelledActions(esClient);
  let acks: EsqlQueryResponse | undefined;

  try {
    const esqlQuery = `FROM ${AGENT_ACTIONS_RESULTS_INDEX}
    | WHERE action_id IN (${actions.map((a) => `"${a.actionId}"`).join(', ')}) 
    | KEEP @timestamp, action_id 
    | STATS ack_counts = COUNT(*), max_timestamp = MAX(@timestamp) BY action_id 
    | LIMIT ${actions.length || 10}`;

    acks = await esClient.esql.query({
      query: esqlQuery,
    });
  } catch (err) {
    if (err.statusCode === 400 && err.message.includes('Unknown index')) {
      // .fleet-actions-results does not yet exist
      appContextService.getLogger().debug(err);
    } else {
      throw err;
    }
  }

  const results = [];

  for (const action of actions) {
    const matchingBucket = acks?.values.find((value) => value[2] === action.actionId);
    const nbAgentsActioned = action.nbAgentsActioned || action.nbAgentsActionCreated;
    const docCount = (matchingBucket?.[0] ?? 0) as number;
    const nbAgentsAck = Math.min(docCount, nbAgentsActioned);
    const completionTime = matchingBucket?.[1] as string;
    const complete = nbAgentsAck >= nbAgentsActioned;
    const cancelledAction = cancelledActions.find((a) => a.actionId === action.actionId);

    let errorCount = 0;
    let latestErrors: ActionErrorResult[] = [];
    try {
      const esqlQuery = `FROM ${AGENT_ACTIONS_RESULTS_INDEX} 
      | WHERE action_id == \"${action.actionId}\" AND error IS NOT NULL 
      | KEEP @timestamp, agent_id, error 
      | SORT @timestamp DESC 
      | LIMIT ${options.errorSize}`;

      const errorResults = await esClient.esql.query({
        query: esqlQuery,
      });

      errorCount = ((errorResults as any).documents_found as number) ?? 0;
      latestErrors = ((errorResults.values as any) ?? []).map((value: any) => ({
        agentId: value[1],
        error: value[2],
        timestamp: value[0],
      }));
      if (latestErrors.length > 0) {
        const hostNames = await getHostNames(
          esClient,
          latestErrors.map((errorItem: ActionErrorResult) => errorItem.agentId)
        );
        latestErrors.forEach((errorItem: ActionErrorResult) => {
          errorItem.hostname = hostNames[errorItem.agentId] ?? errorItem.agentId;
        });
      }
    } catch (err) {
      if (err.statusCode === 400 && err.message.includes('Unknown index')) {
        // .fleet-actions-results does not yet exist
        appContextService.getLogger().debug(err);
      } else {
        throw err;
      }
    }
    results.push({
      ...action,
      nbAgentsAck: nbAgentsAck - errorCount,
      nbAgentsFailed: errorCount,
      status: cancelledAction
        ? 'CANCELLED'
        : errorCount > 0 && complete
        ? 'FAILED'
        : complete
        ? 'COMPLETE'
        : action.status,
      nbAgentsActioned,
      cancellationTime: cancelledAction?.timestamp,
      completionTime,
      latestErrors,
    });
  }

  return results;
}

export function getPage(options: ActionStatusOptions) {
  if (options.page === undefined || options.perPage === undefined) {
    return 0;
  }

  return options.page * options.perPage;
}

export function getPerPage(options: ActionStatusOptions) {
  if (options.page === undefined || options.perPage === undefined) {
    return 20;
  }

  return (options.page + 1) * options.perPage;
}

async function getActions(
  esClient: ElasticsearchClient,
  options: ActionStatusOptions,
  namespace?: string
): Promise<ActionStatus[]> {
  // could access source fields in the ES|QL response with "METADATA _source"
  const query = {
    bool: {
      must_not: [
        {
          term: {
            type: 'CANCEL',
          },
        },
      ],
      ...(options.date || options.latest
        ? {
            filter: [
              {
                range: {
                  '@timestamp': {
                    // options.date overrides options.latest
                    gte: options.date ?? `now-${(options.latest ?? 0) / 1000}s/s`,
                    lte: options.date ? moment(options.date).add(1, 'days').toISOString() : 'now/s',
                  },
                },
              },
            ],
          }
        : {}),
    },
  };
  const res = await esClient.search<FleetServerAgentAction>({
    index: AGENT_ACTIONS_INDEX,
    ignore_unavailable: true,
    from: 0,
    size: getPerPage(options),
    query: await addNamespaceFilteringToQuery(query, namespace),
    sort: [{ '@timestamp': 'desc' }],
  });

  return Object.values(
    res.hits.hits.reduce((acc, hit) => {
      if (!hit._source || !hit._source.action_id) {
        return acc;
      }

      const source = hit._source!;

      if (!acc[source.action_id!]) {
        const isExpired =
          source.expiration && source.type !== 'UPGRADE'
            ? Date.parse(source.expiration) < Date.now()
            : false;
        acc[hit._source.action_id] = {
          actionId: hit._source.action_id,
          nbAgentsActionCreated: 0,
          nbAgentsAck: 0,
          version: hit._source.data?.version as string,
          startTime: source.start_time,
          type: source.type as AgentActionType,
          nbAgentsActioned: source.total ?? 0,
          status: isExpired
            ? 'EXPIRED'
            : hasRolloutPeriodPassed(source)
            ? 'ROLLOUT_PASSED'
            : 'IN_PROGRESS',
          expiration: source.expiration,
          newPolicyId: source.data?.policy_id as string,
          creationTime: source['@timestamp']!,
          nbAgentsFailed: 0,
          hasRolloutPeriod: !!source.rollout_duration_seconds,
          is_automatic: source.is_automatic,
          policyId: source.policyId,
        };
      }

      acc[hit._source.action_id].nbAgentsActionCreated += hit._source.agents?.length ?? 0;

      return acc;
    }, {} as { [k: string]: ActionStatus })
  );
}

export async function getCancelledActions(
  esClient: ElasticsearchClient
): Promise<Array<{ actionId: string; timestamp?: string }>> {
  const res = await esClient.search<FleetServerAgentAction>({
    index: AGENT_ACTIONS_INDEX,
    ignore_unavailable: true,
    size: SO_SEARCH_LIMIT,
    query: {
      bool: {
        filter: [
          {
            term: {
              type: 'CANCEL',
            },
          },
        ],
      },
    },
  });

  return res.hits.hits.map((hit) => ({
    actionId: hit._source?.data?.target_id as string,
    timestamp: hit._source?.['@timestamp'],
  }));
}

async function getHostNames(esClient: ElasticsearchClient, agentIds: string[]) {
  const esqlQuery = `FROM ${AGENTS_INDEX} 
    | WHERE \`agent.id\` IN (${agentIds.map((a) => `"${a}"`).join(', ')}) 
    | KEEP \`agent.id\`, \`local_metadata.host.name\`
    | LIMIT ${agentIds.length}`;

  const agentsRes = await esClient.esql.query({
    query: esqlQuery,
  });

  const hostNames = agentsRes.values.reduce((acc: { [key: string]: string }, curr) => {
    if (curr[1]) {
      const agentId = curr[0] as string;
      const hostName = curr[1] as string;
      acc[agentId] = hostName;
    }
    return acc;
  }, {});

  return hostNames;
}

export const hasRolloutPeriodPassed = (source: FleetServerAgentAction) =>
  source.type === 'UPGRADE' && source.rollout_duration_seconds
    ? Date.now() >
      moment(source.start_time ?? Date.now())
        .add(source.rollout_duration_seconds, 'seconds')
        .valueOf()
    : false;

async function getPolicyChangeActions(
  esClient: ElasticsearchClient,
  options: ActionStatusOptions,
  namespace?: string
): Promise<ActionStatus[]> {
  // option.latest is used to fetch recent errors, which policy change actions do not contain
  if (options.latest) {
    return [];
  }

  const dateFilter = options.date
    ? `AND @timestamp >= "${options.date}" AND @timestamp <= "${moment(options.date)
        .add(1, 'days')
        .toISOString()}"`
    : '';

  const esqlQuery = `FROM ${AGENT_POLICY_INDEX} 
    | WHERE revision_idx > 1 AND coordinator_idx == 0 ${dateFilter} ${await namespaceFilterEsql(
    namespace
  )}
  | SORT @timestamp DESC 
  | KEEP revision_idx, @timestamp, policy_id
  | LIMIT ${getPerPage(options)}`;

  interface AgentPolicyRevision {
    policyId: string;
    revision: number;
    timestamp: string;
    agentsAssignedToPolicy: number;
    agentsOnAtLeastThisRevision: number;
  }

  let agentPolicies: { [key: string]: AgentPolicyRevision } = {};

  try {
    const agentPoliciesRes = await esClient.esql.query({
      query: esqlQuery,
    });

    agentPolicies = agentPoliciesRes.values.reduce((acc, curr) => {
      const revision = curr[0] as number;
      const timestamp = curr[1] as string;
      const policyId = curr[2] as string;
      acc[`${policyId}:${revision}`] = {
        policyId,
        revision,
        timestamp,
        agentsAssignedToPolicy: 0,
        agentsOnAtLeastThisRevision: 0,
      };
      return acc;
    }, {} as { [key: string]: AgentPolicyRevision });
  } catch (err) {
    if (err.statusCode === 400 && err.message.includes('Unknown index')) {
      appContextService.getLogger().debug(err);
    }
    throw err;
  }

  let agentsPerPolicyRevisionRes;
  let agentPolicyUpdateActions: ActionStatus[];

  try {
    // can't use ES|QL to replace a child aggregation
    agentsPerPolicyRevisionRes = await esClient.search({
      index: AGENTS_INDEX,
      size: 0,
      // ignore unenrolled agents
      query: {
        bool: { must_not: [{ exists: { field: 'unenrolled_at' } }] },
      },
      aggs: {
        policies: {
          terms: {
            field: 'policy_id',
            size: 10,
          },
          aggs: {
            agents_per_rev: {
              terms: {
                field: 'policy_revision_idx',
                size: 10,
              },
            },
          },
        },
      },
    });
  } catch (err) {
    if (err.statusCode === 404) {
      // .fleet-agents does not yet exist
      appContextService.getLogger().debug(err);
    } else {
      throw err;
    }
  }

  if (!agentsPerPolicyRevisionRes) {
    agentPolicyUpdateActions = Object.entries(agentPolicies).map(
      ([updateKey, updateObj]: [updateKey: string, updateObj: AgentPolicyRevision]) => {
        return {
          actionId: updateKey,
          creationTime: updateObj.timestamp,
          completionTime: updateObj.timestamp,
          type: 'POLICY_CHANGE',
          nbAgentsActioned: updateObj.agentsAssignedToPolicy,
          nbAgentsAck: updateObj.agentsOnAtLeastThisRevision,
          nbAgentsActionCreated: updateObj.agentsAssignedToPolicy,
          nbAgentsFailed: 0,
          status:
            updateObj.agentsAssignedToPolicy === updateObj.agentsOnAtLeastThisRevision
              ? 'COMPLETE'
              : 'IN_PROGRESS',
          policyId: updateObj.policyId,
          revision: updateObj.revision,
        };
      }
    );
    return agentPolicyUpdateActions;
  }

  interface AgentsPerPolicyRev {
    total: number;
    agentsPerRev: Array<{
      revision: number;
      agents: number;
    }>;
  }

  const agentsPerPolicyRevisionMap: { [key: string]: AgentsPerPolicyRev } = (
    agentsPerPolicyRevisionRes.aggregations!.policies as any
  ).buckets.reduce(
    (
      acc: { [key: string]: AgentsPerPolicyRev },
      policyBucket: { key: string; doc_count: number; agents_per_rev: any }
    ) => {
      const policyId = policyBucket.key;
      const policyAgentCount = policyBucket.doc_count;
      if (!acc[policyId])
        acc[policyId] = {
          total: 0,
          agentsPerRev: [],
        };
      acc[policyId].total = policyAgentCount;
      acc[policyId].agentsPerRev = policyBucket.agents_per_rev.buckets.map(
        (agentsPerRev: { key: string; doc_count: number }) => {
          return {
            revision: agentsPerRev.key,
            agents: agentsPerRev.doc_count,
          };
        }
      );
      return acc;
    },
    {}
  );

  Object.values(agentPolicies).forEach((agentPolicyRev) => {
    const agentsPerPolicyRev = agentsPerPolicyRevisionMap[agentPolicyRev.policyId];
    if (agentsPerPolicyRev) {
      agentPolicyRev.agentsAssignedToPolicy = agentsPerPolicyRev.total;
      agentsPerPolicyRev.agentsPerRev.forEach((item) => {
        if (agentPolicyRev.revision <= item.revision) {
          agentPolicyRev.agentsOnAtLeastThisRevision += item.agents;
        }
      });
    }
  });

  agentPolicyUpdateActions = Object.entries(agentPolicies).map(
    ([updateKey, updateObj]: [updateKey: string, updateObj: AgentPolicyRevision]) => {
      return {
        actionId: updateKey,
        creationTime: updateObj.timestamp,
        completionTime: updateObj.timestamp,
        type: 'POLICY_CHANGE',
        nbAgentsActioned: updateObj.agentsAssignedToPolicy,
        nbAgentsAck: updateObj.agentsOnAtLeastThisRevision,
        nbAgentsActionCreated: updateObj.agentsAssignedToPolicy,
        nbAgentsFailed: 0,
        status:
          updateObj.agentsAssignedToPolicy === updateObj.agentsOnAtLeastThisRevision
            ? 'COMPLETE'
            : 'IN_PROGRESS',
        policyId: updateObj.policyId,
        revision: updateObj.revision,
      };
    }
  );

  return agentPolicyUpdateActions;
}
