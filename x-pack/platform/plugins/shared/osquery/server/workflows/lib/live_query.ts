/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { OutputErrorCode } from '../../../common/workflows/contract/error_codes';
import type { OutputErrorCodeValue } from '../../../common/workflows/contract/error_codes';
import type { StepStatus, TargetInput } from '../../../common/workflows/contract/schemas';
import { DISPATCH_API_HEADERS, PUBLIC_API_HEADERS } from './api_headers';
import { collectResults, countIndexedResults } from './collect_results';
import type { OutputBudget } from './collect_results';
import type { ResultRow } from './build_rows';
import { toDispatchRejection } from './errors';
import { deriveStepStatus } from './poll_contract';
import type { QueryCounters } from './poll_contract';
import type { KibanaApiCaller, StepLogger } from './types';

export interface PollQuerySpec {
  query_id: string;
  action_id: string;
  ecs_keys: string[];
}

/** Durable state seeded by `start` and carried between polls. */
export interface LiveQueryPollState {
  action_id: string;
  deadline: string;
  max_rows: number;
  agents_total: number;
  queries: PollQuerySpec[];
}

export interface QueryResult {
  query_id: string;
  action_id: string;
  status: StepStatus;
  agents: { total: number; responded: number; pending: number; failed: number };
  rows: ResultRow[];
  row_count: number;
  truncated: boolean;
}

export type LiveQueryReading =
  | { type: 'pending' }
  | { type: 'failed'; errorCode: OutputErrorCodeValue }
  | { type: 'done'; results: QueryResult[] };

interface DispatchResponse {
  data: {
    action_id: string;
    agents?: string[];
    queries?: Array<{
      action_id: string;
      id?: string;
      ecs_mapping?: Record<string, unknown> | Array<{ key?: string }>;
    }>;
  };
}

interface DetailsResponse {
  data: {
    queries: Array<{
      action_id: string;
      docs?: number;
      pending?: number;
      responded?: number;
      successful?: number;
      failed?: number;
    }>;
  };
}

export type DispatchOutcome =
  | {
      type: 'dispatched';
      actionId: string;
      agentsTotal: number;
      queries: Array<{
        action_id: string;
        id?: string;
        ecs_mapping?: Record<string, unknown> | Array<{ key?: string }>;
      }>;
    }
  | { type: 'unconfirmed' };

const targetFields = (input: TargetInput) => ({
  ...(input.agent_ids ? { agent_ids: input.agent_ids } : {}),
  ...(input.agent_policy_ids ? { agent_policy_ids: input.agent_policy_ids } : {}),
  ...(input.agent_platforms ? { agent_platforms: input.agent_platforms } : {}),
});

/**
 * The one dispatching POST. A rejection raised by the route is thrown as an `ExecutionError`;
 * anything with an unknown outcome is `unconfirmed` and must not be retried.
 */
export const dispatchLiveQuery = async ({
  contextManager,
  logger,
  fields,
  target,
}: {
  contextManager: KibanaApiCaller;
  logger: StepLogger;
  fields: Record<string, unknown>;
  target: TargetInput;
}): Promise<DispatchOutcome> => {
  let body: DispatchResponse;
  try {
    ({ body } = await contextManager.callKibanaApi<DispatchResponse>({
      method: 'POST',
      path: '/api/osquery/live_queries',
      body: { ...fields, ...targetFields(target) },
      headers: DISPATCH_API_HEADERS,
    }));
  } catch (error) {
    const rejection = toDispatchRejection(error);
    if (rejection) throw rejection;

    logger.warn(`Live query dispatch unconfirmed: ${(error as Error).message}`);

    return { type: 'unconfirmed' };
  }

  const queries = body.data.queries ?? [];
  if (!body.data.action_id || queries.length === 0) {
    logger.warn('Live query dispatch returned no action or query ids');

    return { type: 'unconfirmed' };
  }

  return {
    type: 'dispatched',
    actionId: body.data.action_id,
    agentsTotal: body.data.agents?.length ?? target.agent_ids?.length ?? 0,
    queries,
  };
};

const isForbidden = (error: unknown): boolean =>
  error instanceof KibanaApiCallError && (error.status === 401 || error.status === 403);

