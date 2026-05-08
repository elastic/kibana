/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildExecutionPlan } from './run';
import { installSeededRandom } from './utils';
import type { GeneratorConfig } from './types';

const baseConfig: GeneratorConfig = {
  kibana: 'http://127.0.0.1:5601',
  node: 'http://127.0.0.1:9200',
  username: 'elastic',
  password: 'changeme',
  ssl: false,
  apiKey: '',
  space: '',
  owners: ['securitySolution', 'observability', 'cases'],
  count: 8,
  comments: 1,
  alerts: 2,
  events: 3,
  templates: [],
  templateOwners: [],
  templateSpace: '',
  spaces: null,
  ownerDistribution: null,
  analyticsOwners: ['securitySolution'],
  dryRun: false,
  seed: null,
  kibanaVersion: '9.2.0',
  cleanup: false,
  cleanupTag: 'auto-generated',
  concurrency: null,
};

describe('buildExecutionPlan', () => {
  it('computes owner-driven alert/event indexing totals', () => {
    const restoreRandom = installSeededRandom('plan-seed');
    try {
      const plan = buildExecutionPlan(baseConfig, ['space-a']);
      const onlySpace = plan.spacePlans[0];

      expect(onlySpace.totalCases).toBe(baseConfig.count);
      expect(plan.totals.cases).toBe(baseConfig.count);

      const countedCases = Object.values(onlySpace.ownerCaseCounts).reduce((sum, value) => sum + value, 0);
      expect(countedCases).toBe(baseConfig.count);

      const nonObservabilityCases =
        (onlySpace.ownerCaseCounts.securitySolution ?? 0) + (onlySpace.ownerCaseCounts.cases ?? 0);
      expect(onlySpace.eventDocsToIndex).toBe(nonObservabilityCases * baseConfig.events);

      const alertDocsCounted = Object.values(onlySpace.alertDocsToIndexByOwner).reduce(
        (sum, value) => sum + value,
        0
      );
      expect(alertDocsCounted).toBe(baseConfig.count * baseConfig.alerts);
    } finally {
      restoreRandom();
    }
  });

  it('is deterministic when the same seed is installed', () => {
    const restoreA = installSeededRandom('repeatable-seed');
    const firstPlan = (() => {
      try {
        return buildExecutionPlan(baseConfig, ['space-a', 'space-b']);
      } finally {
        restoreA();
      }
    })();

    const restoreB = installSeededRandom('repeatable-seed');
    try {
      const secondPlan = buildExecutionPlan(baseConfig, ['space-a', 'space-b']);
      expect(secondPlan).toEqual(firstPlan);
    } finally {
      restoreB();
    }
  });
});
