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
import type { AgentExecutionClient, ExecutionEventsClient } from './persistence';
import type { AgentExecutionEventDoc } from './types';
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
  eventsClient,
  executionClient,
  since,
}: {
  executionId: string;
  eventsClient: ExecutionEventsClient;
  executionClient: AgentExecutionClient;
  since?: number;
}): Observable<ChatEvent> => {
  return new Observable<ChatEvent>((observer) => {
    let stopped = false;

    const run = async () => {
      for await (const event of pollExecutionEvents(executionId, {
        eventsClient,
        executionClient,
        since,
      })) {
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
 * - Yields events from each poll batch.
 * - On terminal `failed` / `aborted` status: throws the appropriate error.
 * - On terminal `completed` status: drains remaining events then returns.
 * - Otherwise: waits {@link FOLLOW_POLL_INTERVAL_MS} and polls again.
 */
async function* pollExecutionEvents(
  executionId: string,
  {
    eventsClient,
    executionClient,
    since,
  }: {
    eventsClient: ExecutionEventsClient;
    executionClient: AgentExecutionClient;
    since?: number;
  }
): AsyncGenerator<ChatEvent> {
  let lastEventNumber = since ?? 0;
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

    // 1. Read & yield new events
    const events = await eventsClient.readEvents(executionId, lastEventNumber);
    if (events.length > 0) {
      lastActivityTime = Date.now();
    }
    for (const eventDoc of events) {
      yield eventDoc.event;
      lastEventNumber = Math.max(lastEventNumber, eventDoc.eventNumber);
    }

    // 2. Check execution status
    const execution = await executionClient.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    if (execution.status !== lastStatus) {
      lastActivityTime = Date.now();
      lastStatus = execution.status;
    }

    if (execution.status === ExecutionStatus.failed) {
      throw execution.error
        ? createAgentBuilderError(
            execution.error.code,
            execution.error.message,
            execution.error.meta
          )
        : createInternalError(`Execution ${executionId} failed`);
    }

    if (execution.status === ExecutionStatus.aborted) {
      throw createRequestAbortedError('request was aborted');
    }

    if (execution.status === ExecutionStatus.completed) {
      yield* drainRemainingEvents(executionId, eventsClient, lastEventNumber, events);
      return;
    }

    // 3. Not terminal yet — wait before next poll
    await delay(FOLLOW_POLL_INTERVAL_MS);
  }
}

/**
 * Drains remaining events after execution status becomes `completed`.
 *
 * ES near-real-time indexing means the last batch of events may not be
 * searchable yet. This generator retries a few times with a short delay,
 * stopping early once a `roundComplete` event is found.
 */
async function* drainRemainingEvents(
  executionId: string,
  eventsClient: ExecutionEventsClient,
  lastEventNumber: number,
  previousBatch: AgentExecutionEventDoc[]
): AsyncGenerator<ChatEvent> {
  let receivedRoundComplete = previousBatch.some((e) => isRoundCompleteEvent(e.event));

  for (let retry = 0; !receivedRoundComplete && retry < FOLLOW_TERMINAL_READ_MAX_RETRIES; retry++) {
    const finalEvents = await eventsClient.readEvents(executionId, lastEventNumber);
    for (const eventDoc of finalEvents) {
      yield eventDoc.event;
      lastEventNumber = Math.max(lastEventNumber, eventDoc.eventNumber);
      if (isRoundCompleteEvent(eventDoc.event)) {
        receivedRoundComplete = true;
      }
    }
    if (receivedRoundComplete || finalEvents.length > 0) {
      break;
    }
    await delay(FOLLOW_TERMINAL_READ_RETRY_DELAY_MS);
  }
}
