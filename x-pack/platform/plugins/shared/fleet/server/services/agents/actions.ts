/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type {
  QueryDslQueryContainer,
  SearchHit,
  SearchResponse,
  SortResults,
} from '@elastic/elasticsearch/lib/api/types';
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

const SIGNED_ACTIONS: Set<Partial<AgentActionType>> = new Set([
  'UNENROLL',
  'UPGRADE',
  'MIGRATE',
  'RESTART',
]);

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

  const res = await esClient.bulk({
    index: AGENT_ACTIONS_RESULTS_INDEX,
    operations: bulkBody,
    refresh: 'wait_for',
  });

  // A bulk reports per item failures in its response rather than throwing, so a write that only
  // partly landed would otherwise read as complete. This is surfaced rather than thrown: callers
  // write these results for a whole batch at once, and failing the batch would have it rewrite the
  // results that did land, counting those agents twice. The callers that depend on a result being
  // present read it back before acting on it instead.
  if (res.errors) {
    const failures = res.items
      .map((item) => item.create ?? item.index)
      .filter((item) => item?.error)
      .map((item) => `${item!._id}: ${item!.error?.reason}`);
    if (failures.length > 0) {
      appContextService
        .getLogger()
        .error(
          `Failed to write ${failures.length} of ${
            results.length
          } agent action results: ${failures.join(', ')}`
        );
    }
  }
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

/**
 * Ceiling on how many action documents one page of {@link collectAgentIdsFromActions} asks for. A
 * page is usually smaller than this: once the caller says how many agents a document is expected to
 * name, the page is sized to the ids still wanted instead. That makes the read fall back to paging
 * under a point in time sooner than a flat document count would — an action whose documents name
 * far fewer agents than the caller expected fills a small page and escalates — which costs round
 * trips rather than correctness, and is the price of not asking for a response of unbounded size.
 */
const ACTION_DOCS_PAGE_SIZE = 1000;

/**
 * Keep alive for the point in time {@link getAgentIdsFromActions} pages with, when it needs one.
 *
 * Deliberately shorter than the runner's `PIT_KEEP_ALIVE`, and for a different reason: the runner
 * actions a whole batch of agents between two of its searches, so its point in time has to survive
 * work of unbounded duration, which is exactly what the 1m default broke. Nothing happens between
 * two pages of this read but collecting ids into a set, so what it has to survive is one search
 * round trip. If it does expire the next page 404s, which fails the batch and is retried — it
 * cannot hang the action the way the runner's expiring did.
 */
const ACTION_DOCS_PIT_KEEP_ALIVE = '2m';

/**
 * Matches an action's own documents and, when it writes some under generated ids of its own, those
 * too.
 *
 * Composite action ids and the prefix query that reads them back are established in
 * `.fleet-actions`, where scheduled unenroll already does both. `.fleet-actions-results` has no
 * such precedent, but the requirement is the same one its sibling `action_id` already meets there:
 * a keyword mapping, which `action_status.ts` depends on to aggregate the field.
 */
const actionIdQuery = (actionIds: string[], actionIdPrefix?: string): QueryDslQueryContainer => {
  const should: QueryDslQueryContainer[] = [];
  if (actionIds.length > 0) {
    should.push({ terms: { action_id: actionIds } });
  }
  if (actionIdPrefix) {
    should.push({ prefix: { action_id: actionIdPrefix } });
  }
  return { bool: { should, minimum_should_match: 1 } };
};

/** Collects a page's agent ids, stopping at `limit`. Returns whether the limit has been reached. */
const collectAgentIds = (
  hits: Array<SearchHit<Pick<FleetServerAgentAction, 'agents'>>>,
  agentIds: Set<string>,
  limit: number
): boolean => {
  for (const hit of hits) {
    for (const agentId of hit._source?.agents ?? []) {
      if (agentIds.size >= limit) {
        return true;
      }
      agentIds.add(agentId);
    }
  }
  return agentIds.size >= limit;
};

