/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';
import type {
  QueryDslQueryContainer,
  UpdateByQueryRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { v4 as uuidv4 } from 'uuid';
import { uniq } from 'lodash';
import { fromKueryExpression, nodeTypes, toElasticsearchQuery } from '@kbn/es-query';
import type { KueryNode } from '@kbn/es-query';

import type { Agent } from '../../types';

import { AGENTS_INDEX } from '../../constants';

import { appContextService } from '../app_context';
import { agentsNamespaceQuery } from '../spaces/agent_namespaces';

import { FleetError, FleetVersionConflictError, UpdateByQueryCancelledError } from '../../errors';

import { ActionRunner } from './action_runner';
import { removeSOAttributes } from './crud';

import { BulkActionTaskType } from './bulk_action_types';
import { filterHostedPolicies } from './filter_hosted_agents';
import {
  bulkCreateAgentActionResults,
  createAgentAction,
  createErrorActionResults,
} from './actions';
import { MAX_RETRY_COUNT } from './retry_helper';
import { updateByQueryAndWait } from './update_by_query_task';

/**
 * How many times the update of a batch is run when it keeps being cancelled for running too long.
 * It stops there, as a batch that is too slow twice is not going to get through on a third try.
 */
const UPDATE_BY_QUERY_MAX_ATTEMPTS = 2;

/** The tag a clause of a kuery is about, when it is `tags:<tag>` for one whole tag. */
const tagOfClause = (node: KueryNode): string | undefined => {
  const [field, value] = node.arguments ?? [];
  return node.function === 'is' &&
    field?.type === 'literal' &&
    field.value === 'tags' &&
    value?.type === 'literal'
    ? String(value.value)
    : undefined;
};

const notClause = (clause: KueryNode): KueryNode => ({
  type: 'function',
  function: 'not',
  arguments: [clause],
});

/**
 * A clause of a kuery, made of conditions on the tags only, that every agent the update has just
 * changed fails, or `undefined` if there is none. Such an agent has every tag the update adds, and
 * none that it removes (unless it also adds it), which settles a clause on the `tags` field for
 * those tags, and with `not`, `and` and `or` the clauses around it. Everything else, another
 * field, a wildcard, a tag the update does not touch, settles nothing.
 *
 * It is the smallest such clause, so that it can be run on its own: it holds nothing else of the
 * kuery, which can have conditions that only the search of the agents knows how to run.
 */
const clauseUpdatedAgentsFail = (
  node: KueryNode | undefined,
  tagsToAdd: Set<string>,
  tagsToRemove: Set<string>
): KueryNode | undefined => {
  if (node?.type !== 'function') {
    return undefined;
  }
  const args: KueryNode[] = node.arguments ?? [];
  const fail = (arg: KueryNode | undefined) =>
    clauseUpdatedAgentsFail(arg, tagsToAdd, tagsToRemove);

  switch (node.function) {
    case 'is': {
      const tag = tagOfClause(node);
      return tag !== undefined && tagsToRemove.has(tag) && !tagsToAdd.has(tag) ? node : undefined;
    }
    case 'not': {
      const meet = clauseUpdatedAgentsMeet(args[0], tagsToAdd, tagsToRemove);
      return meet && notClause(meet);
    }
    case 'and':
      return args.map(fail).find((clause) => clause !== undefined);
    case 'or': {
      const clauses = args.map(fail);
      return clauses.length > 0 && clauses.every((clause) => clause !== undefined)
        ? { type: 'function', function: 'or', arguments: clauses }
        : undefined;
    }
    default:
      return undefined;
  }
};

/** The same for a clause that every agent the update has just changed meets. */
const clauseUpdatedAgentsMeet = (
  node: KueryNode | undefined,
  tagsToAdd: Set<string>,
  tagsToRemove: Set<string>
): KueryNode | undefined => {
  if (node?.type !== 'function') {
    return undefined;
  }
  const args: KueryNode[] = node.arguments ?? [];
  const meet = (arg: KueryNode | undefined) =>
    clauseUpdatedAgentsMeet(arg, tagsToAdd, tagsToRemove);

  switch (node.function) {
    case 'is': {
      const [field, value] = args;
      if (field?.type !== 'literal' || field.value !== 'tags') {
        return undefined;
      }
      if (value?.type === 'wildcard') {
        // An updated agent has every tag the update adds, so a wildcard is met when one of them
        // matches it: adding `prod*` makes the agent match `tags:prod*`, which is what a tag with
        // a wildcard in it does to the clause `updateAgentTags` adds. For a tag the update removes
        // it settles nothing, as the agent can have another tag that matches.
        return [...tagsToAdd].some((tag) => nodeTypes.wildcard.test(value, tag)) ? node : undefined;
      }
      const tag = tagOfClause(node);
      return tag !== undefined && tagsToAdd.has(tag) ? node : undefined;
    }
    case 'not': {
      const fail = clauseUpdatedAgentsFail(args[0], tagsToAdd, tagsToRemove);
      return fail && notClause(fail);
    }
    case 'and': {
      const clauses = args.map(meet);
      return clauses.length > 0 && clauses.every((clause) => clause !== undefined)
        ? { type: 'function', function: 'and', arguments: clauses }
        : undefined;
    }
    case 'or':
      return args.map(meet).find((clause) => clause !== undefined);
    default:
      return undefined;
  }
};

/**
 * The clause of the kuery of an update tags action that the retry of the action leaves the agents
 * the update already changed out with, or `undefined` if it does not leave them out.
 *
 * The retry restarts behind the action's kuery, so it leaves them out when they can no longer match
 * it. That is what the kuery is read for, and not the number of tags the update adds or removes:
 * for an update of one tag `updateAgentTags` adds `(NOT (tags:x))` or `(tags:x)` to it, but a tag
 * with a wildcard in it, `prod*`, makes that a wildcard clause that an agent with another tag, like
 * `production`, still matches. The tag rename in the UI searches for the agents that have the old
 * tag, which the renamed agents no longer have. The kuery is read as the search of the agents reads
 * it, and there is a clause only when the tags it names, whole, and only in the places that decide
 * it, show that an updated agent does not match.
 *
 * With the clause, the agents of a batch that were updated are the ones that fail it, wherever the
 * update stopped: it is what the retry leaves out. It is only used for a batch that is cancelled
 * on every run, as nothing else would record them. Whatever the kuery does not settle (another
 * field, a wildcard, a tag the update does not touch) gives no clause, and nothing is recorded
 * then. For an `or` of a clause on the tags and one that does not settle, the retry leaves out
 * some of the agents that were updated and not others, and no count is right for that.
 */
export const updatedAgentsClause = (
  tagsToAdd: string[] = [],
  tagsToRemove: string[] = [],
  kuery: string = ''
): KueryNode | undefined => {
  if (kuery.trim() === '') {
    return undefined;
  }
  try {
    return clauseUpdatedAgentsFail(
      fromKueryExpression(removeSOAttributes(kuery)),
      new Set(tagsToAdd),
      new Set(tagsToRemove)
    );
  } catch (error) {
    // Not a kuery that can be read, so there is nothing in it to leave agents out.
    return undefined;
  }
};

export class UpdateAgentTagsActionRunner extends ActionRunner {
  protected async processAgents(agents: Agent[]): Promise<{ actionId: string }> {
    return await updateTagsBatch(
      this.soClient,
      this.esClient,
      agents,
      {},
      {
        tagsToAdd: this.actionParams?.tagsToAdd,
        tagsToRemove: this.actionParams?.tagsToRemove,
        updatedAgentsClause: updatedAgentsClause(
          this.actionParams?.tagsToAdd,
          this.actionParams?.tagsToRemove,
          this.actionParams?.kuery
        ),
        actionId: this.actionParams.actionId,
        total: this.actionParams.total,
        spaceId: this.actionParams.spaceId,
      }
    );
  }

  protected getTaskType() {
    return BulkActionTaskType.UPDATE_AGENT_TAGS_RETRY;
  }

  protected getActionType() {
    return 'UPDATE_TAGS';
  }
}

export async function updateTagsBatch(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  givenAgents: Agent[],
  outgoingErrors: Record<Agent['id'], Error>,
  options: {
    tagsToAdd: string[];
    tagsToRemove: string[];
    actionId?: string;
    total?: number;
    kuery?: string;
    retryCount?: number;
    spaceId?: string;
    /** See {@link updatedAgentsClause}: only used for a batch that is cancelled on every run. */
    updatedAgentsClause?: KueryNode;
  }
): Promise<{ actionId: string; updated?: number; took?: number }> {
  // Only the restriction errors of agents the caller can access are persisted in the action results.
  // `outgoingErrors` (for example agents not found, or in another space) are deliberately not
  // published, as the action status enrichment would expose their hostnames across spaces.
  const errors: Record<Agent['id'], Error> = {};
  const hostedAgentError = `Cannot modify tags on a hosted agent`;

  const filteredAgents = await filterHostedPolicies(
    soClient,
    givenAgents,
    errors,
    hostedAgentError,
    `Cannot modify tags on a managed agent`
  );
  const agentIds = filteredAgents.map((agent) => agent.id);

  const actionId = options.actionId ?? uuidv4();
  const spaceId = options.spaceId;
  const namespaces = spaceId ? [spaceId] : [];
  // agents that failed validation (hosted, agentless): reported in the action results
  const errorAgentIds = Object.keys(errors);

  if (agentIds.length === 0) {
    appContextService.getLogger().debug('No agents to update tags, returning');
    if (errorAgentIds.length > 0) {
      await createAgentAction(esClient, soClient, {
        id: actionId,
        agents: errorAgentIds,
        namespaces,
        created_at: new Date().toISOString(),
        type: 'UPDATE_TAGS',
        total: options.total ?? errorAgentIds.length,
      });
      await createErrorActionResults(
        esClient,
        actionId,
        errors,
        'agent is not eligible for tags update'
      );
    }
    return { actionId, updated: 0, took: 0 };
  }

  appContextService
    .getLogger()
    .debug(
      `Agents to update tags in batch: ${agentIds.length}, tagsToAdd: ${options.tagsToAdd}, tagsToRemove: ${options.tagsToRemove}`
    );

  // creating unique ids to use as agentId, as we don't have all agent ids in case of action by kuery
  const getUuidArray = (count: number) => Array.from({ length: count }, () => uuidv4());

  // The agents were in the caller's space when they were selected. The update can run for minutes,
  // and again after being cancelled, so it checks the space itself too: an agent that has moved out
  // of it in the meantime is left alone, and recorded below as not updated.
  const namespaceQuery = await agentsNamespaceQuery(spaceId);
  const idsQuery = { terms: { _id: agentIds } };
  // Every document the update writes gets this time as its `updated_at`, and the runs of the batch
  // share it, so it marks the agents that this action wrote.
  const updatedAt = new Date().toISOString();

  const request: UpdateByQueryRequest = {
    query: namespaceQuery ? { bool: { filter: [idsQuery, namespaceQuery] } } : idsQuery,
    index: AGENTS_INDEX,
    refresh: true,
    script: {
      source: `
      if (ctx._source.tags == null) {
        ctx._source.tags = [];
      }
      if (params.tagsToAdd.length == 1 && params.tagsToRemove.length == 1) {
        ctx._source.tags.replaceAll(tag -> params.tagsToRemove[0] == tag ? params.tagsToAdd[0] : tag);
      } else {
        ctx._source.tags.removeAll(params.tagsToRemove);
      }
      ctx._source.tags.addAll(params.tagsToAdd);

      LinkedHashSet uniqueSet = new LinkedHashSet();
      uniqueSet.addAll(ctx._source.tags);

      ctx._source.tags = uniqueSet.toArray();

      ctx._source.updated_at = params.updatedAt;
      `,
      lang: 'painless',
      params: {
        tagsToAdd: uniq(options.tagsToAdd),
        tagsToRemove: uniq(options.tagsToRemove),
        updatedAt,
      },
    },
    conflicts: 'proceed', // relying on the task to retry in case of conflicts - retry only conflicted agents
  };

  // The update is cancelled when it runs for too long, and then it has updated some of the agents.
  // Which of them a retry selected by the action's kuery would leave out depends on that kuery,
  // and for one that mixes the tags with other clauses it is only some of them. So the same agents
  // are updated again, which updates all of them, and counts each of them once. What the
  // cancelled run did is not recorded.
  let res;
  for (let attempt = 1; ; attempt++) {
    try {
      res = await updateByQueryAndWait(esClient, request);
    } catch (error) {
      // a FleetError has no enumerable fields, JSON.stringify would drop its message
      const details = error instanceof FleetError ? error.message : JSON.stringify(error);
      throw new FleetError('Caught error while batch updating tags: ' + details.slice(0, 1000));
    }

    if (!res.canceled) {
      break;
    }

    const cancelled = `Update by query cancelled (${res.canceled}) after updating ${
      res.updated ?? 0
    } of ${res.total ?? 'an unknown number of'} agents`;
    if (attempt >= UPDATE_BY_QUERY_MAX_ATTEMPTS) {
      // Nothing more is run for this batch here, and the retry of the action restarts behind its
      // kuery. What the cancelled run did is recorded now when that retry leaves it out, as it
      // would not be recorded at all: the agents it updated. The agents that failed are not
      // updated, so the retry runs them again, and they are recorded when there is no retry left
      // to do that, and logged until then.
      const failures = res.failures ?? [];
      let recordedUpdatedIds: string[] = [];
      if (options.updatedAgentsClause) {
        // The agents that the runs updated between them are the ones that fail the clause and that
        // this action wrote, and those are the agents the retry leaves out. The runs do not tell:
        // the second one does not go through the documents in the order of the first, as the ones
        // that were updated are written again, so neither the larger of their counts nor their sum
        // is the number. Failing the clause is not evidence of a write by this action alone, as
        // another update can take the tag off an agent that neither run reached, so the agents also
        // have to carry the `updated_at` that the runs write.
        //
        // The retry leaves them out only if it sees what the updates wrote. A cancelled update by
        // query does not refresh, whatever its `refresh` is, so it is done here, before the count
        // and before the retry can be scheduled. Without it the retry could select agents that are
        // recorded.
        await esClient.indices.refresh({ index: AGENTS_INDEX });
        const { count } = await esClient.count({
          index: AGENTS_INDEX,
          query: {
            bool: {
              filter: [
                request.query as QueryDslQueryContainer,
                { term: { updated_at: updatedAt } },
              ],
              must_not: [toElasticsearchQuery(options.updatedAgentsClause)],
            },
          },
        });
        recordedUpdatedIds = getUuidArray(count);
      }
      const recordedFailures = options.retryCount === MAX_RETRY_COUNT ? failures : [];
      if (recordedUpdatedIds.length > 0 || recordedFailures.length > 0) {
        await createAgentAction(esClient, soClient, {
          id: actionId,
          agents: recordedUpdatedIds.concat(recordedFailures.map((failure) => failure.id)),
          namespaces,
          created_at: new Date().toISOString(),
          type: 'UPDATE_TAGS',
          total:
            options.total ??
            (res.total !== undefined ? res.total + errorAgentIds.length : undefined),
        });
        if (recordedUpdatedIds.length > 0) {
          await bulkCreateAgentActionResults(
            esClient,
            recordedUpdatedIds.map((id) => ({ agentId: id, actionId, namespaces }))
          );
        }
        if (recordedFailures.length > 0) {
          await bulkCreateAgentActionResults(
            esClient,
            recordedFailures.map((failure) => ({
              agentId: failure.id,
              actionId,
              namespace: spaceId,
              error: failure.cause.reason ?? undefined,
            }))
          );
        }
      }
      if (failures.length > recordedFailures.length) {
        appContextService
          .getLogger()
          .warn(
            `Update by query of action ${actionId} failed for ${
              failures.length
            } agents: ${JSON.stringify(failures).slice(0, 1000)}`
          );
      }
      throw new UpdateByQueryCancelledError(`${cancelled}, giving up after ${attempt} attempts`);
    }
    appContextService
      .getLogger()
      .warn(`${cancelled}, running it again for the same ${agentIds.length} agents`);
  }

  if (appContextService.getLogger().isLevelEnabled('debug')) {
    appContextService.getLogger().debug(JSON.stringify(res).slice(0, 1000));
  }

  // The agents the update did not go through were moved out of the space, or deleted, after they
  // were selected. They are not updated or failed, but the action counts them in its total, so
  // without a result of their own it would never reach it. There are as many as the update went
  // through fewer agents than the batch has: what the task says, and not a later search, which
  // reads another snapshot and could find an agent that came back, or miss one that left after it
  // was updated. They are recorded under generated ids, like the agents that were updated, as an
  // id of an agent that is in another space now would show its hostname in this one.
  const skippedAgentIds = getUuidArray(
    res.total !== undefined ? Math.max(0, new Set(agentIds).size - res.total) : 0
  );

  const updatedCount = res.updated ?? 0;
  const updatedIds = getUuidArray(updatedCount);

  const failures = res.failures ?? [];
  const failureCount = failures.length;

  const isLastRetry = options.retryCount === MAX_RETRY_COUNT;

  const versionConflictCount = res.version_conflicts ?? 0;
  const versionConflictIds = isLastRetry ? getUuidArray(versionConflictCount) : [];

  // creating an action doc so that update tags  shows up in activity
  // the logic only saves agent count in the action that updated, failed or in case of last retry, conflicted
  // this ensures that the action status count will be accurate
  await createAgentAction(esClient, soClient, {
    id: actionId,
    agents: updatedIds
      .concat(failures.map((failure) => failure.id))
      .concat(isLastRetry ? versionConflictIds : [])
      .concat(errorAgentIds)
      .concat(skippedAgentIds),
    namespaces,
    created_at: new Date().toISOString(),
    type: 'UPDATE_TAGS',
    total:
      options.total ??
      (res.total !== undefined
        ? res.total + errorAgentIds.length + skippedAgentIds.length
        : undefined),
  });
  await createErrorActionResults(
    esClient,
    actionId,
    errors,
    'agent is not eligible for tags update'
  );
  appContextService
    .getLogger()
    .debug(
      `action doc wrote on ${
        updatedCount + failureCount + (isLastRetry ? versionConflictCount : 0)
      } agentIds, updated: ${updatedCount}, failed: ${failureCount}, version_conflicts: ${versionConflictCount}`
    );

  if (skippedAgentIds.length > 0) {
    await bulkCreateAgentActionResults(
      esClient,
      skippedAgentIds.map((agentId) => ({
        agentId,
        actionId,
        namespace: spaceId,
        error: 'agent not found, or not in the space of the action anymore',
      }))
    );
    appContextService
      .getLogger()
      .debug(`action skipped result wrote on ${skippedAgentIds.length} agents`);
  }

  // writing successful action results
  if (updatedCount > 0) {
    await bulkCreateAgentActionResults(
      esClient,
      updatedIds.map((id) => ({
        agentId: id,
        actionId,
        namespaces,
      }))
    );
    appContextService.getLogger().debug(`action updated result wrote on ${updatedCount} agents`);
  }

  // writing failures from es update
  if (failures.length > 0) {
    await bulkCreateAgentActionResults(
      esClient,
      failures.map((failure) => ({
        agentId: failure.id,
        actionId,
        namespace: spaceId,
        error: failure.cause.reason ?? undefined, // reason can be null and we want to replace it with undefined
      }))
    );
    appContextService.getLogger().debug(`action failed result wrote on ${failureCount} agents`);
  }

  if (versionConflictCount > 0) {
    // write out error results on last retry, so action is not stuck in progress
    if (options.retryCount === MAX_RETRY_COUNT) {
      await bulkCreateAgentActionResults(
        esClient,
        versionConflictIds.map((id) => ({
          agentId: id,
          actionId,
          namespace: spaceId,
          error: 'version conflict on last retry',
        }))
      );
      appContextService
        .getLogger()
        .debug(`action conflict result wrote on ${versionConflictCount} agents`);
    }
    throw new FleetVersionConflictError(`Version conflict of ${versionConflictCount} agents`);
  }

  return { actionId, updated: res.updated, took: res.took };
}
