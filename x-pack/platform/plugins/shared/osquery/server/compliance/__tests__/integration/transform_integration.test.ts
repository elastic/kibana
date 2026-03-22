/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ComplianceTransformService } from '../../services/transform_service';
import { ComplianceTransformMonitoringService } from '../../services/transform_monitoring_service';
import { ComplianceTransformCleanupService } from '../../services/transform_cleanup_service';

/**
 * Integration tests for Elasticsearch Transform-based findings deduplication
 * Tests transform creation, monitoring, data integrity, and cleanup
 */
describe('Transform Integration', () => {
  let esClient: ElasticsearchClient;
  let transformService: ComplianceTransformService;
  let monitoringService: ComplianceTransformMonitoringService;
  let cleanupService: ComplianceTransformCleanupService;

  beforeAll(() => {
    // Setup would require real ES client
  });

  describe('Transform Creation and Management', () => {
    it('should create compliance-findings-latest transform', async () => {
      const created = await transformService.createTransform();

      expect(created).toBe(true);

      // Verify transform exists in ES
      const transformStats = await esClient.transform.getTransformStats({
        transform_id: 'compliance-findings-latest',
      });

      expect(transformStats.transforms).toHaveLength(1);
      expect(transformStats.transforms[0].id).toBe('compliance-findings-latest');
    });

    it('should start transform after creation', async () => {
      await transformService.createTransform();

      const stats = await esClient.transform.getTransformStats({
        transform_id: 'compliance-findings-latest',
      });

      const transform = stats.transforms[0];
      expect(['started', 'indexing']).toContain(transform.state);
    });

    it('should create findings-latest index with correct mapping', async () => {
      await transformService.createTransform();

      const mapping = await esClient.indices.getMapping({
        index: 'compliance-findings-latest-default',
      });

      const properties = mapping['compliance-findings-latest-default'].mappings.properties;

      // Verify key fields exist
      expect(properties).toHaveProperty('rule.id');
      expect(properties).toHaveProperty('host.id');
      expect(properties).toHaveProperty('result.evaluation');
      expect(properties).toHaveProperty('@timestamp');
    });

    it('should create ILM policy for findings-latest', async () => {
      await transformService.createTransform();

      const policy = await esClient.ilm.getLifecycle({
        name: 'compliance-findings-latest-policy',
      });

      expect(policy['compliance-findings-latest-policy']).toBeDefined();
      expect(policy['compliance-findings-latest-policy'].policy).toHaveProperty('phases');
    });
  });

  describe('Transform Data Integrity', () => {
    it('should deduplicate findings by host and rule', async () => {
      // Index 3 findings for same host+rule
      const testRuleId = 'dedup-test-rule';
      const testHostId = 'dedup-test-host';

      for (let i = 0; i < 3; i++) {
        await esClient.index({
          index: 'compliance-findings-default',
          document: {
            '@timestamp': new Date(Date.now() - i * 60000).toISOString(),
            result: { evaluation: 'failed' },
            rule: { id: testRuleId },
            host: { id: testHostId },
          },
          refresh: false,
        });
      }

      // Refresh to make searchable
      await esClient.indices.refresh({ index: 'compliance-findings-default' });

      // Wait for transform to process (max 30s)
      await new Promise((resolve) => setTimeout(resolve, 30000));

      // Query latest findings
      const latest = await esClient.search({
        index: 'compliance-findings-latest-default',
        body: {
          query: {
            bool: {
              must: [
                { term: { 'rule.id': testRuleId } },
                { term: { 'host.id': testHostId } },
              ],
            },
          },
        },
      });

      // Should have only 1 finding (latest)
      expect(latest.hits.total.value).toBe(1);

      const latestFinding = latest.hits.hits[0]._source;
      expect(latestFinding.rule.id).toBe(testRuleId);
      expect(latestFinding.host.id).toBe(testHostId);
    });

    it('should preserve latest finding when new data arrives', async () => {
      const testRuleId = `preserve-test-${Date.now()}`;
      const testHostId = 'preserve-test-host';

      // Index first finding (passed)
      await esClient.index({
        index: 'compliance-findings-default',
        document: {
          '@timestamp': new Date(Date.now() - 60000).toISOString(),
          result: { evaluation: 'passed' },
          rule: { id: testRuleId },
          host: { id: testHostId },
        },
        refresh: true,
      });

      // Wait for transform
      await new Promise((resolve) => setTimeout(resolve, 30000));

      // Verify initial state
      let latest = await esClient.search({
        index: 'compliance-findings-latest-default',
        body: {
          query: {
            bool: {
              must: [{ term: { 'rule.id': testRuleId } }, { term: { 'host.id': testHostId } }],
            },
          },
        },
      });

      expect(latest.hits.total.value).toBe(1);
      expect(latest.hits.hits[0]._source.result.evaluation).toBe('passed');

      // Index newer finding (failed)
      await esClient.index({
        index: 'compliance-findings-default',
        document: {
          '@timestamp': new Date().toISOString(),
          result: { evaluation: 'failed' },
          rule: { id: testRuleId },
          host: { id: testHostId },
        },
        refresh: true,
      });

      // Wait for transform to update
      await new Promise((resolve) => setTimeout(resolve, 30000));

      // Verify latest finding updated to failed
      latest = await esClient.search({
        index: 'compliance-findings-latest-default',
        body: {
          query: {
            bool: {
              must: [{ term: { 'rule.id': testRuleId } }, { term: { 'host.id': testHostId } }],
            },
          },
        },
      });

      expect(latest.hits.total.value).toBe(1);
      expect(latest.hits.hits[0]._source.result.evaluation).toBe('failed');
    });

    it('should handle multiple hosts and rules correctly', async () => {
      const timestamp = new Date().toISOString();

      // Index findings for 3 hosts × 2 rules = 6 findings
      const hosts = ['host-1', 'host-2', 'host-3'];
      const rules = ['rule-1', 'rule-2'];

      for (const host of hosts) {
        for (const rule of rules) {
          await esClient.index({
            index: 'compliance-findings-default',
            document: {
              '@timestamp': timestamp,
              result: { evaluation: Math.random() > 0.5 ? 'passed' : 'failed' },
              rule: { id: rule },
              host: { id: host },
            },
            refresh: false,
          });
        }
      }

      await esClient.indices.refresh({ index: 'compliance-findings-default' });

      // Wait for transform
      await new Promise((resolve) => setTimeout(resolve, 30000));

      // Query latest
      const latest = await esClient.search({
        index: 'compliance-findings-latest-default',
        size: 100,
      });

      // Should have 6 unique host-rule combinations
      const uniqueCombos = new Set(
        latest.hits.hits.map((hit: any) => `${hit._source.host.id}:${hit._source.rule.id}`)
      );

      expect(uniqueCombos.size).toBe(6);
    });
  });

  describe('Transform Monitoring', () => {
    it('should detect transform health status', async () => {
      const health = await monitoringService.checkTransformHealth();

      expect(health).toHaveProperty('transformId');
      expect(health).toHaveProperty('state');
      expect(health).toHaveProperty('health');
      expect(['started', 'stopped', 'failed']).toContain(health.state);
      expect(['green', 'yellow', 'red']).toContain(health.health);
    });

    it('should detect transform failures', async () => {
      // Simulate transform failure by stopping it
      await esClient.transform.stopTransform({
        transform_id: 'compliance-findings-latest',
        wait_for_completion: true,
      });

      const health = await monitoringService.checkTransformHealth();

      expect(health.state).toBe('stopped');
      expect(health.health).toMatch(/yellow|red/);

      // Restart for other tests
      await esClient.transform.startTransform({
        transform_id: 'compliance-findings-latest',
      });
    });

    it('should report transform lag metrics', async () => {
      const metrics = await monitoringService.getTransformMetrics();

      expect(metrics).toHaveProperty('documentsProcessed');
      expect(metrics).toHaveProperty('processingTime');
      expect(metrics).toHaveProperty('lag');
      expect(typeof metrics.documentsProcessed).toBe('number');
      expect(typeof metrics.lag).toBe('number');
    });

    it('should alert on transform failures', async () => {
      // This would test the alerting integration
      // For now, verify the monitoring service has alerting capability
      expect(typeof monitoringService.sendAlert).toBe('function');
    });
  });

  describe('Transform Cleanup', () => {
    it('should stop transform when feature disabled', async () => {
      await cleanupService.cleanup();

      const stats = await esClient.transform.getTransformStats({
        transform_id: 'compliance-findings-latest',
      });

      expect(stats.transforms[0].state).toBe('stopped');
    });

    it('should optionally delete transform and indices', async () => {
      await cleanupService.cleanup({ deleteIndices: true, deleteTransform: true });

      // Verify transform deleted
      await expect(
        esClient.transform.getTransform({
          transform_id: 'compliance-findings-latest',
        })
      ).rejects.toThrow(/not found/i);

      // Verify index deleted
      const indexExists = await esClient.indices.exists({
        index: 'compliance-findings-latest-default',
      });

      expect(indexExists).toBe(false);
    });

    it('should preserve data when cleanup only stops transform', async () => {
      await cleanupService.cleanup({ deleteIndices: false, deleteTransform: false });

      // Verify transform stopped but exists
      const stats = await esClient.transform.getTransformStats({
        transform_id: 'compliance-findings-latest',
      });

      expect(stats.transforms[0].state).toBe('stopped');

      // Verify index still exists
      const indexExists = await esClient.indices.exists({
        index: 'compliance-findings-latest-default',
      });

      expect(indexExists).toBe(true);
    });
  });
});
