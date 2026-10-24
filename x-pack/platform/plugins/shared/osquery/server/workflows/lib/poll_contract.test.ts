/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deriveStepStatus, parseWaitTimeoutMs } from './poll_contract';

describe('poll_contract', () => {
  describe('deriveStepStatus', () => {
    const counters = (overrides: Partial<Record<string, number>> = {}) => ({
      responded: 0,
      pending: 3,
      failed: 0,
      successful: 0,
      ...overrides,
    });

    it.each([
      ['deadline passed, nobody responded', counters(), true, 'timed_out'],
      ['deadline passed, none successful', counters({ responded: 2, failed: 2 }), true, 'failed'],
      [
        'deadline passed, some successful',
        counters({ responded: 2, successful: 2 }),
        true,
        'partial',
      ],
      [
        'deadline passed, finished with nothing failed',
        counters({ responded: 3, successful: 3, pending: 0 }),
        true,
        'success',
      ],
      [
        'deadline passed, finished with none successful',
        counters({ responded: 3, failed: 3, pending: 0 }),
        true,
        'failed',
      ],
      [
        'deadline passed, finished with some failed',
        counters({ responded: 3, successful: 2, failed: 1, pending: 0 }),
        true,
        'partial',
      ],
      [
        'nothing pending, nothing failed',
        counters({ responded: 3, successful: 3, pending: 0 }),
        false,
        'success',
      ],
      [
        'nothing pending, none successful',
        counters({ responded: 3, failed: 3, pending: 0 }),
        false,
        'failed',
      ],
      [
        'nothing pending, some failed',
        counters({ responded: 3, successful: 2, failed: 1, pending: 0 }),
        false,
        'partial',
      ],
      [
        'pending agents before the deadline',
        counters({ responded: 1, successful: 1, pending: 2 }),
        false,
        undefined,
      ],
    ])('%s', (_name, input, deadlinePassed, expected) => {
      expect(deriveStepStatus(input, deadlinePassed)).toBe(expected);
    });

    it('lets the deadline rows win over the pending rows', () => {
      expect(deriveStepStatus(counters({ pending: 0, responded: 0 }), true)).toBe('timed_out');
    });
  });

  describe('parseWaitTimeoutMs', () => {
    const bounds = { defaultMs: 300_000, maxMs: 1_800_000 };

    it('uses the default when the value is missing', () => {
      expect(parseWaitTimeoutMs(undefined, bounds)).toBe(300_000);
    });

    it('uses the default when the value is invalid', () => {
      expect(parseWaitTimeoutMs('soon', bounds)).toBe(300_000);
      expect(parseWaitTimeoutMs('0m', bounds)).toBe(300_000);
    });

    it('parses seconds, minutes and hours', () => {
      expect(parseWaitTimeoutMs('45s', bounds)).toBe(45_000);
      expect(parseWaitTimeoutMs('10m', bounds)).toBe(600_000);
      expect(parseWaitTimeoutMs('1h', bounds)).toBe(1_800_000);
    });

    it('clamps values above the cap', () => {
      expect(parseWaitTimeoutMs('5h', bounds)).toBe(1_800_000);
    });
  });
});
