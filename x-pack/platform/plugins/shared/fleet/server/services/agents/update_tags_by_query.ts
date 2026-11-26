/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  QueryDslQueryContainer,
  UpdateByQueryRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { uniq } from 'lodash';

import { AGENTS_INDEX } from '../../constants';
import { FleetError, UpdateByQueryIncompleteError } from '../../errors';
import { appContextService } from '../app_context';

import type { UpdateByQueryTaskResponse } from './update_by_query_task';
import { updateByQueryAndWait } from './update_by_query_task';

/**
 * How many agents are updated at a time when the update of a whole batch was too slow. Each chunk
 * has the time limit of an update of its own.
 */
export const UPDATE_BY_QUERY_CHUNK_SIZE = 1000;

/** Adds and removes the tags of an agent. Running it again on an agent that has them changes nothing. */
const UPDATE_TAGS_SCRIPT = `
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
      `;

interface TagsUpdate {
  tagsToAdd: string[];
  tagsToRemove: string[];
  updatedAt: string;
  /** Leaves out the agents that are not in the space of the action: they may have left it. */
  namespaceQuery?: QueryDslQueryContainer;
}

/** The update of the tags of the agents with these ids. */
export const buildUpdateTagsRequest = (
  agentIds: string[],
  { tagsToAdd, tagsToRemove, updatedAt, namespaceQuery }: TagsUpdate
): UpdateByQueryRequest => ({
  query: namespaceQuery
    ? { bool: { filter: [{ terms: { _id: agentIds } }, namespaceQuery] } }
    : { terms: { _id: agentIds } },
  index: AGENTS_INDEX,
  refresh: true,
  script: {
    source: UPDATE_TAGS_SCRIPT,
    lang: 'painless',
    params: {
      tagsToAdd: uniq(tagsToAdd),
      tagsToRemove: uniq(tagsToRemove),
      updatedAt,
    },
  },
  conflicts: 'proceed', // relying on the task to retry in case of conflicts - retry only conflicted agents
});

export interface UpdateOutcome {
  /** The result of the update of the batch, or of the chunks of it that went through. */
  response: UpdateByQueryTaskResponse;
  /** How many of the distinct agents of the batch `response` is the result for. */
  agentsCovered: number;
  /**
   * Set when a chunk was incomplete too: `response` is then of the chunks before it, and has what
   * that chunk updated before it stopped, which `agentsCovered` does not count.
   */
  stoppedBy?: UpdateByQueryIncompleteError;
}

/**
 * An update that was cancelled for running too long, or that timed out, got through some of the
 * agents only, and what it reports, its total included, is of those: its first search can time out
 * before it has counted any agent, with a total of 0. So it is not a complete result.
 */
const isIncomplete = (outcome: UpdateByQueryTaskResponse) =>
  Boolean(outcome.canceled || outcome.timed_out);

const describeIncomplete = (outcome: UpdateByQueryTaskResponse) =>
  outcome.canceled
    ? `Update by query cancelled (${outcome.canceled}) after updating ${outcome.updated ?? 0} of ${
        outcome.total ?? 'an unknown number of'
      } agents`
    : `Update by query timed out after updating ${outcome.updated ?? 0} agents`;

const runUpdate = async (
  esClient: ElasticsearchClient,
  request: UpdateByQueryRequest
): Promise<UpdateByQueryTaskResponse> => {
  try {
    return await updateByQueryAndWait(esClient, request);
  } catch (error) {
    // a FleetError has no enumerable fields, JSON.stringify would drop its message
    const details = error instanceof FleetError ? error.message : JSON.stringify(error);
    throw new FleetError('Caught error while batch updating tags: ' + details.slice(0, 1000));
  }
};

const EMPTY_RESPONSE: UpdateByQueryTaskResponse = {
  took: 0,
  timed_out: false,
  total: 0,
  updated: 0,
  version_conflicts: 0,
  failures: [],
};

/** The result of two updates as the result of one. The total is unknown if either is. */
const combine = (
  a: UpdateByQueryTaskResponse,
  b: UpdateByQueryTaskResponse
): UpdateByQueryTaskResponse => ({
  took: (a.took ?? 0) + (b.took ?? 0),
  timed_out: false,
  total: a.total === undefined || b.total === undefined ? undefined : a.total + b.total,
  updated: (a.updated ?? 0) + (b.updated ?? 0),
  version_conflicts: (a.version_conflicts ?? 0) + (b.version_conflicts ?? 0),
  failures: [...(a.failures ?? []), ...(b.failures ?? [])],
});

