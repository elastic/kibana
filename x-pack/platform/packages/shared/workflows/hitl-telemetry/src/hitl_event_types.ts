/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const HITL_EVENT_TYPES = {
  created: 'hitl.created',
  responded: 'hitl.responded',
  timedOut: 'hitl.timed_out',
} as const;

export type HitlEventType = (typeof HITL_EVENT_TYPES)[keyof typeof HITL_EVENT_TYPES];

/** Channel/origin through which the HITL response was (or will be) submitted. */
export type ResponseSource = 'chat' | 'inbox' | 'unknown';

/** Context attached to every HITL telemetry event. */
export interface HitlEventContext {
  /** The Kibana plugin / app that owns the workflow. */
  source_app: string;
  /** Channel/origin through which the HITL response was (or will be) submitted. */
  responseSource: ResponseSource;
  /** The workflow definition ID. May be omitted when not readily available at the call site. */
  workflow_id?: string;
  /** The workflow execution ID. */
  execution_id: string;
  /** The step execution ID of the waitForInput step. May be omitted when not readily available. */
  step_execution_id?: string;
  /** Elapsed milliseconds from hitl.created to hitl.responded. Only on hitl.responded. */
  response_latency_ms?: number;
}
