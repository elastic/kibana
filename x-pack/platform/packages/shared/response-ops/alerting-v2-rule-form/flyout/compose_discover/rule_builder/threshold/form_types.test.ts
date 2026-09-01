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
  isMultiSeveritySupported,
  isSeveritySupported,
  isStatFieldValid,
  isStatLabelValid,
  nextStatLabel,
  reconcileAlertConditionMetrics,
  reconcileSeverity,
  shouldSyncConditionMetricOnLabelChange,
  syncConditionToSeverityThreshold,
  syncSeverityToConditionThreshold,
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

  describe('threshold coupling', () => {
    const multi = (levels: SeverityConfig['levels']): SeverityConfig => ({
      mode: 'multi',
      singleLevelSeverity: 'high',
      levels,
    });

    describe('syncSeverityToConditionThreshold', () => {
      it('mirrors the condition threshold onto the lowest multi level', () => {
        const result = syncSeverityToConditionThreshold(
          multi([
            { id: 'l1', severity: 'low', threshold: 0.8 },
            { id: 'l2', severity: 'high', threshold: 0.95 },
          ]),
          0.6
        );
        expect(result?.levels[0].threshold).toBe(0.6);
        expect(result?.levels[1].threshold).toBe(0.95);
      });

      it('leaves single mode untouched', () => {
        const single: SeverityConfig = { mode: 'single', singleLevelSeverity: 'high', levels: [] };
        expect(syncSeverityToConditionThreshold(single, 0.6)).toBe(single);
      });

      it('is a no-op for undefined severity or threshold', () => {
        expect(syncSeverityToConditionThreshold(undefined, 0.6)).toBeUndefined();
        const config = multi([{ id: 'l1', severity: 'low', threshold: 0.8 }]);
        expect(syncSeverityToConditionThreshold(config, undefined)).toBe(config);
      });
    });

    describe('syncConditionToSeverityThreshold', () => {
      it('mirrors the lowest multi level onto the single condition', () => {
        const result = syncConditionToSeverityThreshold(
          [condition(Comparator.GT)],
          multi([
            { id: 'l1', severity: 'low', threshold: 0.6 },
            { id: 'l2', severity: 'high', threshold: 0.95 },
          ])
        );
        expect(result[0].threshold).toEqual([0.6]);
      });

      it('preserves an upper bound if present', () => {
        const result = syncConditionToSeverityThreshold(
          [{ id: '1', metric: 'm', comparator: Comparator.GT, threshold: [100, 200] }],
          multi([{ id: 'l1', severity: 'low', threshold: 50 }])
        );
        expect(result[0].threshold).toEqual([50, 200]);
      });

      it('is a no-op for multiple conditions or single-mode severity', () => {
        const conditions = [condition(Comparator.GT), condition(Comparator.LT)];
        expect(syncConditionToSeverityThreshold(conditions, multi([]))).toBe(conditions);
        const single = [condition(Comparator.GT)];
        expect(
          syncConditionToSeverityThreshold(single, {
            mode: 'single',
            singleLevelSeverity: 'high',
            levels: [],
          })
        ).toBe(single);
      });
    });
  });
});
