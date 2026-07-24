/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { isNonRepresentableRule } from './is_non_representable';

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
      format: 'composed',
      base: 'FROM logs-*',
      breach: { segment: 'WHERE count > 10' },
    },
    ...overrides,
  } as unknown as RuleResponse);

describe('isNonRepresentableRule', () => {
  it('returns false for a standard composed alert rule', () => {
    expect(isNonRepresentableRule(createMockRule())).toBe(false);
  });

  it('returns false for a composed alert with recovery_strategy: query', () => {
    expect(
      isNonRepresentableRule(
        createMockRule({
          recovery_strategy: 'query',
          query: {
            format: 'composed',
            base: 'FROM logs-*',
            breach: { segment: 'WHERE count > 10' },
            recovery: { segment: 'WHERE count < 5' },
          },
        })
      )
    ).toBe(false);
  });

  it('returns false for signal rules (always representable)', () => {
    expect(
      isNonRepresentableRule(
        createMockRule({
          kind: 'signal',
          query: { format: 'standalone', breach: { query: 'FROM logs-*' } },
        })
      )
    ).toBe(false);
  });

  it('returns true for alert + standalone format', () => {
    expect(
      isNonRepresentableRule(
        createMockRule({
          query: { format: 'standalone', breach: { query: 'FROM logs-*' } },
        })
      )
    ).toBe(true);
  });

  it('returns false for recovery_strategy: no_breach', () => {
    expect(isNonRepresentableRule(createMockRule({ recovery_strategy: 'no_breach' }))).toBe(false);
  });

  it('returns false for recovery_strategy: none', () => {
    expect(isNonRepresentableRule(createMockRule({ recovery_strategy: 'none' }))).toBe(false);
  });

  it('returns false when recovery_strategy is null or undefined', () => {
    expect(
      isNonRepresentableRule({
        ...createMockRule(),
        recovery_strategy: null,
      } as unknown as RuleResponse)
    ).toBe(false);
    expect(isNonRepresentableRule(createMockRule({ recovery_strategy: undefined }))).toBe(false);
  });

  it('returns true for an unknown recovery_strategy value', () => {
    expect(
      isNonRepresentableRule(
        createMockRule({
          recovery_strategy: 'future_strategy' as RuleResponse['recovery_strategy'],
        })
      )
    ).toBe(true);
  });

  it('returns true for no_data_strategy: emit (not supported by form dropdown)', () => {
    expect(isNonRepresentableRule(createMockRule({ no_data_strategy: 'emit' }))).toBe(true);
  });

  it('returns false for supported no_data_strategy values', () => {
    expect(isNonRepresentableRule(createMockRule({ no_data_strategy: 'last_known_status' }))).toBe(
      false
    );
    expect(isNonRepresentableRule(createMockRule({ no_data_strategy: 'recover' }))).toBe(false);
    expect(isNonRepresentableRule(createMockRule({ no_data_strategy: 'none' }))).toBe(false);
  });
});
