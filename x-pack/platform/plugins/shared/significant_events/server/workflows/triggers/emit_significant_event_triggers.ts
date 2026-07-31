/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SignificantEvent,
  SignificantEventInvestigation,
} from '@kbn/significant-events-schema';
import {
  EVENT_CREATED_TRIGGER_ID,
  EVENT_STATUS_CHANGED_TRIGGER_ID,
  INVESTIGATION_STARTED_TRIGGER_ID,
  INVESTIGATION_COMPLETED_TRIGGER_ID,
  type SignificantEventTriggerBasePayload,
  type InvestigationStartedTriggerPayload,
} from '../../../common/workflows/triggers';
import type { EventClient } from '../../lib/significant_events/events';

type SignificantEventSource = Pick<
  SignificantEvent,
  | '@timestamp'
  | 'event_id'
  | 'event_uuid'
  | 'title'
  | 'summary'
  | 'status'
  | 'severity'
  | 'stream_names'
>;

const baseSignificantEventPayload = (
  significantEvent: SignificantEventSource
): SignificantEventTriggerBasePayload => ({
  event_id: significantEvent.event_id,
  event_uuid: significantEvent.event_uuid,
  title: significantEvent.title,
  summary: significantEvent.summary,
  status: significantEvent.status,
  severity: significantEvent.severity,
  stream_names: significantEvent.stream_names,
  occurred_at: significantEvent['@timestamp'],
});

/**
 * Runs an emit block best-effort: trigger emission is a side-channel that must never break an
 * already-successful event write, so any synchronous error (e.g. payload building) is swallowed.
 * Async emit failures (getClient/emitEvent) are handled and logged separately in emit.ts.
 */
const emitBestEffort = (emit: () => void): void => {
  try {
    emit();
  } catch {
    // Swallow: emission must not affect the write result.
  }
};

/**
 * Emits `eventCreated` (no prior version) or `eventStatusChanged` (prior version with a different
 * status) for a single written event version.
 */
export const emitSignificantEventWriteTriggers = ({
  eventClient,
  significantEvent,
  priorSignificantEvent,
}: {
  eventClient: EventClient;
  /** The newly written (append-only) significant event version. */
  significantEvent: SignificantEventSource;
  /** The latest version of this event_id that existed before this write, if any. */
  priorSignificantEvent: Pick<SignificantEvent, 'status'> | undefined;
}): void =>
  emitBestEffort(() => {
    if (!eventClient.emitTrigger) {
      return;
    }

    if (!priorSignificantEvent) {
      eventClient.emitTrigger(
        EVENT_CREATED_TRIGGER_ID,
        baseSignificantEventPayload(significantEvent)
      );
      return;
    }

    if (priorSignificantEvent.status !== significantEvent.status) {
      eventClient.emitTrigger(EVENT_STATUS_CHANGED_TRIGGER_ID, {
        ...baseSignificantEventPayload(significantEvent),
        previous_status: priorSignificantEvent.status,
      });
    }
  });

const investigationPayload = (
  base: SignificantEventTriggerBasePayload,
  investigation: SignificantEventInvestigation
): InvestigationStartedTriggerPayload => ({
  ...base,
  workflow_execution_id: investigation.workflow_execution_id,
  started_at: investigation.started_at,
});

/**
 * Emits investigation lifecycle triggers by diffing the event's investigations before and after a
 * write, keyed on `workflow_execution_id`. `targetedWorkflowExecutionId` is the run the caller
 * actually acted on, which disambiguates the two ways an entry gains `completed_at`:
 * - a new entry without `completed_at` -> `investigationStarted`;
 * - the targeted run gaining `completed_at` -> `investigationCompleted`;
 * - any *other* still-running run gaining `completed_at` (stamped by attach reconciliation when a
 *   newer run supersedes it) emits nothing: it never reached a terminal step, so reporting it as
 *   "completed" would be misleading.
 */
export const emitSignificantEventInvestigationTriggers = ({
  eventClient,
  significantEvent,
  previousInvestigations,
  nextInvestigations,
  targetedWorkflowExecutionId,
}: {
  eventClient: EventClient;
  significantEvent: SignificantEventSource;
  previousInvestigations: SignificantEventInvestigation[];
  nextInvestigations: SignificantEventInvestigation[];
  targetedWorkflowExecutionId: string;
}): void =>
  emitBestEffort(() => {
    if (!eventClient.emitTrigger) {
      return;
    }

    const base = baseSignificantEventPayload(significantEvent);
    const previousByExecutionId = new Map(
      previousInvestigations.map((investigation) => [
        investigation.workflow_execution_id,
        investigation,
      ])
    );

    nextInvestigations.forEach((investigation) => {
      const previous = previousByExecutionId.get(investigation.workflow_execution_id);
      const { completed_at: completedAt, workflow_execution_id: executionId } = investigation;

      // Brand-new run that hasn't completed yet -> started.
      if (!previous && completedAt == null) {
        eventClient.emitTrigger(
          INVESTIGATION_STARTED_TRIGGER_ID,
          investigationPayload(base, investigation)
        );
        return;
      }

      // A run that just gained `completed_at`. Only the run the caller actually acted on truly
      // completed; other runs gaining `completed_at` were stamped by attach reconciliation because a
      // newer run superseded them (they never reached a terminal step), so we emit nothing for those.
      const justCompleted = completedAt != null && previous?.completed_at == null;
      if (justCompleted && executionId === targetedWorkflowExecutionId) {
        eventClient.emitTrigger(INVESTIGATION_COMPLETED_TRIGGER_ID, {
          ...investigationPayload(base, investigation),
          completed_at: completedAt,
        });
      }
    });
  });
