/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MutedRulesState } from './types';

export const calculatePostureScore = (passed: number, failed: number): number => {
  const total = passed + failed;
  if (total === 0) return 0;

  return Math.round((passed / total) * 1000) / 10;
};

export const getMutedRuleKey = (
  benchmarkId: string,
  benchmarkVersion: string,
  ruleNumber: string
): string => `${benchmarkId};${benchmarkVersion};${ruleNumber}`;

export const buildMutedRulesFilter = (rulesStates: MutedRulesState) => {
  const mutedEntries = Object.entries(rulesStates).filter(([, value]) => value.muted);

  return mutedEntries.map(([, rule]) => ({
    bool: {
      must: [
        { term: { 'rule.benchmark.id': rule.benchmark_id } },
        { term: { 'rule.benchmark.version': rule.benchmark_version } },
        { term: { 'rule.benchmark.rule_number': rule.rule_number } },
      ],
    },
  }));
};

export const isComplianceScheduleId = (scheduleId: string): boolean =>
  scheduleId.startsWith('compliance-');