/**
 * What a chunk that was cut short is known to have done: the agents it updated, which stay updated.
 * Its failures and version conflicts are not counted, as those agents were not changed and the retry
 * of the action runs them again, and its total is of the agents it got to.
 */
const withUpdatedOf = (
  response: UpdateByQueryTaskResponse,
  chunk: UpdateByQueryTaskResponse
): UpdateByQueryTaskResponse => ({
  ...response,
  took: (response.took ?? 0) + (chunk.took ?? 0),
  updated: (response.updated ?? 0) + (chunk.updated ?? 0),
});

/**
 * Updates the agents a chunk at a time, and stops at the first chunk that is incomplete, keeping
 * what the chunks before it did, and what it updated before it stopped: that is known exactly, and
 * the retry of the action may not select those agents again.
 */
const updateInChunks = async (
  esClient: ElasticsearchClient,
  agentIds: string[],
  requestFor: (ids: string[]) => UpdateByQueryRequest,
  actionId: string
): Promise<UpdateOutcome> => {
  let response = EMPTY_RESPONSE;
  let agentsCovered = 0;

  for (let start = 0; start < agentIds.length; start += UPDATE_BY_QUERY_CHUNK_SIZE) {
    const idsOfChunk = agentIds.slice(start, start + UPDATE_BY_QUERY_CHUNK_SIZE);
    const chunk = await runUpdate(esClient, requestFor(idsOfChunk));

    if (isIncomplete(chunk)) {
      const failures = chunk.failures ?? [];
      if (failures.length > 0) {
        // not recorded, as the agents of this chunk are run again by the retry of the action
        appContextService
          .getLogger()
          .warn(
            `Update by query of action ${actionId} failed for ${
              failures.length
            } agents: ${JSON.stringify(failures).slice(0, 1000)}`
          );
      }
      return {
        response: withUpdatedOf(response, chunk),
        agentsCovered,
        stoppedBy: new UpdateByQueryIncompleteError(
          `${describeIncomplete(chunk)}, giving up after running it again in chunks`
        ),
      };
    }

    response = combine(response, chunk);
    agentsCovered += idsOfChunk.length;
  }

  return { response, agentsCovered };
};

/**
 * Updates the tags of the agents with the requests that `requestFor` makes.
 *
 * What an update that was cancelled or timed out did is not recorded, as which of the agents it
 * updated is not known: it did not go through them in an order that can be told. So the same agents
 * are updated again, which updates all of them and counts each of them once, a chunk at a time and
 * each with the time limit of an update of its own, as the whole batch was too slow for one.
 *
 * If a chunk is incomplete too, what the chunks before it did, and what it updated before it
 * stopped, is returned with `stoppedBy` set, for the caller to record before it throws. That is only
 * for a batch the action retries (`retriedByAction`): agents given by id have no action to retry, so
 * the request just fails. With no agent updated at all there is nothing to record either.
 */
export async function updateAgentsTags(
  esClient: ElasticsearchClient,
  agentIds: string[],
  {
    requestFor,
    actionId,
    retriedByAction,
  }: {
    requestFor: (ids: string[]) => UpdateByQueryRequest;
    actionId: string;
    retriedByAction?: boolean;
  }
): Promise<UpdateOutcome> {
  const distinctAgentIds = [...new Set(agentIds)];

  const response = await runUpdate(esClient, requestFor(agentIds));
  if (!isIncomplete(response)) {
    return { response, agentsCovered: distinctAgentIds.length };
  }

  appContextService
    .getLogger()
    .warn(
      `${describeIncomplete(response)}, running it again for the same ${
        distinctAgentIds.length
      } agents, ${UPDATE_BY_QUERY_CHUNK_SIZE} at a time`
    );
  const outcome = await updateInChunks(esClient, distinctAgentIds, requestFor, actionId);

  const nothingToRecord = outcome.agentsCovered === 0 && (outcome.response.updated ?? 0) === 0;
  if (outcome.stoppedBy && (!retriedByAction || nothingToRecord)) {
    throw outcome.stoppedBy;
  }
  return outcome;
}
