/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createPollServerStepDefinition,
  KibanaApiCallError,
} from '@kbn/workflows-extensions/server';
import { z, lazySchema } from '@kbn/zod/v4';
import { runQueryStepCommonDefinition } from '../../../common/workflows/step_types/run_query/run_query_common';
import type { RunQueryOutput } from '../../../common/workflows/step_types/run_query/run_query_common';
import { deriveRunQueryStatus } from './status';
import type { LiveQueryCounters } from './status';
import { toRunQueryRow } from './rows';
import type { RunQueryRow } from './rows';

const DEFAULT_WAIT_MS = 5 * 60 * 1000;
const MAX_WAIT_MS = 30 * 60 * 1000;
const DEFAULT_MAX_ROWS = 1000;
const PAGE_SIZE = 500;
const MAX_WINDOW = 10000;
const UNIT_MS = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000 } as const;

const parseWaitTimeoutMs = (waitTimeout: string | undefined): number => {
  const match = waitTimeout?.match(/^([1-9][0-9]*)(s|m|h)$/);
  if (!match) return DEFAULT_WAIT_MS;

  return Math.min(Number(match[1]) * UNIT_MS[match[2] as keyof typeof UNIT_MS], MAX_WAIT_MS);
};

const stateSchema = lazySchema(() =>
  z.object({
    action_id: z.string(),
    query_action_id: z.string(),
    deadline: z.string(),
    ecs_keys: z.array(z.string()),
    max_rows: z.number(),
    agents_total: z.number(),
  })
);

interface SavedQueryResponse {
  data: { id: string; query: string; ecs_mapping?: Record<string, unknown> };
}

interface LiveQueryDetailsResponse {
  data: {
    status: string;
    queries: Array<Partial<LiveQueryCounters> & { action_id: string; docs?: number }>;
  };
}

interface LiveQueryResultsResponse {
  data: { edges?: Array<{ _source?: Record<string, unknown> }> };
}

const emptyAgents = (total: number): RunQueryOutput['agents'] => ({
  total,
  responded: 0,
  pending: total,
  failed: 0,
});

const rejection = (prefix: string, error: KibanaApiCallError): Error => {
  const body = error.body as { message?: string } | undefined;

  return new Error(`${prefix} (HTTP ${error.status}): ${body?.message ?? error.message}`);
};

