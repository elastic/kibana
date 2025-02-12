/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import apm from 'elastic-apm-node';
import pMap from 'p-map';

import { partition, uniq } from 'lodash';

import { appContextService } from '../app_context';
import type {
  Agent,
  AgentAction,
  AgentActionType,
  NewAgentAction,
  FleetServerAgentAction,
} from '../../../common/types/models';
import {
  AGENT_ACTIONS_INDEX,
  AGENT_ACTIONS_RESULTS_INDEX,
  SO_SEARCH_LIMIT,
} from '../../../common/constants';
import { AgentActionNotFoundError } from '../../errors';

import { auditLoggingService } from '../audit_logging';

import { getAgentIdsForAgentPolicies } from '../agent_policies/agent_policies_to_agent_ids';

import { getCurrentNamespace } from '../spaces/get_current_namespace';
import { addNamespaceFilteringToQuery } from '../spaces/query_namespaces_filtering';

import { MAX_CONCURRENT_CREATE_ACTIONS } from '../../constants';

import { bulkUpdateAgents } from './crud';

const ONE_MONTH_IN_MS = 2592000000;

export const NO_EXPIRATION = 'NONE';

const SIGNED_ACTIONS: Set<Partial<AgentActionType>> = new Set(['UNENROLL', 'UPGRADE']);

export async function createAgentAction(
  esClient: ElasticsearchClient,
  newAgentAction: NewAgentAction
): Promise<AgentAction> {
  const actionId = newAgentAction.id ?? uuidv4();
  const now = Date.now();
  const timestamp = new Date(now).toISOString();
  const body: FleetServerAgentAction = {
    '@timestamp': timestamp,
    expiration:
      newAgentAction.expiration === NO_EXPIRATION
        ? undefined
        : newAgentAction.expiration ?? new Date(now + ONE_MONTH_IN_MS).toISOString(),
    agents: newAgentAction.agents,
    namespaces: newAgentAction.namespaces,
    action_id: actionId,
    data: newAgentAction.data,
    type: newAgentAction.type,
    start_time: newAgentAction.start_time,
    minimum_execution_duration: newAgentAction.minimum_execution_duration,
    rollout_duration_seconds: newAgentAction.rollout_duration_seconds,
    total: newAgentAction.total,
    traceparent: apm.currentTraceparent,
  };

  const messageSigningService = appContextService.getMessageSigningService();
  if (SIGNED_ACTIONS.has(newAgentAction.type) && messageSigningService) {
    const signedBody = await messageSigningService.sign(body);
    body.signed = {
      data: signedBody.data.toString('base64'),
      signature: signedBody.signature,
    };
  }

  await esClient.create({
    index: AGENT_ACTIONS_INDEX,
    id: uuidv4(),
    document: body,
    refresh: 'wait_for',
  });

  auditLoggingService.writeCustomAuditLog({
    message: `User created Fleet action [id=${actionId}]`,
  });

  return {
    id: actionId,
    ...newAgentAction,
    created_at: timestamp,
  };
}

export async function bulkCreateAgentActions(
  esClient: ElasticsearchClient,
  newAgentActions: NewAgentAction[]
): Promise<AgentAction[]> {
  const actions = newAgentActions.map((newAgentAction) => {
    const id = newAgentAction.id ?? uuidv4();
    return {
      id,
      ...newAgentAction,
    } as AgentAction;
  });

  if (actions.length === 0) {
    return [];
  }

  const messageSigningService = appContextService.getMessageSigningService();

  const fleetServerAgentActions = await pMap(
    actions,
    async (action) => {
      const body: FleetServerAgentAction = {
        '@timestamp': new Date().toISOString(),
        expiration: action.expiration ?? new Date(Date.now() + ONE_MONTH_IN_MS).toISOString(),
        start_time: action.start_time,
        rollout_duration_seconds: action.rollout_duration_seconds,
        agents: action.agents,
        action_id: action.id,
        data: action.data,
        type: action.type,
        traceparent: apm.currentTraceparent,
      };

      if (SIGNED_ACTIONS.has(action.type) && messageSigningService) {
        const signedBody = await messageSigningService.sign(body);
        body.signed = {
          data: signedBody.data.toString('base64'),
          signature: signedBody.signature,
        };
      }

      return [
        {
          create: {
            _id: action.id,
          },
        },
        body,
      ].flat();
    },
    {
      concurrency: MAX_CONCURRENT_CREATE_ACTIONS,
    }
  );

  await esClient.bulk({
    index: AGENT_ACTIONS_INDEX,
    operations: fleetServerAgentActions,
  });

  for (const action of actions) {
    auditLoggingService.writeCustomAuditLog({
      message: `User created Fleet action [id=${action.id}]`,
    });
  }

  return actions;
}

export async function createErrorActionResults(
  esClient: ElasticsearchClient,
  actionId: string,
  errors: Record<Agent['id'], Error>,
  errorMessage: string
) {
  const errorCount = Object.keys(errors).length;
  if (errorCount > 0) {
    appContextService
      .getLogger()
      .info(
        `Writing error action results of ${errorCount} agents. Possibly failed validation: ${errorMessage}.`
      );

    // writing out error result for those agents that have errors, so the action is not going to stay in progress forever
    await bulkCreateAgentActionResults(
      esClient,
      Object.keys(errors).map((agentId) => ({
        agentId,
        actionId,
        error: errors[agentId].message,
      }))
    );
  }
}

