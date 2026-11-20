/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/logging';
import type { PubSubDurableSubscription } from '@kbn/core-pubsub-server';
import {
  CAUGHT_UP_DELAY_MS,
  FAILURE_BACKOFF_MS,
  HANDLER_MISSING_DELAY_MS,
  HANDLER_TIMEOUT_MS,
  INITIAL_IDLE_MS,
  MAX_ATTEMPTS_PER_EVENT,
  MAX_IDLE_MS,
  PAGE_SIZE,
  RUN_TIME_BUDGET_MS,
} from './constants';
import type { EventsStore } from './events_store';

export interface DrainState {
  /** Sequence number processed through; null until the first run. */
  cursor: number | null;
  /** Delay to use for the next idle run. */
  idleMs: number;
  failing: { seqNo: number; attempts: number } | null;
}

const normalizeState = (state: Record<string, unknown>): DrainState => {
  const failing = state.failing as { seqNo?: unknown; attempts?: unknown } | null | undefined;
  return {
    cursor: typeof state.cursor === 'number' ? state.cursor : null,
    idleMs: typeof state.idleMs === 'number' ? state.idleMs : INITIAL_IDLE_MS,
    failing:
      failing && typeof failing.seqNo === 'number' && typeof failing.attempts === 'number'
        ? { seqNo: failing.seqNo, attempts: failing.attempts }
        : null,
  };
};

/**
 * WARNING: Do not modify the existing versioned schema(s) below, define a new version instead.
 */
export const stateSchemaByVersion = {
  1: {
    up: (state: Record<string, unknown>) => ({ ...normalizeState(state) }),
    schema: schema.object({
      /** Sequence number processed through; null until the first run. */
      cursor: schema.nullable(schema.number()),
      /** Delay to use for the next idle run. */
      idleMs: schema.number(),
      failing: schema.nullable(
        schema.object({ seqNo: schema.number(), attempts: schema.number() })
      ),
    }),
  },
};

export const normalizeDrainState = normalizeState;

export const initialDrainState: DrainState = {
  cursor: null,
  idleMs: INITIAL_IDLE_MS,
  failing: null,
};

export interface DrainResult {
  state: DrainState;
  runAt: Date;
  error?: Error;
}

export interface DrainContext {
  consumer: string;
  topic: string;
  state: DrainState;
  /** Undefined when this node has no handler for the task's subscription. */
  subscription: PubSubDurableSubscription | undefined;
  store: EventsStore;
  logger: Logger;
  signal: AbortSignal;
  now?: () => number;
}

class HandlerTimeoutError extends Error {
  constructor(eventId: string) {
    super(`Handler did not finish event "${eventId}" within ${HANDLER_TIMEOUT_MS}ms`);
  }
}

/** The handler keeps running in the background if it exceeds the limit; there is no way to cancel it. */
const deliverWithTimeout = async (
  deliver: PubSubDurableSubscription['deliver'],
  event: Parameters<PubSubDurableSubscription['deliver']>[0]
): Promise<void> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new HandlerTimeoutError(event.id)), HANDLER_TIMEOUT_MS);
  });
  try {
    await Promise.race([deliver(event), timeout]);
  } finally {
    clearTimeout(timer);
  }
};

export const runDrain = async (ctx: DrainContext): Promise<DrainResult> => {
  const { consumer, topic, state, subscription, store, logger, signal } = ctx;
  const now = ctx.now ?? Date.now;
  const startedAt = now();
  const runAtIn = (delayMs: number): Date => new Date(now() + delayMs);

  if (!subscription) {
    return { state, runAt: runAtIn(HANDLER_MISSING_DELAY_MS) };
  }

  const logRun = (handled: number, lag: number) =>
    logger.debug(
      `drain consumer=${consumer} topic=${topic} handled=${handled} lag=${lag} durationMs=${
        now() - startedAt
      }`
    );

  const idle = (cursor: number): DrainResult => ({
    state: { cursor, idleMs: Math.min(state.idleMs * 2, MAX_IDLE_MS), failing: state.failing },
    runAt: runAtIn(state.idleMs),
  });

  const checkpoint = await store.getGlobalCheckpoint();

  if (state.cursor === null) {
    logRun(0, 0);
    return {
      state: { ...state, cursor: checkpoint },
      runAt: runAtIn(state.idleMs),
    };
  }

  const startCursor = state.cursor;
  if (checkpoint <= startCursor) {
    logRun(0, 0);
    return idle(startCursor);
  }

  const page = await store.readPage({
    topic,
    afterSeqNo: startCursor,
    throughSeqNo: checkpoint,
    size: PAGE_SIZE,
  });

  let cursor = startCursor;
  let handled = 0;
  let failure: { seqNo: number; error: Error } | undefined;
  let stoppedEarly = false;

  for (const event of page) {
    if (signal.aborted || now() - startedAt >= RUN_TIME_BUDGET_MS) {
      stoppedEarly = true;
      break;
    }

    try {
      await deliverWithTimeout(subscription.deliver, {
        id: event.id,
        topic: event.topic,
        acceptedAt: event.acceptedAt,
        data: event.data,
      });
      cursor = event.seqNo;
      handled += 1;
    } catch (error) {
      failure = {
        seqNo: event.seqNo,
        error: error instanceof Error ? error : new Error(String(error)),
      };
      break;
    }
  }

  const allHandled = !failure && !stoppedEarly && handled === page.length;
  const pageFull = page.length >= PAGE_SIZE;
  if (allHandled && !pageFull) {
    cursor = checkpoint;
  }

  if (failure) {
    const attempts = state.failing?.seqNo === failure.seqNo ? state.failing.attempts + 1 : 1;
    if (attempts >= MAX_ATTEMPTS_PER_EVENT) {
      const failed = page.find(({ seqNo }) => seqNo === failure!.seqNo);
      logger.error(
        `Parking pubsub event after ${attempts} failed attempts: consumer=${consumer} topic=${topic} eventId=${failed?.id} seqNo=${failure.seqNo}: ${failure.error.message}`
      );
      logRun(handled, checkpoint - failure.seqNo);
      return {
        state: { cursor: failure.seqNo, idleMs: INITIAL_IDLE_MS, failing: null },
        runAt: runAtIn(0),
      };
    }

    logRun(handled, checkpoint - cursor);
    return {
      state: { cursor, idleMs: INITIAL_IDLE_MS, failing: { seqNo: failure.seqNo, attempts } },
      runAt: runAtIn(FAILURE_BACKOFF_MS[Math.min(attempts, FAILURE_BACKOFF_MS.length) - 1]),
      error: failure.error,
    };
  }

  logRun(handled, checkpoint - cursor);

  if (stoppedEarly || pageFull) {
    return { state: { cursor, idleMs: INITIAL_IDLE_MS, failing: null }, runAt: runAtIn(0) };
  }

  if (handled > 0) {
    return {
      state: { cursor, idleMs: INITIAL_IDLE_MS, failing: null },
      runAt: runAtIn(CAUGHT_UP_DELAY_MS),
    };
  }

  return idle(cursor);
};
