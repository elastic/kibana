/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  classifyResponse,
  FAST_RETRY_INTERVAL_MS,
  jitter,
  MAX_WAIT_PER_RUN_MS,
  RENDER_RESERVE_MS,
  retryIntervalMs,
  SLOW_AFTER_MS,
  SLOW_RETRY_INTERVAL_MS,
  stopWaitingAt,
} from './retry_ladder';

describe('classifyResponse', () => {
  const renderError = (extra: Record<string, unknown> = {}) => ({
    error: 'failed',
    phase: 'page-load' as const,
    ...extra,
  });

  it.each([
    ['429 from the service', 429, 'saturated', undefined, 'capacity'],
    ['429 from a proxy', 429, null, undefined, 'capacity'],
    ['503 from a draining pod', 503, 'draining', undefined, 'capacity'],
    ['503 from a proxy', 503, null, undefined, 'unavailable'],
    ['502 from a proxy', 502, null, undefined, 'unavailable'],
    ['504 from a proxy', 504, null, undefined, 'unavailable'],
    ['400 invalid request', 400, null, renderError({ phase: 'navigation' }), 'unrecoverable'],
    ['401 caller authentication', 401, null, undefined, 'unrecoverable'],
    ['403 caller authorization', 403, null, undefined, 'unrecoverable'],
    ['413 body too large', 413, null, undefined, 'unrecoverable'],
    ['422 unprocessable', 422, null, undefined, 'unrecoverable'],
    ['500 render failure', 500, null, renderError(), 'render_failure'],
    ['500 with no service body', 500, null, undefined, 'render_failure'],
    ['504 phase timeout', 504, null, renderError(), 'render_failure'],
    ['502 page load failed', 502, null, renderError({ documentStatus: 500 }), 'render_failure'],
    ['502 Kibana refused 401', 502, null, renderError({ documentStatus: 401 }), 'unrecoverable'],
    ['502 Kibana refused 403', 502, null, renderError({ documentStatus: 403 }), 'unrecoverable'],
  ])('%s → %s', (_name, status, rejection, body, expected) => {
    expect(classifyResponse(status, rejection, body)).toBe(expected);
  });
});

describe('retryIntervalMs', () => {
  it('retries fast while the report is young, and slowly once it has waited four minutes', () => {
    expect(retryIntervalMs(0)).toBe(FAST_RETRY_INTERVAL_MS);
    expect(retryIntervalMs(SLOW_AFTER_MS - 1)).toBe(FAST_RETRY_INTERVAL_MS);
    expect(retryIntervalMs(SLOW_AFTER_MS)).toBe(SLOW_RETRY_INTERVAL_MS);
  });
});

describe('jitter', () => {
  it('spreads an interval across ±50%', () => {
    expect(jitter(2_000, () => 0)).toBe(1_000);
    expect(jitter(2_000, () => 0.5)).toBe(2_000);
    expect(jitter(2_000, () => 0.999)).toBe(2_998);
  });
});

describe('stopWaitingAt', () => {
  const start = 1_000_000;

  it('waits at most a minute per run', () => {
    expect(stopWaitingAt(start, undefined)).toBe(start + MAX_WAIT_PER_RUN_MS);
    expect(stopWaitingAt(start, start + 285_000)).toBe(start + MAX_WAIT_PER_RUN_MS);
  });

  it('keeps room for the render before the deadline', () => {
    // A 4m queue timeout, less the client's 15s margin.
    expect(stopWaitingAt(start, start + 225_000)).toBe(start + 225_000 - RENDER_RESERVE_MS);
  });
});
