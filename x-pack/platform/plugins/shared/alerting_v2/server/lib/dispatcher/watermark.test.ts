/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeNextWatermark } from './watermark';
import { createAlert, createDispatcherPipelineInput } from './fixtures/test_utils';
import { AlertScan, DispatchOutcome } from './state';
import type { DispatcherPipelineResult } from './types';

const BASE_INPUT = createDispatcherPipelineInput({
  eventWatermark: new Date('2026-01-22T07:30:00.000Z'),
  windowStart: new Date('2026-01-22T07:20:00.000Z'),
  windowEnd: new Date('2026-01-22T07:35:00.000Z'),
});

const makeResult = (overrides: Partial<DispatcherPipelineResult>): DispatcherPipelineResult => ({
  completed: true,
  finalState: { input: BASE_INPUT },
  ...overrides,
});

describe('computeNextWatermark', () => {
  describe('aborted', () => {
    it('does not advance the watermark', () => {
      const result = computeNextWatermark({
        input: BASE_INPUT,
        result: makeResult({
          completed: false,
          haltReason: 'aborted',
          finalState: { input: BASE_INPUT },
        }),
      });

      expect(result.toISOString()).toBe('2026-01-22T07:30:00.000Z');
    });

    it('uses eventWatermark even when alerts are fetched but not recorded', () => {
      const result = computeNextWatermark({
        input: BASE_INPUT,
        result: makeResult({
          completed: false,
          haltReason: 'aborted',
          finalState: {
            input: BASE_INPUT,
            scan: AlertScan.of({
              alerts: [createAlert({ last_event_timestamp: '2026-01-22T07:34:00.000Z' })],
            }),
          },
        }),
      });

      expect(result.toISOString()).toBe('2026-01-22T07:30:00.000Z');
    });
  });

  describe('aborted after recording some alerts', () => {
    it('holds even when the tick recorded alerts', () => {
      const result = computeNextWatermark({
        input: BASE_INPUT,
        result: makeResult({
          completed: false,
          haltReason: 'aborted',
          finalState: {
            input: BASE_INPUT,
            outcome: DispatchOutcome.of({
              executionsByGroup: new Map([['g1', ['exec-1']]]),
              failures: [],
            }),
          },
        }),
      });

      expect(result.toISOString()).toBe('2026-01-22T07:30:00.000Z');
    });
  });

  describe('inline_stats_too_large halt', () => {
    it('does not advance the watermark', () => {
      const result = computeNextWatermark({
        input: BASE_INPUT,
        result: makeResult({ completed: false, haltReason: 'inline_stats_too_large' }),
      });

      expect(result.toISOString()).toBe('2026-01-22T07:30:00.000Z');
    });

    it('holds even when scan is empty (no alerts fetched)', () => {
      const result = computeNextWatermark({
        input: BASE_INPUT,
        result: makeResult({
          completed: false,
          haltReason: 'inline_stats_too_large',
          finalState: { input: BASE_INPUT },
        }),
      });

      expect(result.toISOString()).toBe('2026-01-22T07:30:00.000Z');
    });
  });

  describe('no_alerts halt', () => {
    it('advances to windowEnd', () => {
      const result = computeNextWatermark({
        input: BASE_INPUT,
        result: makeResult({ completed: false, haltReason: 'no_alerts' }),
      });

      expect(result.toISOString()).toBe('2026-01-22T07:35:00.000Z');
    });
  });

  describe('no_actions halt', () => {
    it('advances to windowEnd', () => {
      const result = computeNextWatermark({
        input: BASE_INPUT,
        result: makeResult({ completed: false, haltReason: 'no_actions' }),
      });

      expect(result.toISOString()).toBe('2026-01-22T07:35:00.000Z');
    });
  });

  describe('truncated scan', () => {
    it('advances to the last fetched alert timestamp', () => {
      const alerts = [
        createAlert({ alert_id: 'e1', last_event_timestamp: '2026-01-22T07:21:00.000Z' }),
        createAlert({ alert_id: 'e2', last_event_timestamp: '2026-01-22T07:28:00.000Z' }),
        createAlert({ alert_id: 'e3', last_event_timestamp: '2026-01-22T07:33:00.000Z' }),
      ];

      const result = computeNextWatermark({
        input: BASE_INPUT,
        result: makeResult({
          finalState: {
            input: BASE_INPUT,
            scan: AlertScan.of({ alerts, truncated: true }),
          },
        }),
      });

      expect(result.toISOString()).toBe('2026-01-22T07:33:00.000Z');
    });

    it('uses eventWatermark when alerts array is empty (degenerate)', () => {
      const result = computeNextWatermark({
        input: BASE_INPUT,
        result: makeResult({
          finalState: {
            input: BASE_INPUT,
            scan: AlertScan.of({ alerts: [], truncated: true }),
          },
        }),
      });

      expect(result.toISOString()).toBe('2026-01-22T07:30:00.000Z');
    });

    it('truncated wins over windowEnd even when last row is older than windowEnd', () => {
      const alerts = [
        createAlert({ alert_id: 'e1', last_event_timestamp: '2026-01-22T07:21:00.000Z' }),
        // last_event_timestamp deliberately before windowEnd (07:35)
        createAlert({ alert_id: 'e2', last_event_timestamp: '2026-01-22T07:31:00.000Z' }),
      ];

      const result = computeNextWatermark({
        input: BASE_INPUT,
        result: makeResult({
          finalState: {
            input: BASE_INPUT,
            scan: AlertScan.of({ alerts, truncated: true }),
          },
        }),
      });

      expect(result.toISOString()).toBe('2026-01-22T07:31:00.000Z');
    });
  });

  describe('normal completion (not truncated)', () => {
    it('advances to windowEnd', () => {
      const result = computeNextWatermark({
        input: BASE_INPUT,
        result: makeResult({
          completed: true,
          finalState: {
            input: BASE_INPUT,
            scan: AlertScan.of({ alerts: [createAlert()] }),
          },
        }),
      });

      expect(result.toISOString()).toBe('2026-01-22T07:35:00.000Z');
    });
  });

  describe('never regress', () => {
    it('clamps to eventWatermark when computed result would be earlier', () => {
      // Degenerate: windowEnd < eventWatermark (should never happen in practice
      // since dispatcher skips the scan, but the clamp is a hard guard).
      const input = createDispatcherPipelineInput({
        eventWatermark: new Date('2026-01-22T07:30:00.000Z'),
        windowStart: new Date('2026-01-22T07:10:00.000Z'),
        windowEnd: new Date('2026-01-22T07:20:00.000Z'), // < eventWatermark
      });

      const result = computeNextWatermark({
        input,
        result: makeResult({ haltReason: 'no_alerts', finalState: { input } }),
      });

      expect(result.toISOString()).toBe('2026-01-22T07:30:00.000Z');
    });
  });
});
