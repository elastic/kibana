/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { RESOLUTION_RULE_IDS } from '../../../../../../common/domain/resolution_rules/constants';
import { migrate } from './migrate';
import { AUTOMATED_RESOLUTION_STATE_VERSION, type AutomatedResolutionState } from './types';

const EMAIL_RULE = RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH;

const ZEROED_STATS = {
  skippedOversizedBuckets: 0,
  skippedNoopBuckets: 0,
  cascadeRetargeted: 0,
  cascadesBlocked: 0,
};

const FIXTURES: Record<string, unknown> = {
  'clean-upgrade': {
    lastProcessedTimestamp: '2026-05-30T10:00:00Z',
    lastRun: { resolutionsCreated: 42, skippedAmbiguousBuckets: 3 },
  },
  'already-migrated-v2': {
    version: AUTOMATED_RESOLUTION_STATE_VERSION,
    rules: {
      [EMAIL_RULE]: {
        lastProcessedTimestamp: '2026-05-31T08:30:00Z',
        lastRun: { resolutionsCreated: 7, skippedAmbiguousBuckets: 1 },
      },
      some_future_rule: {
        lastProcessedTimestamp: '2026-06-01T09:00:00Z',
        lastRun: { resolutionsCreated: 2, skippedAmbiguousBuckets: 0 },
      },
    },
  },
  'already-migrated-no-version': {
    rules: {
      [EMAIL_RULE]: {
        lastProcessedTimestamp: '2026-05-31T08:30:00Z',
        lastRun: { resolutionsCreated: 7, skippedAmbiguousBuckets: 1 },
      },
    },
  },
  empty: {},
  'extra-fields': {
    lastProcessedTimestamp: '2026-05-29T14:15:00Z',
    lastRun: { resolutionsCreated: 13, skippedAmbiguousBuckets: 4, futureMetric: 99 },
    debugTraceId: 'upgrade-debug-1',
    futureMigrationHint: { writtenBy: 'future-version' },
  },
  'malformed-timestamp': {
    lastProcessedTimestamp: 'garbage',
    lastRun: { resolutionsCreated: 9, skippedAmbiguousBuckets: 2 },
  },
  partial: {
    lastProcessedTimestamp: '2026-05-30T10:00:00Z',
    lastRun: { resolutionsCreated: 42, skippedAmbiguousBuckets: 3 },
    rules: {
      [EMAIL_RULE]: {
        lastProcessedTimestamp: '2026-06-02T12:00:00Z',
        lastRun: { resolutionsCreated: 5, skippedAmbiguousBuckets: 0 },
      },
    },
  },
  'newer-than-current': {
    version: AUTOMATED_RESOLUTION_STATE_VERSION + 1,
    rules: {
      [EMAIL_RULE]: {
        lastProcessedTimestamp: '2026-07-01T00:00:00Z',
        lastRun: { resolutionsCreated: 1, skippedAmbiguousBuckets: 0, futureMetric: 99 },
      },
    },
  },
};

const expectNoLegacyTopLevelFields = (state: AutomatedResolutionState): void => {
  expect(Object.hasOwn(state, 'lastProcessedTimestamp')).toBe(false);
  expect(Object.hasOwn(state, 'lastRun')).toBe(false);
};

