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

import { merge, partition, uniq } from 'lodash';

import { appContextService } from '../app_context';
import { agentPolicyService } from '../agent_policy';
import type {
  Agent,
  AgentAction,
  AgentActionType,
  NewAgentAction,
  FleetServerAgentAction,
  SecretReference,
} from '../../../common/types/models';
import {
  AGENT_ACTIONS_INDEX,
  AGENT_ACTIONS_RESULTS_INDEX,
  SO_SEARCH_LIMIT,
  SCHEDULED_UNENROLL_ACTION_ID_PREFIX,
} from '../../../common/constants';
import { AgentActionNotFoundError } from '../../errors';

import { auditLoggingService } from '../audit_logging';

import { getAgentIdsForAgentPolicies } from '../agent_policies/agent_policies_to_agent_ids';

import { getCurrentNamespace } from '../spaces/get_current_namespace';
import { addNamespaceFilteringToQuery } from '../spaces/query_namespaces_filtering';

import { MAX_CONCURRENT_CREATE_ACTIONS } from '../../constants';

import {
  extractAndWriteActionSecrets,
  isActionSecretStorageEnabled,
  toCompiledSecretRef,
} from '../secrets';

import { bulkUpdateAgents } from './crud';

const ONE_MONTH_IN_MS = 2592000000;

export const NO_EXPIRATION = 'NONE';

const SIGNED_ACTIONS: Set<Partial<AgentActionType>> = new Set(['UNENROLL', 'UPGRADE', 'MIGRATE']);

/**
 * Indexes a new action to the .fleet-actions index.
 * Takes any secret data stored within the secrets field, stores it in saved objects,
 * and replaces them in the action data with a reference to the saved objects.
 */
export async function createAgentAction(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  newAgentAction: NewAgentAction
): Promise<AgentAction> {
  const actionId = newAgentAction.id ?? uuidv4();
  const now = Date.now();
  const timestamp = new Date(now).toISOString();

  let data;
  let secretReferences: SecretReference[] | undefined;
  // Store secret values if enabled, otherwise store them as plain text.
  if (await isActionSecretStorageEnabled(esClient, soClient)) {
    const secretsRes = await extractAndWriteActionSecrets({
      action: newAgentAction,
      esClient,
    });
    const mergedData = merge(
      secretsRes.actionWithSecrets.data,
      secretsRes.actionWithSecrets.secrets
    );
    data = transformDataSecrets(mergedData);
    secretReferences = secretsRes.secretReferences;
  } else {
    data = merge(newAgentAction.data, newAgentAction.secrets);
  }

  const body: FleetServerAgentAction = {
    '@timestamp': timestamp,
    expiration:
      newAgentAction.expiration === NO_EXPIRATION
        ? undefined
        : newAgentAction.expiration ?? new Date(now + ONE_MONTH_IN_MS).toISOString(),
    agents: newAgentAction.agents,
    namespaces: newAgentAction.namespaces,
    action_id: actionId,
    data,
    type: newAgentAction.type,
    start_time: newAgentAction.start_time,
    minimum_execution_duration: newAgentAction.minimum_execution_duration,
    rollout_duration_seconds: newAgentAction.rollout_duration_seconds,
    total: newAgentAction.total,
    traceparent: apm.currentTraceparent,
    is_automatic: newAgentAction.is_automatic,
    policyId: newAgentAction.policyId,
    ...(secretReferences?.length && { secret_references: secretReferences }),
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
    message: `${
      newAgentAction.is_automatic ? 'Automatic Upgrade' : 'User'
    } created Fleet action [id=${actionId}]`,
  });

  return {
    id: actionId,
    ...newAgentAction,
    created_at: timestamp,
  };
}

/**
 * Recursively transforms all occurrences of { id: string } objects
 * into `$co.elastic.secret{${id}}`, for any level of nesting.
 */
