/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPollServerStepDefinition } from '@kbn/workflows-extensions/server';
import { z, lazySchema } from '@kbn/zod/v4';
import {
  DEFAULT_MAX_ROWS,
  DEFAULT_WAIT_MS,
  MAX_WAIT_MS,
  OUTPUT_BUDGET_BYTES,
  POLL_CEILINGS,
  POLL_POLICY,
} from '../../../../common/workflows/contract/budget';
import { OutputErrorCode } from '../../../../common/workflows/contract/error_codes';
import { runQueryStepCommonDefinition } from '../../../../common/workflows/step_types/run_query/run_query_common';
import type { RunQueryOutput } from '../../../../common/workflows/step_types/run_query/run_query_common';
import { runQueryInputSchema } from '../../../../common/workflows/step_types/run_query/run_query_common';
import { parseStepInput } from '../../lib/errors';
import { dispatchLiveQuery, readLiveQuery } from '../../lib/live_query';
import { parseWaitTimeoutMs } from '../../lib/poll_contract';
import { resolveTarget } from '../../lib/preflight';
import { resolveSavedQuery } from '../../lib/resolve_saved_query';

const stateSchema = lazySchema(() =>
  z.object({
    action_id: z.string(),
    deadline: z.string(),
    max_rows: z.number(),
    agents_total: z.number(),
    queries: z.array(
      z.object({
        query_id: z.string(),
        action_id: z.string(),
        ecs_keys: z.array(z.string()),
      })
    ),
  })
);

const failedOutput = (
  errorCode: RunQueryOutput['error_code'],
  agentsTotal: number,
  actionId?: string
): RunQueryOutput => ({
  status: 'failed',
  error_code: errorCode,
  ...(actionId ? { action_id: actionId } : {}),
  agents: { total: agentsTotal, responded: 0, pending: agentsTotal, failed: 0 },
  rows: [],
  row_count: 0,
  truncated: false,
});

export const runQueryStepDefinition = createPollServerStepDefinition({
  ...runQueryStepCommonDefinition,
  stateSchema,
  start: async (context) => {
    const { contextManager, logger } = context;
    const input = parseStepInput(runQueryInputSchema, context.input);

    const target = await resolveTarget(contextManager, input);
    const savedQuery = await resolveSavedQuery(contextManager, input.saved_query);

    const dispatched = await dispatchLiveQuery({
      contextManager,
      logger,
      // The route never resolves a saved query's SQL itself: send the saved query's own.
      fields: {
        query: savedQuery.query,
        ecs_mapping: savedQuery.ecs_mapping,
        saved_query_id: input.saved_query,
        ...(savedQuery.timeout ? { timeout: savedQuery.timeout } : {}),
      },
      target,
    });
    if (dispatched.type === 'unconfirmed') {
      return {
        output: failedOutput(OutputErrorCode.DISPATCH_UNCONFIRMED, input.agent_ids?.length ?? 0),
      };
    }

    return {
      state: {
        action_id: dispatched.actionId,
        deadline: new Date(
          Date.now() +
            parseWaitTimeoutMs(input.wait_timeout, {
              defaultMs: DEFAULT_WAIT_MS,
              maxMs: MAX_WAIT_MS,
            })
        ).toISOString(),
        max_rows: input.max_rows ?? DEFAULT_MAX_ROWS,
        agents_total: dispatched.agentsTotal,
        queries: [
          {
            query_id: input.saved_query,
            action_id: dispatched.queries[0].action_id,
            ecs_keys: Object.keys(savedQuery.ecs_mapping ?? {}),
          },
        ],
      },
    };
  },
  poll: async (context) => {
    const { state, contextManager, logger } = context;
    if (!state) {
      throw new Error('Poll ran before start() seeded durable state.');
    }

    const reading = await readLiveQuery({
      contextManager,
      logger,
      state,
      deadlinePassed: Date.now() >= new Date(state.deadline).getTime(),
      budget: { remainingBytes: OUTPUT_BUDGET_BYTES, exhausted: false },
    });
    if (reading.type === 'pending') return { state };
    if (reading.type === 'failed') {
      return { output: failedOutput(reading.errorCode, state.agents_total, state.action_id) };
    }

    const [{ status, agents, rows, row_count: rowCount, truncated }] = reading.results;

    return {
      output: { status, action_id: state.action_id, agents, rows, row_count: rowCount, truncated },
    };
  },
  policy: POLL_POLICY,
  ceilings: POLL_CEILINGS,
});
