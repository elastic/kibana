/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HITL_EVENT_TYPES } from './hitl_event_types';
import type { HitlEventContext } from './hitl_event_types';
import { reportHitlEvent } from './report_hitl_event';
import type { HitlAnalytics, HitlLogger } from './report_hitl_event';

const makeDimensions = (overrides?: Partial<HitlEventContext>): HitlEventContext => ({
  execution_id: 'exec-1',
  responseSource: 'unknown',
  source_app: 'workflows',
  step_execution_id: 'step-exec-1',
  workflow_id: 'wf-1',
  ...overrides,
});

describe('reportHitlEvent', () => {
  let analytics: jest.Mocked<HitlAnalytics>;
  let logger: jest.Mocked<HitlLogger>;

  beforeEach(() => {
    analytics = { reportEvent: jest.fn() };
    logger = { debug: jest.fn() };
  });

  it('calls analytics.reportEvent with the event type and dimensions', () => {
    const dims = makeDimensions({ responseSource: 'chat' });

    reportHitlEvent(analytics, logger, HITL_EVENT_TYPES.created, dims);

    expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
    const [eventType, payload] = analytics.reportEvent.mock.calls[0];
    expect(eventType).toBe('hitl.created');
    expect(payload).toMatchObject({
      event_type: 'hitl.created',
      execution_id: 'exec-1',
      responseSource: 'chat',
      source_app: 'workflows',
      step_execution_id: 'step-exec-1',
      workflow_id: 'wf-1',
    });
  });

  it('calls logger.debug with the event type', () => {
    reportHitlEvent(analytics, logger, HITL_EVENT_TYPES.responded, makeDimensions());

    expect(logger.debug).toHaveBeenCalledTimes(1);
    const [msgArg, meta] = logger.debug.mock.calls[0];
    const msg = typeof msgArg === 'function' ? msgArg() : msgArg;
    expect(msg).toContain('hitl.responded');
    expect(meta).toMatchObject({
      event: { action: 'hitl.responded' },
    });
  });

  it('includes response_latency_ms in the payload when provided', () => {
    const dims = makeDimensions({ response_latency_ms: 4200 });

    reportHitlEvent(analytics, logger, HITL_EVENT_TYPES.responded, dims);

    const [, payload] = analytics.reportEvent.mock.calls[0];
    expect(payload).toMatchObject({ response_latency_ms: 4200 });
  });

  it('omits response_latency_ms from payload when not provided', () => {
    reportHitlEvent(analytics, logger, HITL_EVENT_TYPES.created, makeDimensions());

    const [, payload] = analytics.reportEvent.mock.calls[0];
    expect(payload).not.toHaveProperty('response_latency_ms');
  });

  it('skips analytics.reportEvent when analytics is undefined', () => {
    reportHitlEvent(undefined, logger, HITL_EVENT_TYPES.created, makeDimensions());

    expect(logger.debug).toHaveBeenCalledTimes(1);
  });

  it('still logs when analytics is undefined', () => {
    reportHitlEvent(undefined, logger, HITL_EVENT_TYPES.timedOut, makeDimensions());

    expect(logger.debug).toHaveBeenCalledTimes(1);
  });

  it('logs a debug message and does not throw when analytics.reportEvent throws', () => {
    analytics.reportEvent.mockImplementation(() => {
      throw new Error('EBT error');
    });

    expect(() =>
      reportHitlEvent(analytics, logger, HITL_EVENT_TYPES.created, makeDimensions())
    ).not.toThrow();

    expect(logger.debug).toHaveBeenCalledTimes(2);
  });

  it('emits hitl.timed_out with correct responseSource unknown by default', () => {
    const dims = makeDimensions({ responseSource: 'unknown' });

    reportHitlEvent(analytics, logger, HITL_EVENT_TYPES.timedOut, dims);

    const [eventType, payload] = analytics.reportEvent.mock.calls[0];
    expect(eventType).toBe('hitl.timed_out');
    expect(payload).toMatchObject({ responseSource: 'unknown' });
  });

  it('emits hitl.responded with responseSource inbox', () => {
    const dims = makeDimensions({ responseSource: 'inbox', response_latency_ms: 1000 });

    reportHitlEvent(analytics, logger, HITL_EVENT_TYPES.responded, dims);

    const [eventType, payload] = analytics.reportEvent.mock.calls[0];
    expect(eventType).toBe('hitl.responded');
    expect(payload).toMatchObject({ responseSource: 'inbox', response_latency_ms: 1000 });
  });

  // Finding 1 — log-injection mitigation: err must be structured field, not interpolated
  it('passes err as structured meta when analytics.reportEvent throws, not interpolated in message', () => {
    const error = new Error('EBT-failure-text');
    analytics.reportEvent.mockImplementation(() => {
      throw error;
    });

    reportHitlEvent(analytics, logger, HITL_EVENT_TYPES.created, makeDimensions());

    const errorDebugCall = logger.debug.mock.calls[0];
    const msg = typeof errorDebugCall[0] === 'function' ? errorDebugCall[0]() : errorDebugCall[0];
    const meta = errorDebugCall[1] as Record<string, unknown> | undefined;
    expect(msg).not.toContain('EBT-failure-text');
    expect(meta).toMatchObject({ err: 'Error: EBT-failure-text' });
  });

  // Finding 2 — symmetric error handling: logger failure must not propagate
  it('does not throw when logger.debug throws', () => {
    logger.debug.mockImplementation(() => {
      throw new Error('logger-failure');
    });

    expect(() =>
      reportHitlEvent(analytics, logger, HITL_EVENT_TYPES.created, makeDimensions())
    ).not.toThrow();
  });

  it('still calls analytics.reportEvent when logger.debug throws', () => {
    logger.debug.mockImplementation(() => {
      throw new Error('logger-failure');
    });

    reportHitlEvent(analytics, logger, HITL_EVENT_TYPES.created, makeDimensions());

    expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
  });

  // Finding 3 — latency guard: invalid values must be dropped
  it('drops response_latency_ms from payload when value is negative', () => {
    const dims = makeDimensions({ response_latency_ms: -1 });

    reportHitlEvent(analytics, logger, HITL_EVENT_TYPES.responded, dims);

    const [, payload] = analytics.reportEvent.mock.calls[0];
    expect(payload).not.toHaveProperty('response_latency_ms');
  });

  it('drops response_latency_ms from payload when value is NaN', () => {
    const dims = makeDimensions({ response_latency_ms: NaN });

    reportHitlEvent(analytics, logger, HITL_EVENT_TYPES.responded, dims);

    const [, payload] = analytics.reportEvent.mock.calls[0];
    expect(payload).not.toHaveProperty('response_latency_ms');
  });

  it('includes response_latency_ms when value is zero', () => {
    const dims = makeDimensions({ response_latency_ms: 0 });

    reportHitlEvent(analytics, logger, HITL_EVENT_TYPES.responded, dims);

    const [, payload] = analytics.reportEvent.mock.calls[0];
    expect(payload).toMatchObject({ response_latency_ms: 0 });
  });

  // Finding 3 — latency guard: debug note logged via lazy call when latency is dropped
  it('emits a lazy debug note when response_latency_ms is invalid', () => {
    const dims = makeDimensions({ response_latency_ms: -5 });

    reportHitlEvent(analytics, logger, HITL_EVENT_TYPES.responded, dims);

    const latencyDebugCall = logger.debug.mock.calls[0];
    const msg =
      typeof latencyDebugCall[0] === 'function' ? latencyDebugCall[0]() : latencyDebugCall[0];
    expect(msg).toContain('response_latency_ms');
    expect(typeof latencyDebugCall[0]).toBe('function');
  });

  // Finding 6 — EBT schema registration contract: HITL_EVENT_TYPES values are stable
  it('exports the three expected HITL event type constants for EBT schema registration', () => {
    expect(HITL_EVENT_TYPES).toEqual({
      created: 'hitl.created',
      responded: 'hitl.responded',
      timedOut: 'hitl.timed_out',
    });
  });
});