export async function bulkCreateAgentActionResults(
  esClient: ElasticsearchClient,
  results: Array<{
    actionId: string;
    agentId: string;
    namespaces?: string[];
    error?: string;
  }>
): Promise<void> {
  if (results.length === 0) {
    return;
  }

  const bulkBody = results.flatMap((result) => {
    const body = {
      '@timestamp': new Date().toISOString(),
      action_id: result.actionId,
      agent_id: result.agentId,
      namespaces: result.namespaces,
      error: result.error,
    };

    return [
      {
        create: {
          _id: uuidv4(),
        },
      },
      body,
    ];
  });

  for (const result of results) {
    auditLoggingService.writeCustomAuditLog({
      message: `User created Fleet action result [id=${result.actionId}]`,
    });
  }

  await esClient.bulk({
    index: AGENT_ACTIONS_RESULTS_INDEX,
    operations: bulkBody,
    refresh: 'wait_for',
  });
}

export async function getAgentActions(esClient: ElasticsearchClient, actionId: string) {
  const res = await esClient.search<FleetServerAgentAction>({
    index: AGENT_ACTIONS_INDEX,
    query: {
      bool: {
        must: [
          {
            term: {
              action_id: actionId,
            },
          },
        ],
      },
    },
    size: SO_SEARCH_LIMIT,
  });

  if (res.hits.hits.length === 0) {
    throw new AgentActionNotFoundError('Action not found');
  }

  const result: FleetServerAgentAction[] = [];

  for (const hit of res.hits.hits) {
    auditLoggingService.writeCustomAuditLog({
      message: `User retrieved Fleet action [id=${hit._source?.action_id}]`,
    });

    result.push({
      ...hit._source,
      id: hit._id,
    });
  }

  return result;
}

export async function getUnenrollAgentActions(
  esClient: ElasticsearchClient
): Promise<FleetServerAgentAction[]> {
  const res = await esClient.search<FleetServerAgentAction>({
    index: AGENT_ACTIONS_INDEX,
    query: {
      bool: {
        must: [
          {
            term: {
              type: 'UNENROLL',
            },
          },
          {
            exists: {
              field: 'agents',
            },
          },
          {
            range: {
              expiration: { gte: new Date().toISOString() },
            },
          },
        ],
      },
    },
    size: SO_SEARCH_LIMIT,
  });

  const result: FleetServerAgentAction[] = [];

  for (const hit of res.hits.hits) {
    auditLoggingService.writeCustomAuditLog({
      message: `User retrieved Fleet action [id=${hit._source?.action_id}]`,
    });

    result.push({
      ...hit._source,
      id: hit._id,
    });
  }

  return result;
}

export async function cancelAgentAction(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  actionId: string
) {
  const currentSpaceId = getCurrentNamespace(soClient);

  const getUpgradeActions = async () => {
    const query = {
      bool: {
        filter: [
          {
            term: {
              action_id: actionId,
            },
          },
        ],
      },
    };
    const res = await esClient.search<FleetServerAgentAction>({
      index: AGENT_ACTIONS_INDEX,
      query: await addNamespaceFilteringToQuery(query, currentSpaceId),
      size: SO_SEARCH_LIMIT,
    });

    if (res.hits.hits.length === 0) {
      throw new AgentActionNotFoundError('Action not found');
    }

    for (const hit of res.hits.hits) {
      auditLoggingService.writeCustomAuditLog({
        message: `User retrieved Fleet action [id=${hit._source?.action_id}]}]`,
      });
    }

    const upgradeActions: FleetServerAgentAction[] = res.hits.hits
      .map((hit) => hit._source as FleetServerAgentAction)
      .filter(
        (action: FleetServerAgentAction | undefined): boolean =>
          !!action && !!action.agents && !!action.action_id && action.type === 'UPGRADE'
      );
    return upgradeActions;
  };

  const cancelActionId = uuidv4();
  const now = new Date().toISOString();

  const cancelledActions: Array<{ agents: string[] }> = [];

  const createAction = async (action: FleetServerAgentAction) => {
    await createAgentAction(esClient, {
      id: cancelActionId,
      type: 'CANCEL',
      namespaces: [currentSpaceId],
      agents: action.agents!,
      data: {
        target_id: action.action_id,
      },
      created_at: now,
      expiration: action.expiration,
    });
    cancelledActions.push({
      agents: action.agents!,
    });
  };

  let upgradeActions = await getUpgradeActions();
  for (const action of upgradeActions) {
    await createAction(action);
  }

  const updateAgentsToHealthy = async (action: FleetServerAgentAction) => {
    appContextService
      .getLogger()
      .info(
        `Moving back ${
          action.agents!.length
        } agents from updating to healthy state after cancel upgrade`
      );
    const errors = {};
    await bulkUpdateAgents(
      esClient,
      action.agents!.map((agentId: string) => ({
        agentId,
        data: {
          upgraded_at: null,
          upgrade_started_at: null,
        },
      })),
      errors
    );
    if (Object.keys(errors).length > 0) {
      appContextService
        .getLogger()
        .info(`Errors while bulk updating agents for cancel action: ${JSON.stringify(errors)}`);
    }
  };

  for (const action of upgradeActions) {
    await updateAgentsToHealthy(action);
  }

  // At the end of cancel, doing one more query on upgrade action to find those docs that were possibly created by a concurrent upgrade action.
  // This is to make sure we cancel all upgrade batches.
  upgradeActions = await getUpgradeActions();
  if (cancelledActions.length < upgradeActions.length) {
    const missingBatches = upgradeActions.filter(
      (upgradeAction) =>
        !cancelledActions.some(
          (cancelled) => upgradeAction.agents && cancelled.agents[0] === upgradeAction.agents[0]
        )
    );
    appContextService.getLogger().debug(`missing batches to cancel: ${missingBatches.length}`);
    if (missingBatches.length > 0) {
      for (const missingBatch of missingBatches) {
        await createAction(missingBatch);
        await updateAgentsToHealthy(missingBatch);
      }
    }
  }

  return {
    created_at: now,
    id: cancelActionId,
    type: 'CANCEL',
  } as AgentAction;
}