/**
 * Every agent id named by the action documents of the given action ids, for deduplicating the work
 * of a bulk action that is being retried or resumed.
 *
 * Unlike {@link getAgentActions} this is a complete read: it pages rather than truncating at the
 * first `size`, since an action run with a small `batchSize` writes one document per batch and can
 * hold many more than a single page. A truncated read would silently action agents twice. It also
 * tolerates a missing index — `.fleet-actions` is created by Fleet Server, so a deployment whose
 * first ever action fails before writing a document does not have it yet — and does not audit log,
 * being an internal read rather than a user retrieving actions.
 *
 * `since` restricts the read to documents written at or after that timestamp, so a caller holding
 * the ids of an earlier read can top it up cheaply instead of re-reading everything. Action
 * documents are only ever created, never updated, so the union of such reads is exact as long as
 * the windows overlap.
 *
 * Ids are collected into `agentIds`, which the caller owns, so that a top-up spends its budget on
 * what it does not already have: the overlapping refresh window means most of what a top-up reads
 * is already there, and counting those against a limit of its own would let a nearly full set stop
 * paging before reaching the documents it has never seen.
 *
 * `actionIdPrefix` additionally matches the action documents whose id starts with it, which is how
 * an action whose documents are written under generated ids of its own finds them without having
 * recorded them anywhere.
 *
 * `limit` stops the read — collecting and paging both — once `agentIds` holds that many. It is the
 * caller's memory bound, so it has to be honoured here rather than applied to the result: an
 * action that has touched a million agents would otherwise be a million ids and the documents
 * naming them held at once, whatever the caller then did with them. `agentsPerDocument` is how the
 * caller says how many agents one document is expected to name — the action's batch size — so that
 * a page of documents can be sized to the ids still wanted rather than to a document count, which
 * says nothing about how big the response will be.
 */
export async function collectAgentIdsFromActions(
  esClient: ElasticsearchClient,
  actionIds: string[],
  agentIds: Set<string>,
  options: {
    since?: string;
    limit?: number;
    agentsPerDocument?: number;
    actionIdPrefix?: string;
  } = {}
): Promise<void> {
  const limit = options.limit ?? Infinity;
  if ((actionIds.length === 0 && !options.actionIdPrefix) || agentIds.size >= limit) {
    return;
  }
  const agentsPerDocument = Math.max(1, options.agentsPerDocument ?? 1);
  const pageSize = () =>
    Math.max(
      1,
      Math.min(
        ACTION_DOCS_PAGE_SIZE,
        limit === Infinity
          ? ACTION_DOCS_PAGE_SIZE
          : Math.ceil((limit - agentIds.size) / agentsPerDocument)
      )
    );

  const filter: QueryDslQueryContainer[] = [actionIdQuery(actionIds, options.actionIdPrefix)];
  if (options.since) {
    filter.push({ range: { '@timestamp': { gte: options.since } } });
  }
  const search = {
    query: { bool: { filter } },
    _source: ['agents'],
    track_total_hits: false,
    sort: [{ '@timestamp': 'asc' as const }],
  };

  // One plain search covers an action whose documents fit in a page, which is the common case, and
  // `ignore_unavailable` is what turns a missing index into zero hits rather than a 404.
  const firstPageSize = pageSize();
  const firstPage = await esClient.search<Pick<FleetServerAgentAction, 'agents'>>({
    index: AGENT_ACTIONS_INDEX,
    ignore_unavailable: true,
    ...search,
    size: firstPageSize,
  });
  const reachedLimit = collectAgentIds(firstPage.hits.hits, agentIds, limit);
  if (reachedLimit || firstPage.hits.hits.length < firstPageSize) {
    return;
  }

  // A full page may have more behind it. Page through it all again under a point in time, which is
  // what makes `search_after` a complete read: it pins the index and gives the non-unique
  // `@timestamp` sort a `_shard_doc` tiebreaker, so no document is skipped at a page boundary.
  //
  // Nothing here is wrapped in `retryTransientEsErrors`, unlike `crud.ts`'s `openPointInTime`: a
  // caller of this is deduplicating a batch it is about to action, and failing that batch hands the
  // retry to the runner's own retry loop, which is a better place to wait than inside a read that
  // the batch is blocked on.
  //
  // The ids the first page produced are kept rather than cleared: this pages the same query from
  // the beginning, so re-reading them adds nothing to a set that already holds them.
  let pitId = (
    await esClient.openPointInTime({
      index: AGENT_ACTIONS_INDEX,
      keep_alive: ACTION_DOCS_PIT_KEEP_ALIVE,
    })
  ).id;
  try {
    let searchAfter: SortResults | undefined;
    for (;;) {
      const size = pageSize();
      const page: SearchResponse<Pick<FleetServerAgentAction, 'agents'>> = await esClient.search({
        ...search,
        size,
        pit: { id: pitId, keep_alive: ACTION_DOCS_PIT_KEEP_ALIVE },
        ...(searchAfter ? { search_after: searchAfter } : {}),
      });
      pitId = page.pit_id ?? pitId;
      const { hits } = page.hits;
      if (collectAgentIds(hits, agentIds, limit) || hits.length < size) {
        return;
      }
      searchAfter = hits[hits.length - 1].sort;
    }
  } finally {
    await esClient
      .closePointInTime({ id: pitId })
      .catch((error) =>
        appContextService
          .getLogger()
          .debug(`Could not close the point in time of an action documents read: ${error.message}`)
      );
  }
}

