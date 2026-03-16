/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { analyzeCoverage } from './analyzer';
import type { EvalSuiteDefinition } from '../cli/suites';

const createMockSuite = (overrides: Partial<EvalSuiteDefinition>): EvalSuiteDefinition => ({
  id: 'test-suite',
  name: 'Test Suite',
  configPath: 'test/config.ts',
  absoluteConfigPath: '/repo/test/config.ts',
  suiteRoot: null,
  relativeSuiteRoot: null,
  tags: [],
  ciLabels: [],
  source: 'metadata' as const,
  ...overrides,
});

describe('analyzeCoverage', () => {
  describe('tool coverage', () => {
    it('reports full coverage when all tools have matching suites', () => {
      const suites = [
        createMockSuite({ id: 'search-tool', tags: ['search-tool'] }),
        createMockSuite({ id: 'index-tool', tags: ['index-tool'] }),
      ];

      const report = analyzeCoverage({
        repoRoot: '/repo',
        toolIds: ['search-tool', 'index-tool'],
        suites,
      });

      expect(report.overallToolCoveragePercent).toBe(100);
      expect(report.gaps).toHaveLength(0);
    });

    it('reports missing tools as gaps', () => {
      const suites = [createMockSuite({ id: 'search-tool', tags: ['search-tool'] })];

      const report = analyzeCoverage({
        repoRoot: '/repo',
        toolIds: ['search-tool', 'missing-tool'],
        suites,
      });

      expect(report.overallToolCoveragePercent).toBe(50);
      expect(report.gaps).toContain('Tool "missing-tool" has no covering eval suite');
    });

    it('handles empty tool list', () => {
      const report = analyzeCoverage({
        repoRoot: '/repo',
        toolIds: [],
        suites: [createMockSuite({})],
      });

      expect(report.overallToolCoveragePercent).toBe(100);
      expect(report.toolCoverage).toHaveLength(0);
    });

    it('matches tools by suite id containing tool id', () => {
      const suites = [createMockSuite({ id: 'agent-builder-search-tool-tests' })];

      const report = analyzeCoverage({
        repoRoot: '/repo',
        toolIds: ['search-tool'],
        suites,
      });

      expect(report.toolCoverage[0].coveredBy).toContain('agent-builder-search-tool-tests');
    });

    it('matches tools by suite description', () => {
      const suites = [
        createMockSuite({ id: 'ab-tests', description: 'Tests for the search-tool functionality' }),
      ];

      const report = analyzeCoverage({
        repoRoot: '/repo',
        toolIds: ['search-tool'],
        suites,
      });

      expect(report.toolCoverage[0].coveredBy).toHaveLength(1);
    });
  });

  describe('evaluator coverage', () => {
    it('reports evaluators used in suites', () => {
      const suites = [
        createMockSuite({ id: 'suite-a', tags: ['criteria'] }),
        createMockSuite({ id: 'suite-b', tags: ['criteria', 'correctness'] }),
      ];

      const report = analyzeCoverage({
        repoRoot: '/repo',
        evaluatorNames: ['criteria', 'correctness', 'latency'],
        suites,
      });

      expect(report.evaluatorCoverage.find((e) => e.evaluatorName === 'criteria')?.usedIn).toHaveLength(2);
      expect(report.evaluatorCoverage.find((e) => e.evaluatorName === 'latency')?.usedIn).toHaveLength(0);
      expect(report.gaps).toContain('Evaluator "latency" is not used in any suite');
    });

    it('reports 100% when no evaluator names given', () => {
      const report = analyzeCoverage({
        repoRoot: '/repo',
        evaluatorNames: [],
        suites: [],
      });

      expect(report.overallEvaluatorCoveragePercent).toBe(100);
    });
  });

  describe('gate readiness', () => {
    it('evaluates gate readiness when config and scores provided', () => {
      const report = analyzeCoverage({
        repoRoot: '/repo',
        suites: [],
        gateConfig: {
          evaluators: {
            criteria: { avg: 0.8 },
            correctness: { avg: 0.9 },
          },
        },
        actualScores: {
          criteria: 0.85,
          correctness: 0.7,
        },
      });

      expect(report.gateReadiness).toHaveLength(2);
      const criteriaGate = report.gateReadiness?.find((g) => g.evaluator === 'criteria');
      expect(criteriaGate?.meetsThreshold).toBe(true);

      const correctnessGate = report.gateReadiness?.find((g) => g.evaluator === 'correctness');
      expect(correctnessGate?.meetsThreshold).toBe(false);
    });

    it('omits gate readiness when no config provided', () => {
      const report = analyzeCoverage({
        repoRoot: '/repo',
        suites: [],
      });

      expect(report.gateReadiness).toBeUndefined();
    });

    it('uses min threshold as fallback when avg is absent', () => {
      const report = analyzeCoverage({
        repoRoot: '/repo',
        suites: [],
        gateConfig: {
          evaluators: {
            criteria: { min: 0.5 },
          },
        },
        actualScores: { criteria: 0.6 },
      });

      const gate = report.gateReadiness?.[0];
      expect(gate?.required).toBe(0.5);
      expect(gate?.meetsThreshold).toBe(true);
    });
  });

  describe('overall metrics', () => {
    it('computes correct overall percentages', () => {
      const suites = [
        createMockSuite({ id: 'tool-a-suite', tags: ['tool-a'] }),
      ];

      const report = analyzeCoverage({
        repoRoot: '/repo',
        toolIds: ['tool-a', 'tool-b', 'tool-c'],
        evaluatorNames: ['eval-x', 'eval-y'],
        suites,
      });

      expect(report.overallToolCoveragePercent).toBeCloseTo(33.33, 1);
      expect(report.overallEvaluatorCoveragePercent).toBe(0);
    });
  });
});