/**
 * One poll of a dispatched live query. Never throws: a 401/403 or 404 ends the run with an
 * `error_code`, any other read failure keeps polling until the deadline.
 */
export const readLiveQuery = async ({
  contextManager,
  logger,
  state,
  deadlinePassed,
  budget,
}: {
  contextManager: KibanaApiCaller;
  logger: StepLogger;
  state: LiveQueryPollState;
  deadlinePassed: boolean;
  budget: OutputBudget;
}): Promise<LiveQueryReading> => {
  let details: DetailsResponse['data']['queries'] = [];
  try {
    const { body } = await contextManager.callKibanaApi<DetailsResponse>({
      method: 'GET',
      path: `/api/osquery/live_queries/${encodeURIComponent(state.action_id)}`,
      headers: PUBLIC_API_HEADERS,
    });
    details = body.data.queries;
  } catch (error) {
    // The action was dispatched, but this identity cannot read it back (needs `live_queries_read`)
    // or cannot see it: waiting out the deadline would only report a misleading `timed_out`.
    if (isForbidden(error)) {
      return { type: 'failed', errorCode: OutputErrorCode.STATUS_UNREADABLE_FORBIDDEN };
    }

    if (error instanceof KibanaApiCallError && error.status === 404) {
      return { type: 'failed', errorCode: OutputErrorCode.ACTION_NOT_VISIBLE };
    }

    logger.warn(`Live query ${state.action_id} poll failed: ${(error as Error).message}`);
  }

  const finished: Array<{
    spec: PollQuerySpec;
    status: StepStatus;
    counters: QueryCounters;
    rowCount: number;
  }> = [];
  for (const spec of state.queries) {
    const detail = details.find((query) => query.action_id === spec.action_id);
    const counters = {
      responded: detail?.responded ?? 0,
      pending: detail?.pending ?? state.agents_total,
      failed: detail?.failed ?? 0,
      successful: detail?.successful ?? 0,
    };
    const status = deriveStepStatus(counters, deadlinePassed);
    if (status === undefined) return { type: 'pending' };

    finished.push({ spec, status, counters, rowCount: detail?.docs ?? 0 });
  }

  // The response counters are written before the result documents become searchable. Until the
  // deadline, a poll only counts them; the rows are read once, when all of them can be.
  if (!deadlinePassed) {
    for (const { spec, rowCount } of finished) {
      const wanted = Math.min(rowCount, state.max_rows);
      if (wanted === 0) continue;

      try {
        const indexed = await countIndexedResults({
          contextManager,
          actionId: state.action_id,
          queryActionId: spec.action_id,
        });
        if (indexed < wanted) return { type: 'pending' };
      } catch (error) {
        if (isForbidden(error)) {
          return { type: 'failed', errorCode: OutputErrorCode.STATUS_UNREADABLE_FORBIDDEN };
        }

        logger.warn(
          `Live query ${state.action_id} results count failed: ${(error as Error).message}`
        );

        return { type: 'pending' };
      }
    }
  }

  const results: QueryResult[] = [];
  for (const { spec, status, counters, rowCount } of finished) {
    let rows: ResultRow[] = [];
    if (rowCount > 0) {
      try {
        rows = await collectResults({
          contextManager,
          actionId: state.action_id,
          queryActionId: spec.action_id,
          ecsKeys: spec.ecs_keys,
          rowCount,
          maxRows: state.max_rows,
          budget,
        });
      } catch (error) {
        if (isForbidden(error)) {
          return { type: 'failed', errorCode: OutputErrorCode.STATUS_UNREADABLE_FORBIDDEN };
        }

        logger.warn(
          `Live query ${state.action_id} results read failed: ${(error as Error).message}`
        );
        // The rows were countable a moment ago: read them again on the next poll.
        if (!deadlinePassed) return { type: 'pending' };
      }
    }

    results.push({
      query_id: spec.query_id,
      action_id: spec.action_id,
      status,
      agents: {
        total: state.agents_total,
        responded: counters.responded,
        pending: counters.pending,
        failed: counters.failed,
      },
      rows,
      row_count: rowCount,
      truncated: rows.length < rowCount,
    });
  }

  return { type: 'done', results };
};