interface AgentIdsWithResultsAggregation {
  agent_ids: { buckets: Array<{ key: string }> };
}

/**
 * Which of the given agents have no result yet under any of the given action ids, so that results
 * are not written twice for an agent that already has one, and so that an agent an action has
 * already dealt with is recognised even when no action document names it.
 */
export async function getAgentsWithoutActionResults(
  esClient: ElasticsearchClient,
  actionIds: string[],
  agentIds: string[],
  options: { actionIdPrefix?: string } = {}
): Promise<string[]> {
  if (agentIds.length === 0 || (actionIds.length === 0 && !options.actionIdPrefix)) {
    return [];
  }
  try {
    // Aggregated rather than paged through as hits. One agent can hold several results — the
    // documents carry generated ids, so a retry can write a second one, and an agent can have one
    // under more than one of the given action ids — so a page of `agentIds.length` hits can be
    // filled by duplicates of a few agents and hide the results of the rest, which is exactly the
    // conclusion this draws: "no result" means it is about to write one. A terms aggregation whose
    // size is the number of agents asked about cannot miss a bucket, since the query already
    // restricts it to those agents.
    //
    // This needs `agent_id` to be aggregatable. Fleet Server owns the mapping of this index, so
    // nothing here can assert it, but `action_status.ts` already aggregates on the sibling
    // `action_id` and `uploads.ts` runs an exact term on `agent_id`, both of which need a keyword.
    const res = await esClient.search<unknown, AgentIdsWithResultsAggregation>({
      index: AGENT_ACTIONS_RESULTS_INDEX,
      query: {
        bool: {
          must: [
            actionIdQuery(actionIds, options.actionIdPrefix),
            { terms: { agent_id: agentIds } },
          ],
        },
      },
      size: 0,
      track_total_hits: false,
      aggs: {
        agent_ids: {
          terms: { field: 'agent_id', size: agentIds.length },
        },
      },
    });
    const agentIdsWithResults = new Set(
      res.aggregations?.agent_ids.buckets.map(({ key }) => key) ?? []
    );
    return agentIds.filter((agentId) => !agentIdsWithResults.has(agentId));
  } catch (err) {
    if (err.statusCode === 404) {
      // .fleet-actions-results does not yet exist
      appContextService.getLogger().debug(err);
    } else {
      throw err;
    }
  }
  return agentIds;
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