export function transformDataSecrets<T>(mergedData: T): any {
  if (Array.isArray(mergedData)) {
    return mergedData.map(transformDataSecrets);
  } else if (mergedData && typeof mergedData === 'object') {
    const newMergedData: any = {}; // NewAgentAction.data has any type
    for (const [key, value] of Object.entries(mergedData)) {
      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.keys(value).length === 1 &&
        Object.prototype.hasOwnProperty.call(value, 'id') &&
        typeof value.id === 'string'
      ) {
        newMergedData[key] = toCompiledSecretRef(value.id);
      } else {
        newMergedData[key] = transformDataSecrets(value);
      }
    }
    return newMergedData;
  }
  return mergedData;
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

  const getCancellableActions = async () => {
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

    const cancellableActions: FleetServerAgentAction[] = res.hits.hits
      .map((hit) => hit._source as FleetServerAgentAction)
      .filter(
        (action: FleetServerAgentAction | undefined): boolean =>
          !!action &&
          !!action.agents &&
          !!action.action_id &&
          ['UPGRADE', 'UNENROLL'].includes(action.type as string)
      );
    return cancellableActions;
  };

  const cancelActionId = uuidv4();
  const now = new Date().toISOString();

  const cancelledActions: Array<{ agents: string[]; type: string; policyIds: string[] }> = [];

  const createAction = async (action: FleetServerAgentAction) => {
    await createAgentAction(esClient, soClient, {
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
    // Collect policy IDs from the cancelled agents for UNENROLL actions so we
    // can disable unenroll_timeout on those policies after all batches are done.
    const policyIds: string[] = [];
    if (action.type === 'UNENROLL') {
      const agentsRes = await esClient.search<{ policy_id?: string }>({
        index: '.fleet-agents',
        query: { terms: { _id: action.agents! } },
        _source: ['policy_id'],
        size: action.agents!.length,
      });
      for (const hit of agentsRes.hits.hits) {
        if (hit._source?.policy_id) policyIds.push(hit._source.policy_id);
      }
    }
    cancelledActions.push({
      agents: action.agents!,
      type: action.type as string,
      policyIds,
    });
  };

  let cancellableActions = await getCancellableActions();
  for (const action of cancellableActions) {
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

  for (const action of cancellableActions) {
    if (action.type === 'UPGRADE') {
      await updateAgentsToHealthy(action);
    }
  }

  // At the end of cancel, doing one more query to find docs possibly created by a concurrent action.
  cancellableActions = await getCancellableActions();
  if (cancelledActions.length < cancellableActions.length) {
    const missingBatches = cancellableActions.filter(
      (cancellableAction) =>
        !cancelledActions.some(
          (cancelled) =>
            cancellableAction.agents && cancelled.agents[0] === cancellableAction.agents[0]
        )
    );
    appContextService.getLogger().debug(`missing batches to cancel: ${missingBatches.length}`);
    if (missingBatches.length > 0) {
      for (const missingBatch of missingBatches) {
        await createAction(missingBatch);
        if (missingBatch.type === 'UPGRADE') {
          await updateAgentsToHealthy(missingBatch);
        }
      }
    }
  }

  // The following side-effects only apply when the cancelled action was created by the
  // inactive-unenrollment task (identified by the prefix). Manual UNENROLL cancellations
  // should not affect the scheduled unenrollment setting on the policy.
  if (actionId.startsWith(SCHEDULED_UNENROLL_ACTION_ID_PREFIX)) {
    // Cancel any other pending scheduled batches for the same policies so the entire
    // policy's scheduled unenrollment is cancelled, not just the one batch the user selected.
    // Use the agent IDs already in memory (from the cancelled batches) to scope the search
    // without an extra round-trip through .fleet-agents.
    const cancelledUnenrollAgentIds = new Set(
      cancelledActions.filter((a) => a.type === 'UNENROLL').flatMap((a) => a.agents)
    );
    if (cancelledUnenrollAgentIds.size > 0) {
      await cancelPendingBatches(
        esClient,
        soClient,
        cancelledUnenrollAgentIds,
        actionId,
        currentSpaceId
      );
    }

    // Disable unenroll_timeout on the affected policies so the task does not
    // re-schedule the same agents on the next tick.
    const unenrollPolicyIds = uniq(
      cancelledActions.filter((a) => a.type === 'UNENROLL').flatMap((a) => a.policyIds)
    );
    if (unenrollPolicyIds.length > 0) {
      const esClientForPolicy = appContextService.getInternalUserESClient();
      for (const policyId of unenrollPolicyIds) {
        try {
          await agentPolicyService.update(soClient, esClientForPolicy, policyId, {
            unenroll_timeout: 0,
          });
          auditLoggingService.writeCustomAuditLog({
            message: `Disabled unenroll_timeout on agent policy [id=${policyId}] after user cancelled inactive unenrollment action [id=${actionId}]`,
          });
        } catch (err) {
          appContextService
            .getLogger()
            .warn(
              `Failed to disable unenroll_timeout on policy ${policyId} after cancel: ${err.message}`
            );
        }
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

async function cancelPendingBatches(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  cancelledAgentIds: Set<string>,
  alreadyCancelledActionId: string,
  currentSpaceId: string
) {
  const currentTime = new Date().toISOString();

  // Query all pending scheduled batches by prefix + future start_time, excluding the
  // action already cancelled. No round-trip through .fleet-agents is needed: we intersect
  // in-memory against the agent IDs collected from the batches we just cancelled.
  const pendingRes = await esClient.search<FleetServerAgentAction>({
    index: AGENT_ACTIONS_INDEX,
    ignore_unavailable: true,
    query: {
      bool: {
        filter: [
          { term: { type: 'UNENROLL' } },
          { range: { start_time: { gt: currentTime } } },
          { prefix: { action_id: SCHEDULED_UNENROLL_ACTION_ID_PREFIX } },
        ],
        must_not: [{ term: { action_id: alreadyCancelledActionId } }],
      },
    },
    size: SO_SEARCH_LIMIT,
  });

  const seen = new Set<string>([alreadyCancelledActionId]);
  for (const hit of pendingRes.hits.hits) {
    const pendingAction = hit._source;
    if (!pendingAction?.action_id || seen.has(pendingAction.action_id)) continue;
    // Only cancel batches that share at least one agent with the already-cancelled batches,
    // which scopes this to the same policy without a round-trip through .fleet-agents.
    if (!pendingAction.agents?.some((id) => cancelledAgentIds.has(id))) continue;
    seen.add(pendingAction.action_id);
    await createAgentAction(esClient, soClient, {
      id: uuidv4(),
      type: 'CANCEL',
      namespaces: [currentSpaceId],
      agents: pendingAction.agents!,
      data: { target_id: pendingAction.action_id },
      created_at: currentTime,
      expiration: pendingAction.expiration,
    });
    appContextService
      .getLogger()
      .debug(
        `[cancelAgentAction] Also cancelled pending scheduled unenrollment batch ${pendingAction.action_id} for same policies`
      );
  }
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
    soClient: SavedObjectsClientContract,
    newAgentAction: Omit<AgentAction, 'id'>
  ) => Promise<AgentAction>;
  getAgentActions: (esClient: ElasticsearchClient, actionId: string) => Promise<any[]>;
}