describe('automated-resolution state migration', () => {
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    logger = loggerMock.create();
  });

  it('resets the email watermark on a clean upgrade so case-split groups can heal', () => {
    const output = migrate(FIXTURES['clean-upgrade'], logger);

    expect(output.version).toBe(AUTOMATED_RESOLUTION_STATE_VERSION);
    expect(output.rules[EMAIL_RULE].lastProcessedTimestamp).toBeNull();
    expect(output.rules[EMAIL_RULE].lastRun).toEqual({
      resolutionsCreated: 42,
      skippedAmbiguousBuckets: 3,
      ...ZEROED_STATS,
    });
    expect(Object.keys(output.rules)).toEqual([EMAIL_RULE]);
    expectNoLegacyTopLevelFields(output);
  });

  it('preserves unknown rule ids on versioned state and sanitizes watermarks', () => {
    const output = migrate(FIXTURES['already-migrated-v2'], logger);

    expect(output.version).toBe(AUTOMATED_RESOLUTION_STATE_VERSION);
    expect(output.rules[EMAIL_RULE].lastProcessedTimestamp).toBe('2026-05-31T08:30:00Z');
    expect(output.rules.some_future_rule).toEqual({
      lastProcessedTimestamp: '2026-06-01T09:00:00Z',
      lastRun: { resolutionsCreated: 2, skippedAmbiguousBuckets: 0, ...ZEROED_STATS },
    });
  });

  it('resets the email watermark once when version is missing from per-rule state', () => {
    const output = migrate(FIXTURES['already-migrated-no-version'], logger);

    expect(output.version).toBe(AUTOMATED_RESOLUTION_STATE_VERSION);
    expect(output.rules[EMAIL_RULE].lastProcessedTimestamp).toBeNull();
    expect(output.rules[EMAIL_RULE].lastRun).toEqual({
      resolutionsCreated: 7,
      skippedAmbiguousBuckets: 1,
      ...ZEROED_STATS,
    });
  });

  it('yields an empty rules map for empty, null, or undefined state', () => {
    for (const input of [FIXTURES.empty, null, undefined]) {
      const output = migrate(input, logger);

      expect(output.rules).toEqual({});
      expect(output.version).toBe(AUTOMATED_RESOLUTION_STATE_VERSION);
      expectNoLegacyTopLevelFields(output);
    }
  });

  it('prefers the already-migrated email rule entry then resets it when version is missing', () => {
    const output = migrate(FIXTURES.partial, logger);

    expect(output.rules[EMAIL_RULE].lastProcessedTimestamp).toBeNull();
    expect(output.rules[EMAIL_RULE].lastRun).toEqual({
      resolutionsCreated: 5,
      skippedAmbiguousBuckets: 0,
      ...ZEROED_STATS,
    });
    expectNoLegacyTopLevelFields(output);
  });

  it('degrades a malformed timestamp to null without throwing', () => {
    const output = migrate(FIXTURES['malformed-timestamp'], logger);

    expect(output.rules[EMAIL_RULE].lastProcessedTimestamp).toBeNull();
    expect(output.rules[EMAIL_RULE].lastRun).toEqual({
      resolutionsCreated: 9,
      skippedAmbiguousBuckets: 2,
      ...ZEROED_STATS,
    });
    expectNoLegacyTopLevelFields(output);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('malformed'));
  });

  it('drops unrecognized top-level and lastRun fields', () => {
    const output = migrate(FIXTURES['extra-fields'], logger);

    expect(output.rules[EMAIL_RULE]).toEqual({
      lastProcessedTimestamp: null,
      lastRun: { resolutionsCreated: 13, skippedAmbiguousBuckets: 4, ...ZEROED_STATS },
    });
    expect(Object.keys(output)).toEqual(['version', 'rules']);
  });

  it('leaves a newer stored version alone, including its email watermark', () => {
    const input = FIXTURES['newer-than-current'];
    const output = migrate(input, logger);

    expect(output.version).toBe(AUTOMATED_RESOLUTION_STATE_VERSION + 1);
    expect(output.rules[EMAIL_RULE]).toEqual(
      (input as { rules: Record<string, unknown> }).rules[EMAIL_RULE]
    );
  });

  it('drops a malformed per-rule watermark instead of passing it through', () => {
    const output = migrate(
      {
        version: AUTOMATED_RESOLUTION_STATE_VERSION,
        rules: {
          [EMAIL_RULE]: {
            lastProcessedTimestamp: { not: 'a-string' },
            lastRun: { resolutionsCreated: 1, skippedAmbiguousBuckets: 0 },
          },
        },
      },
      logger
    );

    expect(output.rules[EMAIL_RULE].lastProcessedTimestamp).toBeNull();
    expect(output.rules[EMAIL_RULE].lastRun).toEqual({
      resolutionsCreated: 1,
      skippedAmbiguousBuckets: 0,
      ...ZEROED_STATS,
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('malformed'));
  });

  it('is idempotent across every fixture: migrate(migrate(s)) === migrate(s)', () => {
    for (const fixture of Object.values(FIXTURES)) {
      const once = migrate(fixture, logger);
      const twice = migrate(once, logger);
      expect(twice).toEqual(once);
      expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
    }
  });

  it('never throws on arbitrary malformed input', () => {
    const inputs: unknown[] = [
      42,
      'a string',
      [],
      [{ lastProcessedTimestamp: 'x' }],
      { rules: 'not-an-object' },
      { rules: { [EMAIL_RULE]: 'not-an-object' } },
      { lastRun: { resolutionsCreated: 'nope', skippedAmbiguousBuckets: 1 } },
    ];

    for (const input of inputs) {
      expect(() => migrate(input, logger)).not.toThrow();
    }
  });

  it('upgrade-safety: a 9.4.x single-rule state resets the email watermark for the lowercase rescan', () => {
    const productionState = {
      lastProcessedTimestamp: '2026-04-15T07:22:31.512Z',
      lastRun: { resolutionsCreated: 128, skippedAmbiguousBuckets: 6 },
    };

    const output = migrate(productionState, logger);

    expect(output.rules[EMAIL_RULE].lastProcessedTimestamp).toBeNull();
    expect(output.rules[EMAIL_RULE].lastRun).toEqual({
      ...productionState.lastRun,
      ...ZEROED_STATS,
    });
    expectNoLegacyTopLevelFields(output);
  });

  it('preserves related_user lastRun instead of coercing it into matcher stats', () => {
    const relatedUserId = RESOLUTION_RULE_IDS.RELATED_USER_ALIAS_RESOLUTION;
    const relatedLastRun = { seedsScanned: 10, linksCreated: 2 };

    const output = migrate(
      {
        version: AUTOMATED_RESOLUTION_STATE_VERSION,
        rules: {
          [relatedUserId]: {
            lastProcessedTimestamp: '2026-06-01T00:00:00Z',
            lastRun: relatedLastRun,
          },
        },
      },
      logger
    );

    expect(output.rules[relatedUserId].lastRun).toEqual(relatedLastRun);
  });
});
