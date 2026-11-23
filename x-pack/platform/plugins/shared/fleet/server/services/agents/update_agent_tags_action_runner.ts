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
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';

import type { Agent } from '../../types';

import { AGENTS_INDEX } from '../../constants';

import { appContextService } from '../app_context';
import { agentsKueryNamespaceFilter } from '../spaces/agent_namespaces';

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

  // The agents were in the caller's space when they were selected. The update can run for minutes,
  // and again after being cancelled, so it checks the space itself too: an agent that has moved out
  // of it in the meantime is left alone. The agents it leaves are not counted, as they are not updated.
  const namespaceFilter = await agentsKueryNamespaceFilter(spaceId);
  const idsQuery = { terms: { _id: agentIds } };

  const request: UpdateByQueryRequest = {
    query: namespaceFilter
      ? {
          bool: {
            filter: [
              idsQuery,
              toElasticsearchQuery(fromKueryExpression(removeSOAttributes(namespaceFilter))),
            ],
          },
        }
      : idsQuery,
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
        updatedAt: new Date().toISOString(),
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
      // The agents that failed are the one thing in this outcome that a retry would not tell
      // again, as far as the reason goes, so they are not lost with it. They are recorded when no
      // retry of the action is left to run them again, and logged until then.
      const failures = res.failures ?? [];
      if (failures.length > 0) {
        if (options.retryCount === MAX_RETRY_COUNT) {
          await createAgentAction(esClient, soClient, {
            id: actionId,
            agents: failures.map((failure) => failure.id),
            namespaces,
            created_at: new Date().toISOString(),
            type: 'UPDATE_TAGS',
            total:
              options.total ??
              (res.total !== undefined ? res.total + errorAgentIds.length : undefined),
          });
          await bulkCreateAgentActionResults(
            esClient,
            failures.map((failure) => ({
              agentId: failure.id,
              actionId,
              namespace: spaceId,
              error: failure.cause.reason ?? undefined,
            }))
          );
        } else {
          appContextService
            .getLogger()
            .warn(
              `Update by query of action ${actionId} failed for ${
                failures.length
              } agents: ${JSON.stringify(failures).slice(0, 1000)}`
            );
        }
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

  // creating unique ids to use as agentId, as we don't have all agent ids in case of action by kuery
  const getUuidArray = (count: number) => Array.from({ length: count }, () => uuidv4());

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
      .concat(errorAgentIds),
    namespaces,
    created_at: new Date().toISOString(),
    type: 'UPDATE_TAGS',
    total:
      options.total ?? (res.total !== undefined ? res.total + errorAgentIds.length : undefined),
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