export const runQueryStepDefinition = createPollServerStepDefinition({
  ...runQueryStepCommonDefinition,
  stateSchema,
  start: async (context) => {
    const { input, contextManager } = context;

    let savedQuery: SavedQueryResponse['data'];
    try {
      const { body } = await contextManager.callKibanaApi<SavedQueryResponse>({
        method: 'GET',
        path: `/api/osquery/saved_queries/${encodeURIComponent(input.saved_query_id)}`,
      });
      savedQuery = body.data;
    } catch (error) {
      if (error instanceof KibanaApiCallError && error.status >= 400 && error.status < 500) {
        return {
          error: rejection(`Saved query "${input.saved_query_id}" could not be read`, error),
        };
      }

      return { error: error as Error };
    }

    try {
      const { body } = await contextManager.callKibanaApi<{
        data: { action_id: string; agents?: string[]; queries?: Array<{ action_id: string }> };
      }>({
        method: 'POST',
        path: '/api/osquery/live_queries',
        body: {
          query: savedQuery.query,
          ecs_mapping: savedQuery.ecs_mapping,
          saved_query_id: input.saved_query_id,
          agent_ids: input.agent_ids,
        },
      });

      const queryActionId = body.data.queries?.[0]?.action_id;
      if (!queryActionId) {
        return { error: new Error('Live query was created without a query action id') };
      }

      return {
        state: {
          action_id: body.data.action_id,
          query_action_id: queryActionId,
          deadline: new Date(Date.now() + parseWaitTimeoutMs(input.wait_timeout)).toISOString(),
          ecs_keys: Object.keys(savedQuery.ecs_mapping ?? {}),
          max_rows: input.max_rows ?? DEFAULT_MAX_ROWS,
          agents_total: body.data.agents?.length ?? input.agent_ids.length,
        },
      };
    } catch (error) {
      if (error instanceof KibanaApiCallError && error.status >= 400 && error.status < 500) {
        return { error: rejection('Live query rejected', error) };
      }

      context.logger.warn(`Live query dispatch unconfirmed: ${(error as Error).message}`);
      const output: RunQueryOutput = {
        status: 'failed',
        error_code: 'DISPATCH_UNCONFIRMED',
        agents: emptyAgents(input.agent_ids.length),
        rows: [],
        row_count: 0,
        truncated: false,
      };

      return { output };
    }
  },
  poll: async (context) => {
    const { state, contextManager } = context;
    if (!state) {
      throw new Error('Poll ran before start() seeded durable state.');
    }

    const deadlinePassed = Date.now() >= new Date(state.deadline).getTime();
    const base = `/api/osquery/live_queries/${encodeURIComponent(state.action_id)}`;

    let query: LiveQueryDetailsResponse['data']['queries'][number] | undefined;
    try {
      const { body } = await contextManager.callKibanaApi<LiveQueryDetailsResponse>({
        method: 'GET',
        path: base,
      });
      query =
        body.data.queries.find((q) => q.action_id === state.query_action_id) ??
        body.data.queries[0];
    } catch (error) {
      // The query was dispatched but this user cannot read it back (the details route needs
      // `live_queries_read`): waiting out the deadline would only report a misleading `timed_out`.
      if (error instanceof KibanaApiCallError && (error.status === 401 || error.status === 403)) {
        const output: RunQueryOutput = {
          status: 'failed',
          error_code: 'STATUS_UNREADABLE_FORBIDDEN',
          action_id: state.action_id,
          agents: {
            total: state.agents_total,
            responded: 0,
            pending: state.agents_total,
            failed: 0,
          },
          rows: [],
          row_count: 0,
          truncated: false,
        };

        return { output };
      }

      // Never error after dispatch: keep polling until the deadline.
      context.logger.warn(`Live query ${state.action_id} poll failed: ${(error as Error).message}`);
    }

    const counters: LiveQueryCounters = {
      responded: query?.responded ?? 0,
      pending: query?.pending ?? state.agents_total,
      failed: query?.failed ?? 0,
      successful: query?.successful ?? 0,
    };
    const status = deriveRunQueryStatus(counters, deadlinePassed);
    if (status === undefined) {
      return { state };
    }

    const rowCount = query?.docs ?? 0;
    const rows: RunQueryRow[] = [];
    if (counters.successful > 0 || rowCount > 0) {
      try {
        for (
          let page = 0;
          rows.length < state.max_rows &&
          rows.length < rowCount &&
          (page + 1) * PAGE_SIZE <= MAX_WINDOW;
          page++
        ) {
          const { body } = await contextManager.callKibanaApi<LiveQueryResultsResponse>({
            method: 'GET',
            path: `${base}/results/${encodeURIComponent(state.query_action_id)}`,
            query: { page, pageSize: PAGE_SIZE },
          });
          const edges = body.data.edges ?? [];
          if (edges.length === 0) break;
          edges.forEach((edge) => {
            if (edge._source && rows.length < state.max_rows) {
              rows.push(toRunQueryRow(edge._source, state.ecs_keys));
            }
          });
        }
      } catch (error) {
        context.logger.warn(
          `Live query ${state.action_id} results read failed: ${(error as Error).message}`
        );
      }
    }

    // The response counters are written before the result documents become searchable, so a
    // terminal status can still have unreadable rows: keep polling until they appear or the
    // deadline passes.
    if (!deadlinePassed && rows.length < Math.min(rowCount, state.max_rows)) {
      return { state };
    }

    const output: RunQueryOutput = {
      status,
      action_id: state.action_id,
      agents: {
        total: state.agents_total,
        responded: counters.responded,
        pending: counters.pending,
        failed: counters.failed,
      },
      rows,
      row_count: rowCount,
      truncated: rows.length < rowCount,
    };

    return { output };
  },
  policy: { strategy: 'exponential', initialMs: 5000, maxMs: 30000, jitter: true },
  // Both fields are always set: omitting one falls back to the default (60 attempts).
  ceilings: { maxAttempts: 150, maxWaitMs: 30000 },
});
