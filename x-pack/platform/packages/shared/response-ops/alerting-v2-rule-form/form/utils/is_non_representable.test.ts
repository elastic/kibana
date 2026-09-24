/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { noDataStrategy, recoveryStrategy } from '@kbn/alerting-v2-schemas';
import { isNonRepresentableRule, isNonRepresentableFormState } from './is_non_representable';
import type { FormValues } from '../types';

const createMockRule = (overrides: Partial<RuleResponse> = {}): RuleResponse =>
  ({
    id: 'test-id',
    version: '1',
    kind: 'alert',
    enabled: true,
    metadata: { name: 'Test', description: '' },
    time_field: '@timestamp',
    schedule: { every: '5m', lookback: '1m' },
    query: {
      base: 'FROM logs-*',
      breach: { segment: 'WHERE count > 10' },
    },
    recovery: { strategy: recoveryStrategy.no_breach },
    no_data: { strategy: noDataStrategy.ignore },
    ...overrides,
  } as unknown as RuleResponse);

describe('isNonRepresentableRule', () => {
  it('returns false for a standard alert rule', () => {
    expect(isNonRepresentableRule(createMockRule())).toBe(false);
  });

  it('returns true for an alert rule with recovery.strategy: query', () => {
    expect(
      isNonRepresentableRule(
        createMockRule({
          recovery: { strategy: recoveryStrategy.query, query: 'FROM logs-* | WHERE count < 5' },
        })
      )
    ).toBe(true);
  });

  it('returns false for an alert rule with recovery.strategy: condition', () => {
    expect(
      isNonRepresentableRule(
        createMockRule({
          recovery: { strategy: recoveryStrategy.condition, segment: 'WHERE count < 5' },
        })
      )
    ).toBe(false);
  });

  it('returns false for recovery.strategy: no_breach', () => {
    expect(
      isNonRepresentableRule(createMockRule({ recovery: { strategy: recoveryStrategy.no_breach } }))
    ).toBe(false);
  });

  it('returns false for recovery.strategy: manual', () => {
    expect(
      isNonRepresentableRule(createMockRule({ recovery: { strategy: recoveryStrategy.manual } }))
    ).toBe(false);
  });

  it('returns false when recovery is null or undefined', () => {
    expect(
      isNonRepresentableRule({ ...createMockRule(), recovery: null } as unknown as RuleResponse)
    ).toBe(false);
    expect(isNonRepresentableRule(createMockRule({ recovery: undefined }))).toBe(false);
  });

  it('returns false for an unknown recovery strategy value', () => {
    expect(
      isNonRepresentableRule(
        createMockRule({
          recovery: { strategy: 'future_strategy' } as unknown as RuleResponse['recovery'],
        })
      )
    ).toBe(false);
  });

  it('returns false for a signal rule, which carries no recovery block', () => {
    expect(
      isNonRepresentableRule(
        createMockRule({ kind: 'signal', recovery: undefined, no_data: undefined })
      )
    ).toBe(false);
  });

  it.each([noDataStrategy.ignore, noDataStrategy.keep_last, noDataStrategy.resolve])(
    'returns false for no_data.strategy: %s',
    (strategy) => {
      expect(isNonRepresentableRule(createMockRule({ no_data: { strategy } }))).toBe(false);
    }
  );

  it('returns true for no_data.strategy: alert, which the strategy select omits', () => {
    expect(
      isNonRepresentableRule(createMockRule({ no_data: { strategy: noDataStrategy.alert } }))
    ).toBe(true);
  });

  it('returns true for a no_data presence query, which the form cannot show', () => {
    expect(
      isNonRepresentableRule(
        createMockRule({
          no_data: { strategy: noDataStrategy.keep_last, query: 'FROM heartbeat-* | LIMIT 1' },
        })
      )
    ).toBe(true);
  });

  it('returns false for a signal rule, whatever the alert-only blocks hold', () => {
    expect(
      isNonRepresentableRule({
        ...createMockRule({ kind: 'signal' }),
        no_data: { strategy: noDataStrategy.alert },
      } as unknown as RuleResponse)
    ).toBe(false);
  });
});

const baseFormValues: FormValues = {
  kind: 'alert',
  metadata: { name: 'Test', enabled: true },
  timeField: '@timestamp',
  schedule: { every: '5m', lookback: '1m' },
  query: { base: 'FROM logs-*', breach: { segment: 'WHERE count > 10' } },
  recovery: { strategy: recoveryStrategy.no_breach },
  noData: { strategy: noDataStrategy.ignore },
  stateTransitionAlertDelayMode: 'immediate',
  stateTransitionRecoveryDelayMode: 'immediate',
};

describe('isNonRepresentableFormState', () => {
  it('returns false for the form-authored alert shape', () => {
    expect(isNonRepresentableFormState(baseFormValues)).toBe(false);
  });

  it('returns true for alert + recovery.strategy: query', () => {
    expect(
      isNonRepresentableFormState({
        ...baseFormValues,
        recovery: { strategy: recoveryStrategy.query, query: 'FROM logs-* | WHERE count < 5' },
      })
    ).toBe(true);
  });

  it('returns false for alert + recovery.strategy: condition', () => {
    expect(
      isNonRepresentableFormState({
        ...baseFormValues,
        recovery: { strategy: recoveryStrategy.condition, segment: 'WHERE count < 5' },
      })
    ).toBe(false);
  });

  it('returns false for the form-authored signal shape', () => {
    const signalValues: FormValues = {
      ...baseFormValues,
      kind: 'signal',
      recovery: undefined,
      noData: undefined,
    };

    expect(isNonRepresentableFormState(signalValues)).toBe(false);
  });

  it('returns true for alert + noData.strategy: alert', () => {
    const values: FormValues = {
      ...baseFormValues,
      noData: { strategy: noDataStrategy.alert },
    };

    expect(isNonRepresentableFormState(values)).toBe(true);
  });

  it('returns true for alert + a noData presence query', () => {
    const values: FormValues = {
      ...baseFormValues,
      noData: { strategy: noDataStrategy.resolve, query: 'FROM heartbeat-* | LIMIT 1' },
    };

    expect(isNonRepresentableFormState(values)).toBe(true);
  });
});
