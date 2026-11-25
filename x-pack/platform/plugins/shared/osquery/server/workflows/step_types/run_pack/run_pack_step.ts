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
import { runPackStepCommonDefinition } from '../../../../common/workflows/step_types/run_pack/run_pack_common';
import type { RunPackOutput } from '../../../../common/workflows/step_types/run_pack/run_pack_common';
import { runPackInputSchema } from '../../../../common/workflows/step_types/run_pack/run_pack_common';
import { parseStepInput } from '../../lib/errors';
import { dispatchLiveQuery, readLiveQuery } from '../../lib/live_query';
import { parseWaitTimeoutMs, rollupPackStatus } from '../../lib/poll_contract';
import { assertCanReadLiveQueries, resolveTarget } from '../../lib/preflight';
import { resolvePack } from '../../lib/resolve_pack';

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
        indexed: z.number().optional(),
        stalled_polls: z.number().optional(),
      })
    ),
    deadline_read_failures: z.number().optional(),
  })
);

/** Keys of a dispatched query's `ecs_mapping` (record or `{ key }` array); undefined when absent. */
const ecsKeysOf = (
  ecsMapping: Record<string, unknown> | Array<{ key?: string }> | undefined
): string[] | undefined => {
  if (!ecsMapping) return undefined;
  if (Array.isArray(ecsMapping)) {
    return ecsMapping.flatMap(({ key }) => (key ? [key] : []));
  }

  return Object.keys(ecsMapping);
};

const failedOutput = (
  errorCode: RunPackOutput['error_code'],
  actionId?: string
): RunPackOutput => ({
  status: 'failed',
  error_code: errorCode,
  ...(actionId ? { action_id: actionId } : {}),
  queries: [],
});

export const runPackStepDefinition = createPollServerStepDefinition({
  ...runPackStepCommonDefinition,
  stateSchema,
  start: async (context) => {
    const { contextManager, logger } = context;
    const input = parseStepInput(runPackInputSchema, context.input);

    // `start` is not idempotent: the dispatch has no idempotency key, so if the engine re-runs it
    // (a step-level `timeout` or `on-failure.retry`), the pack is dispatched twice.
    const { target } = await resolveTarget(contextManager, input, logger);
    // The pack is read before dispatch: the step validates its enabled queries (no `{{…}}`
    // placeholders, at least one) and never sends a bare `pack_id` the caller could not read.
    // The check is best-effort: the route reloads the pack and, for a `pack_id`, ignores inline
    // queries, so an edit that lands between this read and the POST is dispatched as saved.
    const { packId } = await resolvePack(contextManager, input);
    await assertCanReadLiveQueries(contextManager);

    const dispatched = await dispatchLiveQuery({
      contextManager,
      logger,
      // Only `pack_id`: the route builds one query per enabled pack query and the step sends no
      // `alert_ids`, so nothing is substituted.
      fields: { pack_id: packId },
      target,
    });
    if (dispatched.type === 'unconfirmed') {
      return { output: failedOutput(OutputErrorCode.DISPATCH_UNCONFIRMED) };
    }

    // Known gap: the pack is validated above, then the route rebuilds its queries from `pack_id`.
    // An edit to the pack in between is dispatched as saved, not as validated.
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
        queries: dispatched.queries.map((query) => ({
          query_id: query.id || query.action_id,
          action_id: query.action_id,
          // What the route dispatched is authoritative, over the pre-dispatch read of the pack: the
          // route drops an empty `ecs_mapping`, so a query without one has no keys, even when the
          // pack had a mapping at read time and lost it before dispatch.
          ecs_keys: ecsKeysOf(query.ecs_mapping) ?? [],
        })),
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
      // One budget for all queries: the 8MB bound is on the whole step output.
      budget: { remainingBytes: OUTPUT_BUDGET_BYTES, exhausted: false },
    });
    if (reading.type === 'pending') return { state: reading.state };
    if (reading.type === 'failed') {
      return { output: failedOutput(reading.errorCode, state.action_id) };
    }

    const unreadable = reading.results.some((result) => result.results_unreadable);

    return {
      output: {
        status: rollupPackStatus(reading.results.map((result) => result.status)),
        action_id: state.action_id,
        queries: reading.results.map(({ results_unreadable: _flag, ...query }) => query),
        ...(unreadable ? { error_code: OutputErrorCode.RESULTS_UNREADABLE } : {}),
      },
    };
  },
  policy: POLL_POLICY,
  ceilings: POLL_CEILINGS,
});
