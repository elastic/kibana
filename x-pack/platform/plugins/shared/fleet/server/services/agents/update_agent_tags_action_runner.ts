/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';
import { v4 as uuidv4 } from 'uuid';

import type { Agent } from '../../types';

import { appContextService } from '../app_context';
import { agentsNamespaceQuery } from '../spaces/agent_namespaces';

import { FleetVersionConflictError } from '../../errors';

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
import { buildUpdateTagsRequest, updateAgentsTags } from './update_tags_by_query';

const NOT_ELIGIBLE_ERROR = 'agent is not eligible for tags update';
const SKIPPED_AGENT_ERROR = 'agent not found, or not in the space of the action anymore';

/**
 * Ids for the results of agents that are counted and not named: an action by kuery does not have
 * the ids of the agents it updated. They are also what keeps the ids of agents that are in another
 * space now out of the results, as the action status shows the hostname of an agent by its id.
 */
const generateIds = (count: number) => Array.from({ length: count }, () => uuidv4());

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

interface UpdateTagsBatchOptions {
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

export async function updateTagsBatch(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  givenAgents: Agent[],
  outgoingErrors: Record<Agent['id'], Error>,
  options: UpdateTagsBatchOptions
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
      await createErrorActionResults(esClient, actionId, errors, NOT_ELIGIBLE_ERROR);
    }
    return { actionId, updated: 0, took: 0 };
  }

  appContextService
    .getLogger()
    .debug(
      `Agents to update tags in batch: ${agentIds.length}, tagsToAdd: ${options.tagsToAdd}, tagsToRemove: ${options.tagsToRemove}`
    );

  // The agents were in the caller's space when they were selected, and the update can run for
  // minutes, so it checks the space itself too: an agent that has moved out of it is left alone.
  const namespaceQuery = await agentsNamespaceQuery(spaceId);
  const updatedAt = new Date().toISOString();

  const { response, agentsCovered, stoppedBy } = await updateAgentsTags(esClient, agentIds, {
    requestFor: (ids) =>
      buildUpdateTagsRequest(ids, {
        tagsToAdd: options.tagsToAdd,
        tagsToRemove: options.tagsToRemove,
        updatedAt,
        namespaceQuery,
      }),
    actionId,
    retriedByAction: options.retriedByAction,
  });

  if (appContextService.getLogger().isLevelEnabled('debug')) {
    appContextService.getLogger().debug(JSON.stringify(response).slice(0, 1000));
  }

  await recordBatchOutcome(esClient, soClient, {
    actionId,
    namespaces,
    errors,
    options,
    response,
    agentsCovered,
  });

  const versionConflictCount = response.version_conflicts ?? 0;
  if (versionConflictCount > 0) {
    throw new FleetVersionConflictError(`Version conflict of ${versionConflictCount} agents`);
  }

  if (stoppedBy) {
    // What the chunks before the one that was incomplete did, and what it updated before it
    // stopped, is recorded, and the batch is retried by the action for the rest. The retry restarts behind the kuery of the action and is not told
    // what is recorded, and there is a cost either way, so this is a choice:
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
    throw stoppedBy;
  }

  return { actionId, updated: response.updated, took: response.took };
}

/**
 * Records what the update of a batch did, so that the action shows in the activity and its status
 * counts every agent of the batch: the ones that were updated, failed, conflicted (on the last
 * retry, as otherwise the retry runs them again), were skipped, or were not eligible.
 */
async function recordBatchOutcome(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  {
    actionId,
    namespaces,
    errors,
    options,
    response,
    agentsCovered,
  }: {
    actionId: string;
    namespaces: string[];
    errors: Record<Agent['id'], Error>;
    options: UpdateTagsBatchOptions;
    response: UpdateByQueryTaskResponse;
    /** How many of the distinct agents of the batch `response` is the result for. */
    agentsCovered: number;
  }
) {
  const logger = appContextService.getLogger();
  const errorAgentIds = Object.keys(errors);
  const isLastRetry = options.retryCount === MAX_RETRY_COUNT;

  const updatedCount = response.updated ?? 0;
  const updatedIds = generateIds(updatedCount);

  const failures = response.failures ?? [];

  const versionConflictCount = response.version_conflicts ?? 0;
  const versionConflictIds = isLastRetry ? generateIds(versionConflictCount) : [];

  // The agents the update did not go through were moved out of the space, or deleted, after they
  // were selected. They are not updated or failed, but the action counts them in its total, so
  // without a result of their own it would never reach it. There are as many as the update went
  // through fewer agents than the batch has: what the task says, and not a later search, which
  // reads another snapshot and could find an agent that came back, or miss one that left after it
  // was updated.
  const skippedAgentIds = generateIds(
    response.total !== undefined ? Math.max(0, agentsCovered - response.total) : 0
  );

  // The action document only has the agents that were updated, failed, in case of the last retry
  // conflicted, and skipped, which keeps the count of the action status accurate.
  await createAgentAction(esClient, soClient, {
    id: actionId,
    agents: updatedIds
      .concat(failures.map((failure) => failure.id))
      .concat(versionConflictIds)
      .concat(errorAgentIds)
      .concat(skippedAgentIds),
    namespaces,
    created_at: new Date().toISOString(),
    type: 'UPDATE_TAGS',
    total:
      options.total ??
      (response.total !== undefined
        ? response.total + errorAgentIds.length + skippedAgentIds.length
        : undefined),
  });
  await createErrorActionResults(esClient, actionId, errors, NOT_ELIGIBLE_ERROR);
  logger.debug(
    `action doc wrote on ${
      updatedCount + failures.length + versionConflictIds.length
    } agentIds, updated: ${updatedCount}, failed: ${
      failures.length
    }, version_conflicts: ${versionConflictCount}`
  );

  const writeResults = async (
    label: string,
    results: Array<{ agentId: string; error?: string }>
  ) => {
    if (results.length === 0) {
      return;
    }
    await bulkCreateAgentActionResults(
      esClient,
      results.map((result) => ({ actionId, namespaces, ...result }))
    );
    logger.debug(`action ${label} result wrote on ${results.length} agents`);
  };

  await writeResults(
    'skipped',
    skippedAgentIds.map((agentId) => ({ agentId, error: SKIPPED_AGENT_ERROR }))
  );
  await writeResults(
    'updated',
    updatedIds.map((agentId) => ({ agentId }))
  );
  await writeResults(
    'failed',
    failures.map((failure) => ({
      agentId: failure.id,
      error: failure.cause.reason ?? undefined, // reason can be null and we want to replace it with undefined
    }))
  );
  // so that the action is not stuck in progress
  await writeResults(
    'conflict',
    versionConflictIds.map((agentId) => ({ agentId, error: 'version conflict on last retry' }))
  );
}