async function getAgentActionsByIds(
  esClient: ElasticsearchClient,
  actionIds: string[]
): Promise<string[]> {
  if (actionIds.length === 0) {
    return [];
  }

  const res = await esClient.search<FleetServerAgentAction>({
    index: AGENT_ACTIONS_INDEX,
    query: {
      bool: {
        filter: [
          {
            terms: {
              action_id: actionIds,
            },
          },
        ],
      },
    },
    _source: ['agents', 'total'],
    size: SO_SEARCH_LIMIT,
  });

  if (res.hits.hits.length === 0) {
    appContextService.getLogger().debug(`No agent action found for ids ${actionIds}`);
    return [];
  }

  const result: FleetServerAgentAction[] = [];
  let total = 0;

  for (const hit of res.hits.hits) {
    auditLoggingService.writeCustomAuditLog({
      message: `User retrieved Fleet action [id=${hit._source?.action_id}]`,
    });

    result.push({
      ...hit._source,
      id: hit._id,
    });
    total = hit._source?.total ?? 0;
  }

  const agentIds: string[] = [];
  if (result.length > 0) {
    agentIds.push(...(result.flatMap((a) => a?.agents).filter((agent) => !!agent) as string[]));
  }

  if (agentIds.length < total) {
    const agentIdsFromResults = await getAgentIdsFromResults(esClient, actionIds);
    return uniq([...agentIds, ...agentIdsFromResults]);
  }

  return agentIds;
}

async function getAgentIdsFromResults(
  esClient: ElasticsearchClient,
  actionIds: string[]
): Promise<string[]> {
  try {
    const results = await esClient.search({
      index: AGENT_ACTIONS_RESULTS_INDEX,
      ignore_unavailable: true,
      query: {
        bool: {
          filter: [{ terms: { action_id: actionIds } }, { exists: { field: 'error' } }],
        },
      },
      _source: ['agent_id'],
      size: SO_SEARCH_LIMIT,
    });

    const resultAgentIds = new Set<string>();
    for (const hit of results.hits.hits) {
      resultAgentIds.add((hit._source as any)?.agent_id);
    }
    return Array.from(resultAgentIds);
  } catch (err) {
    if (err.statusCode === 404) {
      // .fleet-actions-results does not yet exist
      appContextService.getLogger().debug(err);
    } else {
      throw err;
    }
  }
  return [];
}

export const getAgentsByActionsIds = async (
  esClient: ElasticsearchClient,
  actionsIds: string[]
) => {
  // There are two types of actions:
  // 1. Agent actions stored in .fleet-actions, with type AgentActionType except 'POLICY_CHANGE'
  // 2. Agent policy actions, generated from .fleet-policies, with actionId `${hit.policy_id}:${hit.revision_idx}`

  const [agentPolicyActionIds, agentActionIds] = partition(
    actionsIds,
    (actionsId) => actionsId.split(':').length > 1
  );

  const agentIds: string[] = await getAgentActionsByIds(esClient, agentActionIds);

  const policyIds = agentPolicyActionIds.map((actionId) => actionId.split(':')[0]);
  const assignedAgentIds = await getAgentIdsForAgentPolicies(esClient, policyIds);
  if (assignedAgentIds.length > 0) {
    agentIds.push(...assignedAgentIds);
  }

  return agentIds;
};

export interface ActionsService {
  getAgent: (
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract,
    agentId: string
  ) => Promise<Agent>;

  cancelAgentAction: (
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract,
    actionId: string
  ) => Promise<AgentAction>;

  createAgentAction: (
    esClient: ElasticsearchClient,
    newAgentAction: Omit<AgentAction, 'id'>
  ) => Promise<AgentAction>;
  getAgentActions: (esClient: ElasticsearchClient, actionId: string) => Promise<any[]>;
}
