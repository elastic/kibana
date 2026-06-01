/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HitlEventContext, HitlEventType, ResponseSource } from './hitl_event_types';

/** Minimal analytics interface — subset of AnalyticsServiceSetup/Start. */
export interface HitlAnalytics {
  reportEvent(eventType: string, eventData: Record<string, unknown>): void;
}

/** Minimal logger interface — satisfied by IWorkflowEventLogger and Logger. */
export interface HitlLogger {
  debug(message: string | (() => string), meta?: Record<string, unknown>): void;
}

/**
 * Closed payload shape for EBT — every field addition is intentional.
 * Derived from HitlEventContext so the two types stay in sync.
 */
interface EbtPayload {
  // why: EBT schema registration iterates HITL_EVENT_TYPES and registers event_type per event;
  // analytics.reportEvent's first arg routes the event for schema lookup — both must be present.
  event_type: HitlEventType;
  execution_id: string;
  response_latency_ms?: number;
  responseSource: ResponseSource;
  source_app: string;
  step_execution_id?: string;
  workflow_id?: string;
}

/** Returns the latency value unchanged if valid (≥ 0, not NaN), otherwise undefined. */
const guardLatency = (value: number | undefined): number | undefined => {
  if (value === undefined) return undefined;
  if (Number.isNaN(value) || value < 0) return undefined;
  return value;
};

/**
 * Emits a HITL telemetry event to both EBT analytics and the workflow event log.
 *
 * Both destinations are best-effort: a failure in one does not suppress the other.
 * Callers may omit `analytics` or `logger` if not available at the emit point.
 */
export const reportHitlEvent = (
  analytics: HitlAnalytics | undefined,
  logger: HitlLogger | undefined,
  event: HitlEventType,
  context: HitlEventContext
): void => {
  const {
    execution_id,
    response_latency_ms,
    responseSource,
    source_app,
    step_execution_id,
    workflow_id,
  } = context;

  const safeLatency = guardLatency(response_latency_ms);

  if (response_latency_ms !== undefined && safeLatency === undefined) {
    logger?.debug(
      () => `[hitl-telemetry] dropping invalid response_latency_ms: ${response_latency_ms}`
    );
  }

  const ebtPayload: EbtPayload = {
    event_type: event, // why: see EbtPayload comment above
    execution_id,
    ...(safeLatency !== undefined && { response_latency_ms: safeLatency }),
    responseSource,
    source_app,
    ...(step_execution_id !== undefined && { step_execution_id }),
    ...(workflow_id !== undefined && { workflow_id }),
  };

  if (analytics) {
    try {
      analytics.reportEvent(event, ebtPayload as unknown as Record<string, unknown>);
    } catch (err) {
      if (logger) {
        try {
          logger.debug(() => `[hitl-telemetry] failed to report EBT event ${event}`, {
            err: String(err),
          });
        } catch (_loggerErr) {
          // best-effort
        }
      }
    }
  }

  if (logger) {
    try {
      logger.debug(() => `[hitl-telemetry] ${event}`, {
        event: { action: event },
        labels: ebtPayload as unknown as Record<string, unknown>,
      });
    } catch (_err) {
      // best-effort — logger failure must not suppress prior analytics emit
    }
  }
};
