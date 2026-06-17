/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Aggregation,
  Comparator,
  isStatFieldValid,
  isStatLabelValid,
  reconcileAlertConditionMetrics,
  shouldSyncConditionMetricOnLabelChange,
} from './form_types';

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
