/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertCondition, SeverityConfig } from './form_types';
import {
  Aggregation,
  areAllStatsValid,
  Comparator,
  compareSeverity,
  getSeverityValidationError,
  normalizeSeverityOrder,
  nextSeverityLevel,
  nextSeverityThreshold,
  isMultiSeveritySupported,
  isSeveritySupported,
  isStatFieldValid,
  isStatLabelValid,
  nextStatLabel,
  reconcileAlertConditionMetrics,
  reconcileSeverity,
  shouldSyncConditionMetricOnLabelChange,
} from './form_types';

describe('nextStatLabel', () => {
  it('returns the base label when it is not already used', () => {
    expect(nextStatLabel([], Aggregation.COUNT)).toBe('count');
  });

  it('returns a suffixed label when the base label already exists', () => {
    expect(nextStatLabel(['count'], Aggregation.COUNT)).toBe('count_2');
    expect(nextStatLabel(['count', 'count_2'], Aggregation.COUNT)).toBe('count_3');
  });
});

describe('shouldSyncConditionMetricOnLabelChange', () => {
  it('returns false when multiple items share the old label', () => {
    expect(shouldSyncConditionMetricOnLabelChange(['count', 'count'], 1, 'count', 'errors')).toBe(
      false
    );
  });

  it('returns true when only the edited item owns the old label', () => {
    expect(shouldSyncConditionMetricOnLabelChange(['count', 'count_2'], 0, 'count', 'total')).toBe(
      true
    );
  });
});

describe('isStatLabelValid', () => {
  it('returns false when label is blank', () => {
    expect(isStatLabelValid({ id: '1', label: '  ', aggregation: Aggregation.COUNT })).toBe(false);
  });
});

describe('isStatFieldValid', () => {
  it('returns false when aggregation requires a field but none is set', () => {
    expect(isStatFieldValid({ id: '1', label: 'avg_val', aggregation: Aggregation.AVG })).toBe(
      false
    );
  });
});

describe('areAllStatsValid', () => {
  it('returns false when any stat has an invalid label', () => {
    expect(
      areAllStatsValid([
        { id: '1', label: 'count', aggregation: Aggregation.COUNT },
        { id: '2', label: '', aggregation: Aggregation.COUNT },
      ])
    ).toBe(false);
  });

  it('returns false when any stat is missing a required field', () => {
    expect(
      areAllStatsValid([
        { id: '1', label: 'count', aggregation: Aggregation.COUNT },
        { id: '2', label: 'avg_val', aggregation: Aggregation.AVG },
      ])
    ).toBe(false);
  });

  it('returns true only when every stat is valid', () => {
    expect(
      areAllStatsValid([
        { id: '1', label: 'count', aggregation: Aggregation.COUNT },
        { id: '2', label: 'errors', aggregation: Aggregation.COUNT },
      ])
    ).toBe(true);
  });
});

describe('reconcileAlertConditionMetrics', () => {
  it('restores the first available metric when the condition metric is missing', () => {
    const result = reconcileAlertConditionMetrics(
      [{ id: '1', metric: '', comparator: Comparator.GT, threshold: [100] }],
      [{ id: 's1', label: 'count', aggregation: Aggregation.COUNT }],
      []
    );

    expect(result[0].metric).toBe('count');
  });
});

