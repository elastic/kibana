/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import type { ChatEvent } from '@kbn/agent-builder-common';
import {
  createInternalError,
  createRequestAbortedError,
  isExecutionAbortedEvent,
  isExecutionTerminalEvent,
  isRequestAbortedError,
  isRoundCompleteEvent,
} from '@kbn/agent-builder-common';
import { ExecutionStatus } from '@kbn/agent-builder-common';
import type { AgentExecutionClient } from './persistence';
import { deserializeExecutionError } from './utils/serialize_execution_error';
import {
  FOLLOW_ABORT_DRAIN_TIMEOUT_MS,
  FOLLOW_EXECUTION_HEARTBEAT_TIMEOUT_MS,
  FOLLOW_EXECUTION_SCHEDULED_TIMEOUT_MS,
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
 * - On terminal `failed` / `aborted` status: drains up to the terminal timeline event (so the
 *   `execution_failed` / `execution_aborted` written by the executing node reaches the follower),
 *   then throws the appropriate error.
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
  // Latched across polls: a terminal timeline event read while the status was still `running`
  // must be remembered when `failed` / `aborted` arrives on a later poll.
  let receivedExecutionTerminal = false;
  let lastStatus: ExecutionStatus | undefined;
  let lastHeartbeat: string | undefined;
  let hasStartedRunning = false;
  const startTime = Date.now();
  let lastLivenessTime = startTime;

  while (true) {
    const now = Date.now();

    // 0. Safety timeouts
    if (now - startTime > FOLLOW_EXECUTION_TIMEOUT_MS) {
      throw createInternalError(
        `Execution ${executionId} timed out: no terminal status reached within ${FOLLOW_EXECUTION_TIMEOUT_MS}ms`
      );
    }
    if (hasStartedRunning) {
      if (now - lastLivenessTime > FOLLOW_EXECUTION_HEARTBEAT_TIMEOUT_MS) {
        throw createInternalError(
          `Execution ${executionId} timed out: no heartbeat for ${FOLLOW_EXECUTION_HEARTBEAT_TIMEOUT_MS}ms`
        );
      }
    } else if (now - lastLivenessTime > FOLLOW_EXECUTION_SCHEDULED_TIMEOUT_MS) {
      throw createInternalError(
        `Execution ${executionId} timed out: not claimed by a worker within ${FOLLOW_EXECUTION_SCHEDULED_TIMEOUT_MS}ms`
      );
    }

    // 1. Lightweight peek: status + event count + last heartbeat (no events payload)
    const peek = await executionClient.peek(executionId);
    if (!peek) {
      throw new Error(`Execution ${executionId} not found`);
    }

    const { status, error, eventCount, lastHeartbeat: heartbeat } = peek;

    // 2. Advancing heartbeat is a liveness signal
    if (heartbeat !== undefined && heartbeat !== lastHeartbeat) {
      lastHeartbeat = heartbeat;
      lastLivenessTime = Date.now();
    }

    // 3. Fetch new events only if the count has increased
    let receivedRoundComplete = false;
    const hasNewEvents = eventCount > lastEventIndex;
    if (hasNewEvents) {
      const { events: newEvents } = await executionClient.readEvents(executionId, lastEventIndex);

      if (newEvents.length > 0) {
        lastLivenessTime = Date.now();
      }
      for (const event of newEvents) {
        yield event;
        if (isRoundCompleteEvent(event)) {
          receivedRoundComplete = true;
        }
        if (isExecutionTerminalEvent(event)) {
          receivedExecutionTerminal = true;
        }
      }
      lastEventIndex += newEvents.length;
    }

    // 4. Status changes also count as liveness
    if (status !== lastStatus) {
      lastLivenessTime = Date.now();
      lastStatus = status;
    }

    if (status === ExecutionStatus.running) {
      hasStartedRunning = true;
    }

    // 5. Handle terminal statuses
    if (status === ExecutionStatus.failed) {
      // The worker writes `failed` after its event flush settled, so the terminal event is either
      // already read or one short retry away.
      if (!receivedExecutionTerminal) {
        yield* drainUntilTerminal(executionId, executionClient, lastEventIndex, {
          timeoutMs: FOLLOW_TERMINAL_READ_MAX_RETRIES * FOLLOW_TERMINAL_READ_RETRY_DELAY_MS,
          pollMs: FOLLOW_TERMINAL_READ_RETRY_DELAY_MS,
        });
      }
      throw error
        ? deserializeExecutionError(error)
        : createInternalError(`Execution ${executionId} failed`);
    }

    if (status === ExecutionStatus.aborted) {
      // `aborted` is flipped by the abort request before the worker has stopped: keep draining for
      // a bounded window so the `execution_aborted` terminal can be forwarded first.
      let drainedTerminal: ChatEvent | undefined;
      if (!receivedExecutionTerminal) {
        drainedTerminal = yield* drainUntilTerminal(executionId, executionClient, lastEventIndex, {
          timeoutMs: FOLLOW_ABORT_DRAIN_TIMEOUT_MS,
          pollMs: FOLLOW_POLL_INTERVAL_MS,
        });
      }
      // The worker records the abort error (with its `abort_reason`) after winding down; prefer
      // it so followers see the same attribution as live clients, else derive it from the
      // terminal that was drained.
      const latest = await executionClient.peek(executionId);
      const persistedError = latest?.error ?? error;
      if (persistedError && isRequestAbortedError(deserializeExecutionError(persistedError))) {
        throw deserializeExecutionError(persistedError);
      }
      const abortedBy =
        drainedTerminal && isExecutionAbortedEvent(drainedTerminal)
          ? drainedTerminal.data.aborted_by
          : undefined;
      throw createRequestAbortedError(
        'request was aborted',
        abortedBy ? { abort_reason: abortedBy } : undefined
      );
    }

    if (status === ExecutionStatus.completed) {
      if (!receivedRoundComplete) {
        yield* drainRemainingEvents(executionId, executionClient, lastEventIndex);
      }
      return;
    }

    // 6. Not terminal yet — wait before next poll
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

/**
 * Yields new events until a terminal timeline event (`execution_terminated` / `execution_failed` /
 * `execution_aborted`) is seen or `timeoutMs` elapses, and returns that terminal (undefined on
 * timeout). Used once the status is `failed` / `aborted`, so the terminal the executing node wrote
 * reaches the follower before the error.
 */
async function* drainUntilTerminal(
  executionId: string,
  executionClient: AgentExecutionClient,
  lastEventIndex: number,
  { timeoutMs, pollMs }: { timeoutMs: number; pollMs: number }
): AsyncGenerator<ChatEvent, ChatEvent | undefined> {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const { events } = await executionClient.readEvents(executionId, lastEventIndex);
    let terminal: ChatEvent | undefined;
    for (const event of events) {
      yield event;
      if (isExecutionTerminalEvent(event)) {
        terminal = event;
      }
    }
    lastEventIndex += events.length;
    if (terminal || Date.now() >= deadline) {
      return terminal;
    }
    await delay(pollMs);
  }
}
