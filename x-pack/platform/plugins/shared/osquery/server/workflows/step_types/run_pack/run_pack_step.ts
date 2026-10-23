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
import { resolveTarget } from '../../lib/preflight';
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
      })
    ),
  })
);

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

    const target = await resolveTarget(contextManager, input);
    const pack = await resolvePack(contextManager, input);

    const dispatched = await dispatchLiveQuery({
      contextManager,
      logger,
      fields: { pack_id: pack.packId },
      target,
    });
    if (dispatched.type === 'unconfirmed') {
      return { output: failedOutput(OutputErrorCode.DISPATCH_UNCONFIRMED) };
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
        queries: dispatched.queries.map((query) => ({
          query_id: query.id || query.action_id,
          action_id: query.action_id,
          ecs_keys: pack.ecsKeysByQuery[query.id ?? ''] ?? [],
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
    if (reading.type === 'pending') return { state };
    if (reading.type === 'failed') {
      return { output: failedOutput(reading.errorCode, state.action_id) };
    }

    return {
      output: {
        status: rollupPackStatus(reading.results.map((result) => result.status)),
        action_id: state.action_id,
        queries: reading.results,
      },
    };
  },
  policy: POLL_POLICY,
  ceilings: POLL_CEILINGS,
});
