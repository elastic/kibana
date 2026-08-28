/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scoreContinuationSeverityStability } from './continuation_severity_stability';

describe('scoreContinuationSeverityStability', () => {
  it('returns null when there is no establishing open event with severity', () => {
    const result = scoreContinuationSeverityStability([
      { producedEventIds: [], producedEvents: [] },
      {
        producedEventIds: ['event-1'],
        producedEvents: [{ event_id: 'event-1', status: 'open', severity: '60-high' }],
      },
    ]);

    expect(result.score).toBeNull();
    expect(result.comparableChecks).toBe(0);
  });

  it('returns null when follow-up cycles do not continue an established event', () => {
    const result = scoreContinuationSeverityStability([
      {
        producedEventIds: ['event-1'],
        producedEvents: [{ event_id: 'event-1', status: 'open', severity: '60-high' }],
      },
      {
        producedEventIds: ['event-2'],
        producedEvents: [{ event_id: 'event-2', status: 'open', severity: '40-medium' }],
        expectReuse: false,
      },
    ]);

    expect(result.score).toBeNull();
    expect(result.comparableChecks).toBe(0);
  });

  it('scores stable severity across reuse cycles as 1', () => {
    const result = scoreContinuationSeverityStability([
      {
        producedEventIds: ['event-1'],
        producedEvents: [{ event_id: 'event-1', status: 'open', severity: '60-high' }],
      },
      {
        producedEventIds: ['event-1'],
        producedEvents: [{ event_id: 'event-1', status: 'open', severity: '60-high' }],
      },
    ]);

    expect(result.score).toBe(1);
    expect(result.stableChecks).toBe(1);
    expect(result.comparableChecks).toBe(1);
  });

  it('allows severity escalation on continuation', () => {
    const result = scoreContinuationSeverityStability([
      {
        producedEventIds: ['event-1'],
        producedEvents: [{ event_id: 'event-1', status: 'open', severity: '60-high' }],
      },
      {
        producedEventIds: ['event-1'],
        producedEvents: [{ event_id: 'event-1', status: 'open', severity: '80-critical' }],
      },
    ]);

    expect(result.score).toBe(1);
    expect(result.stableChecks).toBe(1);
  });

  it('penalizes severity downgrades on reuse paths', () => {
    const result = scoreContinuationSeverityStability([
      {
        producedEventIds: ['event-1'],
        producedEvents: [{ event_id: 'event-1', status: 'open', severity: '60-high' }],
      },
      {
        producedEventIds: ['event-1'],
        producedEvents: [{ event_id: 'event-1', status: 'open', severity: '40-medium' }],
      },
    ]);

    expect(result.score).toBe(0);
    expect(result.stableChecks).toBe(0);
    expect(result.comparableChecks).toBe(1);
    expect(result.explanation).toContain('downgraded');
  });

  it('skips cycles where reuse is not expected', () => {
    const result = scoreContinuationSeverityStability([
      {
        producedEventIds: ['event-1'],
        producedEvents: [{ event_id: 'event-1', status: 'open', severity: '60-high' }],
      },
      {
        producedEventIds: ['event-1'],
        producedEvents: [{ event_id: 'event-1', status: 'open', severity: '20-low' }],
        expectReuse: false,
      },
    ]);

    expect(result.score).toBeNull();
    expect(result.comparableChecks).toBe(0);
  });
});
