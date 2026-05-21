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
  spaces: null,
  ownerDistribution: null,
  analyticsOwners: ['securitySolution'],
  dryRun: false,
  seed: null,
  kibanaVersion: '9.2.0',
  cleanup: false,
  cleanupTag: 'auto-generated',
  cleanupSpaces: null,
  templateUsagePercent: 50,
  legacyTemplates: false,
  legacyCustomFields: false,
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

      const countedCases = Object.values(onlySpace.ownerCaseCounts).reduce(
        (sum, value) => sum + value,
        0
      );
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

  it('produces a plan per target space and aggregates totals across them', () => {
    const restore = installSeededRandom('multi-space-seed');
    try {
      const plan = buildExecutionPlan(baseConfig, ['space-a', 'space-b', 'space-c']);

      expect(plan.spacePlans).toHaveLength(3);
      expect(plan.spacePlans.map((s) => s.space)).toEqual(['space-a', 'space-b', 'space-c']);
      expect(plan.totals.cases).toBe(baseConfig.count * 3);

      const aggregatedEvents = plan.spacePlans.reduce((sum, s) => sum + s.eventDocsToIndex, 0);
      expect(plan.totals.eventDocsToIndex).toBe(aggregatedEvents);

      const aggregatedAttachments = plan.spacePlans.reduce((sum, s) => sum + s.totalAttachments, 0);
      expect(plan.totals.attachments).toBe(aggregatedAttachments);
    } finally {
      restore();
    }
  });

  it('counts attachments as comments + alerts + events_for_non_observability per space', () => {
    const restore = installSeededRandom('attachments-seed');
    try {
      const plan = buildExecutionPlan(baseConfig, ['only-space']);
      const spacePlan = plan.spacePlans[0];
      const nonObsCount =
        (spacePlan.ownerCaseCounts.securitySolution ?? 0) + (spacePlan.ownerCaseCounts.cases ?? 0);
      const expectedAttachments =
        baseConfig.comments * baseConfig.count +
        baseConfig.alerts * baseConfig.count +
        baseConfig.events * nonObsCount;
      expect(spacePlan.totalAttachments).toBe(expectedAttachments);
    } finally {
      restore();
    }
  });

  it('omits zero-count owners from alertDocsToIndexByOwner', () => {
    const restore = installSeededRandom('owner-omission-seed');
    try {
      // Force every case to a single owner via an extreme distribution.
      const plan = buildExecutionPlan(
        {
          ...baseConfig,
          ownerDistribution: { securitySolution: 100, observability: 0, cases: 0 },
        },
        ['space-x']
      );
      const spacePlan = plan.spacePlans[0];
      expect(spacePlan.ownerCaseCounts.securitySolution).toBe(baseConfig.count);
      expect(spacePlan.ownerCaseCounts.observability).toBe(0);
      expect(spacePlan.ownerCaseCounts.cases).toBe(0);
      expect(spacePlan.alertDocsToIndexByOwner).toEqual({
        securitySolution: baseConfig.count * baseConfig.alerts,
      });
    } finally {
      restore();
    }
  });

  it('returns no alertDocsToIndexByOwner entries when alerts is zero', () => {
    const restore = installSeededRandom('no-alerts-seed');
    try {
      const plan = buildExecutionPlan({ ...baseConfig, alerts: 0 }, ['space-1']);
      expect(plan.spacePlans[0].alertDocsToIndexByOwner).toEqual({});
    } finally {
      restore();
    }
  });

  it('reports zero events when every case is owned by observability', () => {
    const restore = installSeededRandom('all-observability-seed');
    try {
      const plan = buildExecutionPlan(
        {
          ...baseConfig,
          owners: ['observability'],
          ownerDistribution: null,
        },
        ['obs-space']
      );
      const spacePlan = plan.spacePlans[0];
      expect(spacePlan.ownerCaseCounts.observability).toBe(baseConfig.count);
      expect(spacePlan.eventDocsToIndex).toBe(0);
      expect(plan.totals.eventDocsToIndex).toBe(0);
    } finally {
      restore();
    }
  });

  it('counts template creates as templates × templateOwners × target spaces', () => {
    const restore = installSeededRandom('templates-seed');
    try {
      const plan = buildExecutionPlan(
        {
          ...baseConfig,
          templates: [
            { name: 'T1', fieldTypes: [] },
            { name: 'T2', fieldTypes: [] },
            { name: 'T3', fieldTypes: [] },
          ],
          templateOwners: ['securitySolution', 'cases'],
        },
        ['space-a', 'space-b']
      );
      // 3 templates × 2 owners × 2 target spaces = 12 (templates are
      // space-scoped so each space gets its own copy).
      expect(plan.totals.templateCreates).toBe(12);
    } finally {
      restore();
    }
  });

  it('counts analytics updates as analyticsOwners × spaces', () => {
    const restore = installSeededRandom('analytics-seed');
    try {
      const plan = buildExecutionPlan(
        {
          ...baseConfig,
          analyticsOwners: ['securitySolution', 'observability'],
        },
        ['s1', 's2', 's3']
      );
      expect(plan.totals.analyticsUpdates).toBe(6);
    } finally {
      restore();
    }
  });

  it('treats a null analyticsOwners as zero analytics updates', () => {
    const restore = installSeededRandom('analytics-null-seed');
    try {
      const plan = buildExecutionPlan({ ...baseConfig, analyticsOwners: null }, ['only-space']);
      expect(plan.totals.analyticsUpdates).toBe(0);
    } finally {
      restore();
    }
  });

  it('returns an empty spacePlans array when no target spaces are supplied', () => {
    const restore = installSeededRandom('empty-spaces-seed');
    try {
      const plan = buildExecutionPlan(baseConfig, []);
      expect(plan.spacePlans).toEqual([]);
      expect(plan.totals).toEqual({
        cases: 0,
        attachments: 0,
        eventDocsToIndex: 0,
        templateCreates: 0,
        analyticsUpdates: 0,
      });
    } finally {
      restore();
    }
  });

  it('always returns a non-empty reqId', () => {
    const restore = installSeededRandom('reqid-seed');
    try {
      const plan = buildExecutionPlan(baseConfig, ['space-a']);
      expect(plan.reqId).toMatch(/^[0-9a-z]+$/);
      expect(plan.reqId.length).toBeGreaterThan(0);
    } finally {
      restore();
    }
  });

  it('emits a plan row for the default space when "" is included additively alongside created spaces', () => {
    const restore = installSeededRandom('additive-default-seed');
    try {
      const plan = buildExecutionPlan(baseConfig, ['', 'analytics-1', 'analytics-2']);
      expect(plan.spacePlans.map((s) => s.space)).toEqual(['', 'analytics-1', 'analytics-2']);
      expect(plan.totals.cases).toBe(baseConfig.count * 3);
      const defaultRow = plan.spacePlans.find((s) => s.space === '');
      expect(defaultRow).toBeDefined();
      expect(defaultRow?.totalCases).toBe(baseConfig.count);
    } finally {
      restore();
    }
  });

  it('does not let templateUsagePercent change planning totals', () => {
    const restore = installSeededRandom('template-usage-seed');
    try {
      const planAll = buildExecutionPlan({ ...baseConfig, templateUsagePercent: 100 }, ['space-a']);
      restore();
      const restore2 = installSeededRandom('template-usage-seed');
      try {
        const planNone = buildExecutionPlan({ ...baseConfig, templateUsagePercent: 0 }, [
          'space-a',
        ]);
        expect(planAll.totals).toEqual(planNone.totals);
      } finally {
        restore2();
      }
    } catch (err) {
      restore();
      throw err;
    }
  });
});
