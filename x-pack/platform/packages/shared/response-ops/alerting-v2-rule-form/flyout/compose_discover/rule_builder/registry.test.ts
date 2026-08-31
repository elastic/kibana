/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_BUILDER_REGISTRY, registerRuleBuilder } from './registry';
import { getRuleBuilderCreateOptions } from './create_options';
import type { RuleBuilderDefinition } from './types';
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
});

describe('registerRuleBuilder', () => {
  const contributedBuilder: RuleBuilderDefinition<{ metric: string }> = {
    type: 'contributed',
    createOption: {
      title: 'Contributed builder',
      description: 'Registered by another plugin.',
      iconType: 'machineLearningApp',
      order: 20,
    },
    stepTitle: 'Configure',
    createDefaultState: () => ({ metric: '' }),
    renderStep: () => null,
  };

  afterEach(() => {
    delete RULE_BUILDER_REGISTRY[contributedBuilder.type];
  });

  it('makes the builder resolvable by type', () => {
    registerRuleBuilder(contributedBuilder);

    expect(RULE_BUILDER_REGISTRY[contributedBuilder.type]).toBe(contributedBuilder);
  });

  it('adds the builder to the create options without any UI change', () => {
    registerRuleBuilder(contributedBuilder);

    expect(getRuleBuilderCreateOptions()).toEqual([
      expect.objectContaining({ type: 'threshold' }),
      expect.objectContaining({ type: 'contributed', title: 'Contributed builder' }),
    ]);
  });

  it('rejects a type that is already registered', () => {
    registerRuleBuilder(contributedBuilder);

    expect(() => registerRuleBuilder(contributedBuilder)).toThrow(
      'Rule builder "contributed" is already registered'
    );
  });
});
