/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunQuotaExecutionReader } from './provenance';

const STORE_SIGNIFICANT_EVENTS_STEP_ID = 'store_significant_events';
const DEFAULT_POLL_TIMEOUT_MS = 2_000;
const DEFAULT_POLL_INTERVAL_MS = 100;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const outputContainsWrittenOpenEvent = (
  output: unknown,
  eventId: string,
  eventUuid: string
): boolean => {
  if (!isRecord(output) || !Array.isArray(output.significant_events)) {
    return false;
  }

  return output.significant_events.some(
    (event) =>
      isRecord(event) &&
      event.event_id === eventId &&
      event.event_uuid === eventUuid &&
      event.status === 'open' &&
      event.written === true
  );
};

const defaultSleep = async (duration: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, duration));
};

export const waitForInvestigationEvidence = async ({
  executionReader,
  executionId,
  eventId,
  eventUuid,
  pollTimeoutMs = DEFAULT_POLL_TIMEOUT_MS,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  sleep = defaultSleep,
}: {
  executionReader: RunQuotaExecutionReader;
  executionId: string;
  eventId: string;
  eventUuid: string;
  pollTimeoutMs?: number;
  pollIntervalMs?: number;
  sleep?: (duration: number) => Promise<void>;
}): Promise<void> => {
  for (let elapsed = 0; elapsed <= pollTimeoutMs; elapsed += pollIntervalMs) {
    const execution = await executionReader.getExecution(executionId);
    const steps = await executionReader.getStepExecutions(execution?.stepExecutionIds ?? []);
    const storeSteps = steps
      .filter((step) => step.stepId === STORE_SIGNIFICANT_EVENTS_STEP_ID)
      .sort((left, right) => right.stepExecutionIndex - left.stepExecutionIndex);

    if (
      storeSteps.some((step) => outputContainsWrittenOpenEvent(step.output, eventId, eventUuid))
    ) {
      return;
    }

    if (elapsed < pollTimeoutMs) {
      await sleep(Math.min(pollIntervalMs, pollTimeoutMs - elapsed));
    }
  }

  throw new Error('The discovery execution has no persisted evidence for this investigation');
};