describe('severity helpers', () => {
  const condition = (comparator: Comparator): AlertCondition => ({
    id: '1',
    metric: 'count',
    comparator,
    threshold: [100],
  });

  describe('isSeverityAvailable', () => {
    it('is true only for a single alert condition', () => {
      expect(isSeveritySupported([condition(Comparator.GT)])).toBe(true);
      expect(isSeveritySupported([condition(Comparator.GT), condition(Comparator.LT)])).toBe(false);
      expect(isSeveritySupported([])).toBe(false);
    });
  });

  describe('isMultiSeveritySupported', () => {
    it('is false for range comparators', () => {
      expect(isMultiSeveritySupported(Comparator.GT)).toBe(true);
      expect(isMultiSeveritySupported(Comparator.LTE)).toBe(true);
      expect(isMultiSeveritySupported(Comparator.BETWEEN)).toBe(false);
      expect(isMultiSeveritySupported(Comparator.NOT_BETWEEN)).toBe(false);
    });
  });

  describe('reconcileSeverity', () => {
    const severity = { mode: 'multi' as const, singleLevelSeverity: 'high' as const, levels: [] };

    it('clears severity for multiple conditions', () => {
      expect(
        reconcileSeverity(severity, [condition(Comparator.GT), condition(Comparator.LT)])
      ).toBeUndefined();
    });

    it('downgrades multi to single for range comparators', () => {
      expect(reconcileSeverity(severity, [condition(Comparator.BETWEEN)])).toEqual({
        ...severity,
        mode: 'single',
      });
    });

    it('keeps a valid multi config unchanged', () => {
      expect(reconcileSeverity(severity, [condition(Comparator.GT)])).toEqual(severity);
    });

    it('passes through undefined', () => {
      expect(reconcileSeverity(undefined, [condition(Comparator.GT)])).toBeUndefined();
    });
  });

  describe('compareSeverity', () => {
    it('orders by ascending severity', () => {
      expect(compareSeverity('low', 'high')).toBeLessThan(0);
      expect(compareSeverity('critical', 'info')).toBeGreaterThan(0);
      expect(compareSeverity('medium', 'medium')).toBe(0);
    });
  });

  describe('normalizeSeverityOrder', () => {
    it('sorts multi levels least-to-most severe (keeps each level threshold)', () => {
      const result = normalizeSeverityOrder({
        mode: 'multi',
        singleLevelSeverity: 'high',
        levels: [
          { id: 'a', severity: 'critical', threshold: 0.95 },
          { id: 'b', severity: 'medium', threshold: 0.9 },
        ],
      });
      expect(result?.levels.map((l) => [l.severity, l.threshold])).toEqual([
        ['medium', 0.9],
        ['critical', 0.95],
      ]);
    });

    it('leaves single mode and undefined untouched', () => {
      const single: SeverityConfig = { mode: 'single', singleLevelSeverity: 'high', levels: [] };
      expect(normalizeSeverityOrder(single)).toBe(single);
      expect(normalizeSeverityOrder(undefined)).toBeUndefined();
    });
  });

  describe('nextSeverityLevel', () => {
    it('returns the next unused level above the most severe one used', () => {
      expect(nextSeverityLevel([{ id: 'a', severity: 'low', threshold: 1 }])).toBe('medium');
      expect(
        nextSeverityLevel([
          { id: 'a', severity: 'low', threshold: 1 },
          { id: 'b', severity: 'medium', threshold: 2 },
        ])
      ).toBe('high');
    });

    it('fills a lower gap when nothing above the max is free', () => {
      expect(nextSeverityLevel([{ id: 'a', severity: 'critical', threshold: 1 }])).toBe('info');
      expect(
        nextSeverityLevel([
          { id: 'a', severity: 'medium', threshold: 1 },
          { id: 'b', severity: 'high', threshold: 2 },
          { id: 'c', severity: 'critical', threshold: 3 },
        ])
      ).toBe('info');
    });

    it('never repeats an already-used level', () => {
      const levels = [
        { id: 'a', severity: 'info' as const, threshold: 1 },
        { id: 'b', severity: 'low' as const, threshold: 2 },
        { id: 'c', severity: 'high' as const, threshold: 3 },
        { id: 'd', severity: 'critical' as const, threshold: 4 },
      ];
      // Only `medium` is free.
      expect(nextSeverityLevel(levels)).toBe('medium');
    });

    it('falls back to the lowest level when there are none', () => {
      expect(nextSeverityLevel([])).toBe('info');
    });
  });

  describe('nextSeverityThreshold', () => {
    const cond = (comparator: Comparator, threshold: number[]): AlertCondition => ({
      id: 'c1',
      metric: 'cpu',
      comparator,
      threshold,
    });

    it('seeds the first band at the condition threshold', () => {
      expect(nextSeverityThreshold([], 'high', cond(Comparator.GT, [80]))).toBe(80);
      expect(nextSeverityThreshold([], 'high', cond(Comparator.LT, [500]))).toBe(500);
    });

    it('appends one step beyond the current extreme (ascending / descending)', () => {
      const ascending = nextSeverityThreshold(
        [{ id: 'a', severity: 'low', threshold: 80 }],
        'high',
        cond(Comparator.GT, [80])
      );
      expect(ascending).toBe(81);
      const descending = nextSeverityThreshold(
        [{ id: 'a', severity: 'low', threshold: 500 }],
        'high',
        cond(Comparator.LT, [500])
      );
      expect(descending).toBe(499);
    });

    it('places a gap-filling band between its severity neighbours', () => {
      // Adding `medium` between `low` (80) and `high` (100) lands on the midpoint.
      const value = nextSeverityThreshold(
        [
          { id: 'a', severity: 'low', threshold: 80 },
          { id: 'b', severity: 'high', threshold: 100 },
        ],
        'medium',
        cond(Comparator.GT, [80])
      );
      expect(value).toBe(90);
    });
  });

  describe('getSeverityValidationError', () => {
    const multi = (levels: SeverityConfig['levels']): SeverityConfig => ({
      mode: 'multi',
      singleLevelSeverity: 'high',
      levels,
    });
    const cond = (comparator: Comparator, threshold: number[]): AlertCondition => ({
      id: 'c1',
      metric: 'cpu',
      comparator,
      threshold,
    });

    it('accepts disabled and single-mode severity', () => {
      expect(getSeverityValidationError(undefined, cond(Comparator.GT, [0]))).toBeNull();
      expect(
        getSeverityValidationError(
          { mode: 'single', singleLevelSeverity: 'high', levels: [] },
          cond(Comparator.LT, [0])
        )
      ).toBeNull();
    });

    it('accepts ascending band thresholds beyond the condition (> comparator)', () => {
      // Every level is a band; each sits at or beyond the condition (0.8) and is ordered.
      expect(
        getSeverityValidationError(
          multi([
            { id: 'a', severity: 'low', threshold: 0.8 },
            { id: 'b', severity: 'medium', threshold: 0.9 },
            { id: 'c', severity: 'high', threshold: 0.95 },
          ]),
          cond(Comparator.GT, [0.8])
        )
      ).toBeNull();
    });

    it('accepts descending band thresholds beyond the condition (< comparator)', () => {
      expect(
        getSeverityValidationError(
          multi([
            { id: 'a', severity: 'low', threshold: 450 },
            { id: 'b', severity: 'medium', threshold: 300 },
            { id: 'c', severity: 'high', threshold: 100 },
          ]),
          cond(Comparator.LT, [500])
        )
      ).toBeNull();
    });

    it('requires at least two levels for multi mode', () => {
      expect(getSeverityValidationError(multi([]), cond(Comparator.GT, [0]))).toBe(
        'invalid_threshold'
      );
      expect(
        getSeverityValidationError(
          multi([{ id: 'a', severity: 'low', threshold: 0 }]),
          cond(Comparator.GT, [0])
        )
      ).toBe('invalid_threshold');
    });

    it('flags a non-finite band threshold', () => {
      expect(
        getSeverityValidationError(
          multi([
            { id: 'a', severity: 'low', threshold: 0 },
            { id: 'b', severity: 'high', threshold: NaN },
          ]),
          cond(Comparator.GT, [0.8])
        )
      ).toBe('invalid_threshold');
    });

    it('flags duplicate severity levels', () => {
      expect(
        getSeverityValidationError(
          multi([
            { id: 'a', severity: 'low', threshold: 0 },
            { id: 'b', severity: 'low', threshold: 2 },
          ]),
          cond(Comparator.GT, [1])
        )
      ).toBe('duplicate_level');
    });

    it('flags a band that is not beyond the condition threshold', () => {
      // Ascending: a band below the condition (0.8) would swallow every breaching row.
      expect(
        getSeverityValidationError(
          multi([
            { id: 'a', severity: 'low', threshold: 0 },
            { id: 'b', severity: 'high', threshold: 0.7 },
          ]),
          cond(Comparator.GT, [0.8])
        )
      ).toBe('threshold_below_condition');
      // Descending: symmetric — a band above the condition is invalid.
      expect(
        getSeverityValidationError(
          multi([
            { id: 'a', severity: 'low', threshold: 0 },
            { id: 'b', severity: 'high', threshold: 600 },
          ]),
          cond(Comparator.LT, [500])
        )
      ).toBe('threshold_below_condition');
    });

    it('flags duplicate band thresholds', () => {
      expect(
        getSeverityValidationError(
          multi([
            { id: 'a', severity: 'low', threshold: 1 },
            { id: 'b', severity: 'medium', threshold: 2 },
            { id: 'c', severity: 'high', threshold: 2 },
          ]),
          cond(Comparator.GT, [1])
        )
      ).toBe('duplicate_threshold');
    });

    it('flags bands not ordered by severity (ascending)', () => {
      expect(
        getSeverityValidationError(
          multi([
            { id: 'a', severity: 'low', threshold: 0.8 },
            { id: 'b', severity: 'medium', threshold: 0.95 },
            { id: 'c', severity: 'high', threshold: 0.9 },
          ]),
          cond(Comparator.GT, [0.8])
        )
      ).toBe('threshold_order');
    });

    it('flags bands not ordered by severity (descending)', () => {
      expect(
        getSeverityValidationError(
          multi([
            { id: 'a', severity: 'low', threshold: 0 },
            { id: 'b', severity: 'medium', threshold: 100 },
            { id: 'c', severity: 'high', threshold: 300 },
          ]),
          cond(Comparator.LT, [500])
        )
      ).toBe('threshold_order');
    });
  });
});
