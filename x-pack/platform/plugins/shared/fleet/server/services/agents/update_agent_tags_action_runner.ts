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
import type { KueryNode } from '@kbn/es-query';

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

type TagsMatch = 'yes' | 'no' | 'unknown';

/**
 * Whether an agent the update has just changed matches a kuery, as far as its tags can tell.
 *
 * Such an agent has every tag the update adds, and none that it removes (unless it also adds it).
 * That decides a clause on the `tags` field for those tags, and with `not`, `and` and `or` the
 * clauses around it. Everything else, another field, a wildcard, a tag the update does not touch,
 * is `unknown`.
 */
const matchesUpdatedAgent = (
  node: KueryNode | undefined,
  tagsToAdd: Set<string>,
  tagsToRemove: Set<string>
): TagsMatch => {
  if (node?.type !== 'function') {
    return 'unknown';
  }
  const args: KueryNode[] = node.arguments ?? [];
  const matches = (arg: KueryNode | undefined) => matchesUpdatedAgent(arg, tagsToAdd, tagsToRemove);

  switch (node.function) {
    case 'is': {
      const [field, value] = args;
      if (field?.type !== 'literal' || field.value !== 'tags' || value?.type !== 'literal') {
        return 'unknown';
      }
      const tag = String(value.value);
      if (tagsToAdd.has(tag)) {
        return 'yes';
      }
      return tagsToRemove.has(tag) ? 'no' : 'unknown';
    }
    case 'not': {
      const match = matches(args[0]);
      return match === 'unknown' ? 'unknown' : match === 'yes' ? 'no' : 'yes';
    }
    case 'and': {
      const results = args.map(matches);
      if (results.includes('no')) {
        return 'no';
      }
      return results.length > 0 && results.every((result) => result === 'yes') ? 'yes' : 'unknown';
    }
    case 'or': {
      const results = args.map(matches);
      if (results.includes('yes')) {
        return 'yes';
      }
      return results.length > 0 && results.every((result) => result === 'no') ? 'no' : 'unknown';
    }
    default:
      return 'unknown';
  }
};

/**
 * Whether the retry of an update tags action leaves out the agents the update already changed.
 *
 * It restarts behind the action's kuery, so it leaves them out when they can no longer match it.
 * That is so for an update that adds one tag or removes one tag, which `updateAgentTags` narrows
 * the kuery for, and it can be so for another update through a kuery of the caller's: the tag
 * rename in the UI searches for the agents that have the old tag, which the renamed agents no
 * longer have. So the kuery is read, as the search of the agents reads it, and the answer is yes
 * only when the tags it names, whole, and only in the places that decide it, show that an updated
 * agent does not match.
 *
 * It is only used for a batch that is cancelled on every run: the agents it updated are recorded
 * when the retry is going to leave them out, as nothing else will. Whatever the kuery does not
 * settle (another field, a wildcard, a tag the update does not touch) counts as no, and nothing is
 * recorded then. For an `or` of a clause on the tags and one that does not settle, the retry leaves
 * out some of the agents that were updated and not others, and no count is right for that.
 */
export const retrySkipsUpdatedAgents = (
  tagsToAdd: string[] = [],
  tagsToRemove: string[] = [],
  kuery: string = ''
): boolean => {
  if (
    (tagsToAdd.length === 1 && tagsToRemove.length === 0) ||
    (tagsToRemove.length === 1 && tagsToAdd.length === 0)
  ) {
    return true;
  }
  if (kuery.trim() === '') {
    return false;
  }
  try {
    return (
      matchesUpdatedAgent(
        fromKueryExpression(removeSOAttributes(kuery)),
        new Set(tagsToAdd),
        new Set(tagsToRemove)
      ) === 'no'
    );
  } catch (error) {
    // Not a kuery that can be read, so there is nothing in it to leave agents out.
    return false;
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
        retrySkipsUpdated: retrySkipsUpdatedAgents(
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
    /** See {@link retrySkipsUpdatedAgents}: only used for a batch that is cancelled on every run. */
    retrySkipsUpdated?: boolean;
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
      // Nothing more is run for this batch here, and the retry of the action restarts behind its
      // kuery. What the cancelled run did is recorded now when that retry leaves it out, as it
      // would not be recorded at all: the agents it updated. The agents that failed are not
      // updated, so the retry runs them again, and they are recorded when there is no retry left
      // to do that, and logged until then.
      const failures = res.failures ?? [];
      const recordedUpdatedIds = getUuidArray(options.retrySkipsUpdated ? res.updated ?? 0 : 0);
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
