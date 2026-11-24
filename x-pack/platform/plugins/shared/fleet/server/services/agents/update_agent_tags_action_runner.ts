/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';
import type { UpdateByQueryRequest } from '@elastic/elasticsearch/lib/api/types';
import { v4 as uuidv4 } from 'uuid';
import { uniq } from 'lodash';

import type { Agent } from '../../types';

import { AGENTS_INDEX } from '../../constants';

import { appContextService } from '../app_context';
import { agentsNamespaceQuery } from '../spaces/agent_namespaces';

import { FleetError, FleetVersionConflictError, UpdateByQueryIncompleteError } from '../../errors';

import { ActionRunner } from './action_runner';

import { BulkActionTaskType } from './bulk_action_types';
import { filterHostedPolicies } from './filter_hosted_agents';
import {
  bulkCreateAgentActionResults,
  createAgentAction,
  createErrorActionResults,
} from './actions';
import { MAX_RETRY_COUNT } from './retry_helper';
import type { UpdateByQueryTaskResponse } from './update_by_query_task';
import { updateByQueryAndWait } from './update_by_query_task';

/**
 * How many agents the update of a batch goes through at a time when the update of the whole batch
 * was cancelled for running too long, or timed out. Each has the time limit of an update of its own.
 */
const UPDATE_BY_QUERY_CHUNK_SIZE = 1000;

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
        actionId: this.actionParams.actionId,
        total: this.actionParams.total,
        spaceId: this.actionParams.spaceId,
        retriedByAction: true,
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
    /**
     * Whether the action retries a batch that fails (a batch of the runner, and not agents given by
     * id, which fail the request). A batch that stays incomplete records what it did only then.
     */
    retriedByAction?: boolean;
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
  const updatedAt = new Date().toISOString();

  // the update of some of the agents of the batch
  const requestFor = (ids: string[]): UpdateByQueryRequest => ({
    query: namespaceQuery
      ? { bool: { filter: [{ terms: { _id: ids } }, namespaceQuery] } }
      : { terms: { _id: ids } },
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
  });

  const runUpdate = async (ids: string[]) => {
    try {
      return await updateByQueryAndWait(esClient, requestFor(ids));
    } catch (error) {
      // a FleetError has no enumerable fields, JSON.stringify would drop its message
      const details = error instanceof FleetError ? error.message : JSON.stringify(error);
      throw new FleetError('Caught error while batch updating tags: ' + details.slice(0, 1000));
    }
  };

  // An update that was cancelled for running too long, or that timed out, got through some of the
  // agents, and what it reports, its total included, is of those: its first search can time out
  // before it has counted any agent, with a total of 0. So it is not a complete result, from which
  // the agents that were skipped are worked out.
  const isIncomplete = (outcome: UpdateByQueryTaskResponse) =>
    Boolean(outcome.canceled || outcome.timed_out);
  const describeIncomplete = (outcome: UpdateByQueryTaskResponse) =>
    outcome.canceled
      ? `Update by query cancelled (${outcome.canceled}) after updating ${
          outcome.updated ?? 0
        } of ${outcome.total ?? 'an unknown number of'} agents`
      : `Update by query timed out after updating ${outcome.updated ?? 0} agents`;

  let res = await runUpdate(agentIds);
  // how many of the agents of the batch `res` is the result for, and why it is not for all of them
  let agentsInResult = new Set(agentIds).size;
  let stopped: UpdateByQueryIncompleteError | undefined;

  if (isIncomplete(res)) {
    // What the cancelled update did is not recorded, as which of the agents it updated is not
    // known: it did not go through them in an order that can be told. The same agents are updated
    // again, which updates all of them, and counts each of them once. It is done a chunk at a time,
    // each with the time limit of an update of its own, as the whole batch was too slow for one.
    const distinctAgentIds = [...new Set(agentIds)];
    appContextService
      .getLogger()
      .warn(
        `${describeIncomplete(res)}, running it again for the same ${
          distinctAgentIds.length
        } agents, ${UPDATE_BY_QUERY_CHUNK_SIZE} at a time`
      );

    const chunked: UpdateByQueryTaskResponse = {
      took: 0,
      timed_out: false,
      total: 0,
      updated: 0,
      version_conflicts: 0,
      failures: [],
    };
    agentsInResult = 0;
    for (let start = 0; start < distinctAgentIds.length; start += UPDATE_BY_QUERY_CHUNK_SIZE) {
      const idsOfChunk = distinctAgentIds.slice(start, start + UPDATE_BY_QUERY_CHUNK_SIZE);
      const chunk = await runUpdate(idsOfChunk);
      if (isIncomplete(chunk)) {
        // No more is known of the agents of this chunk than of the batch before it, so what is
        // recorded is what the chunks before it did. That is known exactly, and it would be lost
        // otherwise, as the retry of the action may not select the agents they updated.
        const failures = chunk.failures ?? [];
        if (failures.length > 0) {
          appContextService
            .getLogger()
            .warn(
              `Update by query of action ${actionId} failed for ${
                failures.length
              } agents: ${JSON.stringify(failures).slice(0, 1000)}`
            );
        }
        stopped = new UpdateByQueryIncompleteError(
          `${describeIncomplete(chunk)}, giving up after running it again in chunks`
        );
        break;
      }
      agentsInResult += idsOfChunk.length;
      chunked.took = (chunked.took ?? 0) + (chunk.took ?? 0);
      chunked.total =
        chunked.total === undefined || chunk.total === undefined
          ? undefined
          : chunked.total + chunk.total;
      chunked.updated = (chunked.updated ?? 0) + (chunk.updated ?? 0);
      chunked.version_conflicts = (chunked.version_conflicts ?? 0) + (chunk.version_conflicts ?? 0);
      chunked.failures = (chunked.failures ?? []).concat(chunk.failures ?? []);
    }
    // Agents given by id have no action that is retried, so the request just fails, and with no
    // chunk through there is nothing to record.
    if (stopped && (!options.retriedByAction || agentsInResult === 0)) {
      throw stopped;
    }
    res = chunked;
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
    res.total !== undefined ? Math.max(0, agentsInResult - res.total) : 0
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

  if (stopped) {
    // What the chunks before the one that was cancelled did is recorded above, and the batch is
    // retried by the action for the rest. The retry restarts behind the kuery of the action and is
    // not told what is recorded, and there is a cost either way, so this is a choice:
    //
    // - For an update whose kuery leaves out the agents it updated, like `tags:old` for the removal
    //   of a tag, the retry does not select them again. Without this record they would never be
    //   counted, and the action would stay below its total for good.
    // - For an update whose kuery does not, a rename or several tags, the retry goes through them
    //   again and counts them a second time, as after a version conflict. The action can show as
    //   complete while the retry is still running, and ends with every agent updated.
    //
    // Which of the two it is cannot be told here without reading that kuery. The agents cannot be
    // left out of the retry by id either, as the retry of an update of tags does not deduplicate:
    // an agent that failed is recorded under its id, and has to be run again.
    throw stopped;
  }

  return { actionId, updated: res.updated, took: res.took };
}
