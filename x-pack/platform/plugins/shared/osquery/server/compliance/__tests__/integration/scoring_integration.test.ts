/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ComplianceScoringService } from '../../services/compliance_scoring_service';
import { FindingEvaluatorService } from '../../services/finding_evaluator_service';
import { ExceptionManagementService } from '../../services/exception_management_service';

/**
 * Integration tests for compliance scoring accuracy
 * Tests score calculations with various scenarios, exception handling, and edge cases
 */
describe('Scoring Integration', () => {
  let esClient: ElasticsearchClient;
  let scoringService: ComplianceScoringService;
  let evaluatorService: FindingEvaluatorService;
  let exceptionService: ExceptionManagementService;

  beforeAll(() => {
    // Setup services
  });

  describe('Score Calculation Accuracy', () => {
    it('should calculate correct score with all passed findings', async () => {
      const testId = `score-all-pass-${Date.now()}`;

      // Index 10 passed findings
      for (let i = 0; i < 10; i++) {
        await esClient.index({
          index: 'compliance-findings-latest-default',
          document: {
            '@timestamp': new Date().toISOString(),
            result: { evaluation: 'passed' },
            rule: { id: `${testId}-rule-${i}` },
            host: { id: testId },
          },
        });
      }

      await esClient.indices.refresh({ index: 'compliance-findings-latest-default' });

      // Calculate score for host
      const score = await scoringService.calculateHostScore(testId);

      expect(score).toBe(100); // All passed = 100%
    });

    it('should calculate correct score with all failed findings', async () => {
      const testId = `score-all-fail-${Date.now()}`;

      // Index 10 failed findings
      for (let i = 0; i < 10; i++) {
        await esClient.index({
          index: 'compliance-findings-latest-default',
          document: {
            '@timestamp': new Date().toISOString(),
            result: { evaluation: 'failed' },
            rule: { id: `${testId}-rule-${i}` },
            host: { id: testId },
          },
        });
      }

      await esClient.indices.refresh({ index: 'compliance-findings-latest-default' });

      const score = await scoringService.calculateHostScore(testId);

      expect(score).toBe(0); // All failed = 0%
    });

    it('should calculate correct score with mixed findings', async () => {
      const testId = `score-mixed-${Date.now()}`;

      // Index 7 passed + 3 failed = 70% compliance
      for (let i = 0; i < 10; i++) {
        await esClient.index({
          index: 'compliance-findings-latest-default',
          document: {
            '@timestamp': new Date().toISOString(),
            result: { evaluation: i < 7 ? 'passed' : 'failed' },
            rule: { id: `${testId}-rule-${i}` },
            host: { id: testId },
          },
        });
      }

      await esClient.indices.refresh({ index: 'compliance-findings-latest-default' });

      const score = await scoringService.calculateHostScore(testId);

      expect(score).toBe(70); // 7/10 = 70%
    });

    it('should weight findings by rule level', async () => {
      const testId = `score-weighted-${Date.now()}`;

      // Index 1 critical failed (level 1) + 9 low passed (level 2)
      await esClient.index({
        index: 'compliance-findings-latest-default',
        document: {
          '@timestamp': new Date().toISOString(),
          result: { evaluation: 'failed' },
          rule: { id: `${testId}-critical`, level: 1 },
          host: { id: testId },
        },
      });

      for (let i = 0; i < 9; i++) {
        await esClient.index({
          index: 'compliance-findings-latest-default',
          document: {
            '@timestamp': new Date().toISOString(),
            result: { evaluation: 'passed' },
            rule: { id: `${testId}-low-${i}`, level: 2 },
            host: { id: testId },
          },
        });
      }

      await esClient.indices.refresh({ index: 'compliance-findings-latest-default' });

      const score = await scoringService.calculateHostScore(testId);

      // Weighted score should be lower than 90% (if all findings weighted equally)
      expect(score).toBeLessThan(90);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('Exception Impact on Scoring', () => {
    it('should exclude excepted findings from score calculation', async () => {
      const testId = `exception-score-${Date.now()}`;
      const testRuleId = `${testId}-rule`;

      // Index failed finding
      await esClient.index({
        index: 'compliance-findings-latest-default',
        document: {
          '@timestamp': new Date().toISOString(),
          result: { evaluation: 'failed' },
          rule: { id: testRuleId },
          host: { id: testId },
        },
        refresh: true,
      });

      // Calculate score before exception
      const scoreBefore = await scoringService.calculateHostScore(testId);
      expect(scoreBefore).toBeLessThan(100); // Has failed finding

      // Create exception
      await exceptionService.createException({
        scope: { type: 'host', target_id: testId },
        rule_criteria: { rule_ids: [testRuleId] },
        host_criteria: { host_ids: [testId] },
      });

      // Calculate score after exception
      const scoreAfter = await scoringService.calculateHostScore(testId, {
        includeExceptions: true,
      });

      // Score should improve (excepted finding not counted)
      expect(scoreAfter).toBeGreaterThan(scoreBefore);
    });

    it('should handle global exceptions affecting all hosts', async () => {
      const testRuleId = `global-exception-${Date.now()}`;

      // Index failed findings for 3 hosts
      const hosts = ['host-a', 'host-b', 'host-c'];
      for (const host of hosts) {
        await esClient.index({
          index: 'compliance-findings-latest-default',
          document: {
            '@timestamp': new Date().toISOString(),
            result: { evaluation: 'failed' },
            rule: { id: testRuleId },
            host: { id: host },
          },
        });
      }

      await esClient.indices.refresh({ index: 'compliance-findings-latest-default' });

      // Create global exception
      await exceptionService.createException({
        scope: { type: 'global' },
        rule_criteria: { rule_ids: [testRuleId] },
      });

      // Verify all hosts' scores improve
      for (const host of hosts) {
        const score = await scoringService.calculateHostScore(host, { includeExceptions: true });

        // Should be higher with exception applied
        expect(score).toBeGreaterThan(0);
      }
    });
  });

  describe('Finding Evaluator', () => {
    it('should evaluate query results correctly - passed', async () => {
      const queryResults = {
        rows: [], // Empty results
      };

      const evaluation = await evaluatorService.evaluateFinding({
        query: 'SELECT * FROM processes WHERE name = "forbidden";',
        results: queryResults,
        expectedState: 'empty', // No forbidden processes should exist
      });

      expect(evaluation).toBe('passed');
    });

    it('should evaluate query results correctly - failed', async () => {
      const queryResults = {
        rows: [{ name: 'forbidden-process', pid: 1234 }],
      };

      const evaluation = await evaluatorService.evaluateFinding({
        query: 'SELECT * FROM processes WHERE name = "forbidden";',
        results: queryResults,
        expectedState: 'empty',
      });

      expect(evaluation).toBe('failed');
    });

    it('should handle custom evaluation logic', async () => {
      const queryResults = {
        rows: [{ count: 5 }],
      };

      // Expect count > 10
      const evaluation = await evaluatorService.evaluateFinding({
        query: 'SELECT COUNT(*) as count FROM users;',
        results: queryResults,
        expectedState: 'threshold',
        threshold: { operator: '>', value: 10 },
      });

      expect(evaluation).toBe('failed'); // 5 is not > 10
    });

    it('should extract evidence from query results', async () => {
      const queryResults = {
        rows: [
          { name: 'proc1', pid: 100 },
          { name: 'proc2', pid: 200 },
        ],
      };

      const evidence = await evaluatorService.extractEvidence({
        query: 'SELECT name, pid FROM processes;',
        results: queryResults,
      });

      expect(evidence).toHaveProperty('process_count', 2);
      expect(evidence).toHaveProperty('matching_processes');
      expect(evidence.matching_processes).toHaveLength(2);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large-scale scoring efficiently', async () => {
      const startTime = Date.now();

      // Calculate scores for 100 hosts
      const scores = await Promise.all(
        Array.from({ length: 100 }, (_, i) =>
          scoringService.calculateHostScore(`perf-host-${i}`)
        )
      );

      const duration = Date.now() - startTime;

      expect(scores).toHaveLength(100);
      expect(duration).toBeLessThan(10000); // Should complete in <10s
      log.info(`Scored 100 hosts in ${duration}ms (${duration / 100}ms per host)`);
    });

    it('should cache score calculations', async () => {
      const hostId = 'cache-test-host';

      // First calculation (uncached)
      const start1 = Date.now();
      await scoringService.calculateHostScore(hostId);
      const duration1 = Date.now() - start1;

      // Second calculation (should be cached)
      const start2 = Date.now();
      await scoringService.calculateHostScore(hostId);
      const duration2 = Date.now() - start2;

      // Cached should be faster
      expect(duration2).toBeLessThan(duration1);
      log.info(`Uncached: ${duration1}ms, Cached: ${duration2}ms (${Math.round((duration2 / duration1) * 100)}% of original)`);
    });
  });
});
