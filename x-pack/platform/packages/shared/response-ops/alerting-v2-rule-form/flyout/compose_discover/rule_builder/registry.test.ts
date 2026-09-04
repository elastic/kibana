/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_BUILDER_REGISTRY } from './registry';
import {
  Aggregation,
  Comparator,
  DEFAULT_THRESHOLD_FORM_VALUES,
  type ThresholdFormValues,
} from './threshold/form_types';
import type { ComposeDiscoverState } from '../types';

const STATE = {} as ComposeDiscoverState;

const makeValues = (overrides: Partial<ThresholdFormValues> = {}): ThresholdFormValues => ({
  ...DEFAULT_THRESHOLD_FORM_VALUES,
  indexPattern: 'logs-*',
  stats: [{ id: 'stat-1', label: 'count', aggregation: Aggregation.COUNT }],
  alertConditions: [{ id: 'cond-1', metric: 'count', comparator: Comparator.GT, threshold: [100] }],
  ...overrides,
});

describe('RULE_BUILDER_REGISTRY', () => {
  it('exposes flyoutTitle for the threshold builder', () => {
    expect(RULE_BUILDER_REGISTRY.threshold.createOption?.flyoutTitle).toBe('Create Threshold rule');
  });
});

describe('threshold builder validate', () => {
  const { validate } = RULE_BUILDER_REGISTRY.threshold;

  it('is valid when there are no evaluations', () => {
    expect(validate!(STATE, makeValues())).toBe(true);
  });

  it('is valid when every evaluation only references known labels', () => {
    const values = makeValues({
      evaluations: [{ id: 'eval-1', label: 'rate', expression: 'count / count' }],
    });

    expect(validate!(STATE, values)).toBe(true);
  });

  it('is valid when an evaluation expression is left blank', () => {
    const values = makeValues({
      evaluations: [{ id: 'eval-1', label: 'rate', expression: '' }],
    });

    expect(validate!(STATE, values)).toBe(true);
  });

  it('is invalid when an evaluation references an unknown label', () => {
    const values = makeValues({
      evaluations: [{ id: 'eval-1', label: 'rate', expression: 'count / unknown_total' }],
    });

    expect(validate!(STATE, values)).toBe(false);
  });

  it('is invalid when any one of several evaluations has an unknown reference', () => {
    const values = makeValues({
      evaluations: [
        { id: 'eval-1', label: 'rate', expression: 'count / count' },
        { id: 'eval-2', label: 'pct', expression: 'count / unknown_total * 100' },
      ],
    });

    expect(validate!(STATE, values)).toBe(false);
  });

  it('is valid with a well-formed multi-severity config', () => {
    const values = makeValues({
      severity: {
        mode: 'multi',
        singleLevelSeverity: 'high',
        // Every level is a band at or beyond the condition (100).
        levels: [
          { id: 'l1', severity: 'low', threshold: 100 },
          { id: 'l2', severity: 'high', threshold: 200 },
        ],
      },
    });

    expect(validate!(STATE, values)).toBe(true);
  });

  it('is invalid when multi-severity thresholds are out of order', () => {
    const values = makeValues({
      severity: {
        mode: 'multi',
        singleLevelSeverity: 'high',
        levels: [
          { id: 'l1', severity: 'low', threshold: 100 },
          { id: 'l2', severity: 'medium', threshold: 300 },
          { id: 'l3', severity: 'high', threshold: 200 },
        ],
      },
    });

    expect(validate!(STATE, values)).toBe(false);
  });

  it('is invalid when a stat is named severity while severity is configured', () => {
    const values = makeValues({
      stats: [{ id: 's1', label: 'severity', aggregation: Aggregation.COUNT }],
      alertConditions: [
        { id: 'cond-1', metric: 'severity', comparator: Comparator.GT, threshold: [100] },
      ],
      severity: { mode: 'single', singleLevelSeverity: 'high', levels: [] },
    });

    expect(validate!(STATE, values)).toBe(false);
  });

  it('is invalid when a group-by field is named severity while severity is configured', () => {
    const values = makeValues({
      groupByFields: ['severity'],
      severity: { mode: 'single', singleLevelSeverity: 'high', levels: [] },
    });

    expect(validate!(STATE, values)).toBe(false);
  });

  it('is invalid when severity is set with multiple alert conditions', () => {
    // ES|QL generation only emits severity for a single condition; without this guard a parsed
    // state like this would validate and then lose its severity EVAL on save.
    const values = makeValues({
      stats: [
        { id: 's1', label: 'count', aggregation: Aggregation.COUNT },
        { id: 's2', label: 'errors', aggregation: Aggregation.COUNT },
      ],
      alertConditions: [
        { id: 'cond-1', metric: 'count', comparator: Comparator.GT, threshold: [100] },
        { id: 'cond-2', metric: 'errors', comparator: Comparator.GT, threshold: [5] },
      ],
      severity: { mode: 'single', singleLevelSeverity: 'high', levels: [] },
    });

    expect(validate!(STATE, values)).toBe(false);
  });

  it('is invalid for multi-severity with a range comparator', () => {
    const values = makeValues({
      alertConditions: [
        { id: 'cond-1', metric: 'count', comparator: Comparator.BETWEEN, threshold: [100, 200] },
      ],
      severity: {
        mode: 'multi',
        singleLevelSeverity: 'high',
        levels: [
          { id: 'l1', severity: 'low', threshold: 120 },
          { id: 'l2', severity: 'high', threshold: 150 },
        ],
      },
    });

    expect(validate!(STATE, values)).toBe(false);
  });
});
