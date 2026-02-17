/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import type { ChatEvent } from '@kbn/agent-builder-common';
import {
  createAgentBuilderError,
  createInternalError,
  createRequestAbortedError,
  isRoundCompleteEvent,
} from '@kbn/agent-builder-common';
import type { AgentExecutionClient } from './persistence';
import { ExecutionStatus } from './types';
import {
  FOLLOW_EXECUTION_IDLE_TIMEOUT_MS,
  FOLLOW_EXECUTION_TIMEOUT_MS,
  FOLLOW_POLL_INTERVAL_MS,
  FOLLOW_TERMINAL_READ_MAX_RETRIES,
  FOLLOW_TERMINAL_READ_RETRY_DELAY_MS,
} from './constants';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Wraps the polling async generator into an Observable<ChatEvent>.
 *
 * Subscribing starts the polling loop; unsubscribing stops it.
 */
export const followExecution$ = ({
  executionId,
  executionClient,
  since,
}: {
  executionId: string;
  executionClient: AgentExecutionClient;
  since?: number;
}): Observable<ChatEvent> => {
  return new Observable<ChatEvent>((observer) => {
    let stopped = false;

    const run = async () => {
      for await (const event of pollExecutionEvents(executionId, { executionClient, since })) {
        if (stopped) return;
        observer.next(event);
      }
      observer.complete();
    };

    run().catch((err) => {
      if (!stopped) observer.error(err);
    });

    return () => {
      stopped = true;
    };
  });
};

/**
 * Async generator that polls for execution events and yields them as they arrive.
 *
 * Uses a two-step polling approach to minimize data transfer:
 * 1. Lightweight `peek` (real-time GET with `_source_includes`) to fetch only
 *    the status, error, and event count.
 * 2. Full `readEvents` GET only when the event count has increased.
 *
 * - Yields new events from each poll.
 * - On terminal `failed` / `aborted` status: throws the appropriate error.
 * - On terminal `completed` status: drains remaining events then returns.
 * - Otherwise: waits {@link FOLLOW_POLL_INTERVAL_MS} and polls again.
 */
async function* pollExecutionEvents(
  executionId: string,
  {
    executionClient,
    since,
  }: {
    executionClient: AgentExecutionClient;
    since?: number;
  }
): AsyncGenerator<ChatEvent> {
  let lastEventIndex = since ?? 0;
  let lastStatus: ExecutionStatus | undefined;
  const startTime = Date.now();
  let lastActivityTime = startTime;

  while (true) {
    const now = Date.now();

    // 0. Safety timeouts
    if (now - startTime > FOLLOW_EXECUTION_TIMEOUT_MS) {
      throw createInternalError(
        `Execution ${executionId} timed out: no terminal status reached within ${FOLLOW_EXECUTION_TIMEOUT_MS}ms`
      );
    }
    if (now - lastActivityTime > FOLLOW_EXECUTION_IDLE_TIMEOUT_MS) {
      throw createInternalError(
        `Execution ${executionId} timed out: no activity for ${FOLLOW_EXECUTION_IDLE_TIMEOUT_MS}ms`
      );
    }

    // 1. Lightweight peek: status + event count (no events payload)
    const peek = await executionClient.peek(executionId);
    if (!peek) {
      throw new Error(`Execution ${executionId} not found`);
    }

    const { status, error, eventCount } = peek;

    // 2. Fetch new events only if the count has increased
    let receivedRoundComplete = false;
    const hasNewEvents = eventCount > lastEventIndex;
    if (hasNewEvents) {
      const { events: newEvents } = await executionClient.readEvents(executionId, lastEventIndex);

      if (newEvents.length > 0) {
        lastActivityTime = Date.now();
      }
      for (const event of newEvents) {
        yield event;
        if (isRoundCompleteEvent(event)) {
          receivedRoundComplete = true;
        }
      }
      lastEventIndex += newEvents.length;
    }

    // 3. Track status changes for idle timeout
    if (status !== lastStatus) {
      lastActivityTime = Date.now();
      lastStatus = status;
    }

    // 4. Handle terminal statuses
    if (status === ExecutionStatus.failed) {
      throw error
        ? createAgentBuilderError(error.code, error.message, error.meta)
        : createInternalError(`Execution ${executionId} failed`);
    }

    if (status === ExecutionStatus.aborted) {
      throw createRequestAbortedError('request was aborted');
    }

    if (status === ExecutionStatus.completed) {
      if (!receivedRoundComplete) {
        yield* drainRemainingEvents(executionId, executionClient, lastEventIndex);
      }
      return;
    }

    // 5. Not terminal yet — wait before next poll
    await delay(FOLLOW_POLL_INTERVAL_MS);
  }
}

/**
 * Drains remaining events after execution status becomes `completed`.
 *
 * Even though GET is real-time, there can be a brief window where the status
 * update and the final event append are separate operations. This generator
 * retries a few times, stopping early once a `roundComplete` event is found.
 */
async function* drainRemainingEvents(
  executionId: string,
  executionClient: AgentExecutionClient,
  lastEventIndex: number
): AsyncGenerator<ChatEvent> {
  for (let retry = 0; retry < FOLLOW_TERMINAL_READ_MAX_RETRIES; retry++) {
    const { events: finalEvents } = await executionClient.readEvents(executionId, lastEventIndex);
    let receivedRoundComplete = false;
    for (const event of finalEvents) {
      yield event;
      if (isRoundCompleteEvent(event)) {
        receivedRoundComplete = true;
      }
    }
    lastEventIndex += finalEvents.length;
    if (receivedRoundComplete || finalEvents.length > 0) {
      break;
    }
    await delay(FOLLOW_TERMINAL_READ_RETRY_DELAY_MS);
  }
}
