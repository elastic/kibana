/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveEvaluationTraceId } from './tracing';

const VALID_TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736';
const OTHER_TRACE_ID = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

describe('resolveEvaluationTraceId', () => {
  it('prefers task output traceId over the worker trace', () => {
    expect(
      resolveEvaluationTraceId({ traceId: VALID_TRACE_ID, messages: [] }, OTHER_TRACE_ID)
    ).toBe(VALID_TRACE_ID);
  });

  it('accepts serverTraceId as an alternate field', () => {
    expect(
      resolveEvaluationTraceId({ serverTraceId: VALID_TRACE_ID, messages: [] }, OTHER_TRACE_ID)
    ).toBe(VALID_TRACE_ID);
  });

  it('normalizes trace_id arrays from converse responses', () => {
    expect(
      resolveEvaluationTraceId({ traceId: [VALID_TRACE_ID], messages: [] }, OTHER_TRACE_ID)
    ).toBe(VALID_TRACE_ID);
  });

  it('falls back to the worker trace when task output has no server trace', () => {
    expect(resolveEvaluationTraceId({ messages: [] }, OTHER_TRACE_ID)).toBe(OTHER_TRACE_ID);
  });

  it('returns null when neither trace is available', () => {
    expect(resolveEvaluationTraceId({ messages: [] }, null)).toBeNull();
  });

  it('ignores invalid task trace IDs and falls back to worker trace', () => {
    expect(resolveEvaluationTraceId({ traceId: 'not-a-trace-id' }, OTHER_TRACE_ID)).toBe(
      OTHER_TRACE_ID
    );
  });
});
