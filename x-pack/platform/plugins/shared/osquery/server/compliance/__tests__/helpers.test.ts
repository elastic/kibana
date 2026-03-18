/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  calculatePostureScore,
  getMutedRuleKey,
  buildMutedRulesFilter,
  isComplianceScheduleId,
} from '../../../common/compliance/helpers';

describe('calculatePostureScore', () => {
  it('returns 0 when both passed and failed are 0', () => {
    expect(calculatePostureScore(0, 0)).toBe(0);
  });

  it('returns 100 when all checks pass', () => {
    expect(calculatePostureScore(10, 0)).toBe(100);
  });

  it('returns 0 when all checks fail', () => {
    expect(calculatePostureScore(0, 10)).toBe(0);
  });

  it('calculates correct percentage', () => {
    expect(calculatePostureScore(7, 3)).toBe(70);
  });

  it('rounds to one decimal', () => {
    expect(calculatePostureScore(1, 2)).toBe(33.3);
  });
});

describe('getMutedRuleKey', () => {
  it('creates composite key', () => {
    expect(getMutedRuleKey('cis_macos_15', 'v1.0.0', '2.1.1')).toBe('cis_macos_15;v1.0.0;2.1.1');
  });
});

describe('buildMutedRulesFilter', () => {
  it('returns empty array for no muted rules', () => {
    expect(buildMutedRulesFilter({})).toEqual([]);
  });

  it('returns empty array when rules are not muted', () => {
    const state = {
      'cis_macos_15;v1.0.0;2.1.1': {
        muted: false,
        benchmark_id: 'cis_macos_15',
        benchmark_version: 'v1.0.0',
        rule_number: '2.1.1',
      },
    };
    expect(buildMutedRulesFilter(state)).toEqual([]);
  });

  it('builds filter for muted rules', () => {
    const state = {
      'cis_macos_15;v1.0.0;2.1.1': {
        muted: true,
        benchmark_id: 'cis_macos_15',
        benchmark_version: 'v1.0.0',
        rule_number: '2.1.1',
      },
    };
    const filters = buildMutedRulesFilter(state);
    expect(filters).toHaveLength(1);
    expect(filters[0]).toEqual({
      bool: {
        must: [
          { term: { 'rule.benchmark.id': 'cis_macos_15' } },
          { term: { 'rule.benchmark.version': 'v1.0.0' } },
          { term: { 'rule.benchmark.rule_number': '2.1.1' } },
        ],
      },
    });
  });
});

describe('isComplianceScheduleId', () => {
  it('returns true for compliance schedule IDs', () => {
    expect(isComplianceScheduleId('compliance-cis_macos_15_2_1_1')).toBe(true);
  });

  it('returns false for non-compliance schedule IDs', () => {
    expect(isComplianceScheduleId('my-custom-pack')).toBe(false);
  });
});
