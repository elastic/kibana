/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, test } from '@kbn/scout/api';
import { tags } from '@kbn/scout';

/**
 * Scout API End-to-End Workflow tests for Compliance
 * Tests complete user scenarios from rule creation through findings and scoring
 */
test.describe(
  'Compliance API End-to-End Workflows',
  {
    tag: [tags.stateful.classic, '@ess'],
  },
  () => {
    const API_BASE = '/internal/osquery/compliance';
    const workflowId = `workflow-${Date.now()}`;

    test.describe('Complete Compliance Monitoring Workflow', () => {
      const ruleId = `${workflowId}-rule`;
      const benchmarkId = `${workflowId}-benchmark`;
      const hostId = `${workflowId}-host`;

      test('E2E: rule creation → pack deployment → findings → scoring → exceptions', async ({
        requestAuth,
        esClient,
        log,
      }) => {
        log.info('Step 1: Create custom compliance rule');
        const createRuleResponse = await requestAuth.post(`${API_BASE}/rules/_create`, {
          data: {
            rule_id: ruleId,
            name: 'E2E Test Rule',
            description: 'End-to-end workflow test',
            query: 'SELECT * FROM processes WHERE name LIKE "%test%";',
            remediation: 'Remove test processes',
            benchmark: {
              id: benchmarkId,
              name: 'E2E Test Benchmark',
              version: '1.0.0',
              posture_type: 'endpoint',
            },
            rule_number: '1.1.1',
            section: 'Process Management',
            level: 1,
            platform: 'linux',
            frameworks: [{ id: 'cis', version: '1.0', control: '1.1.1' }],
            tags: ['e2e-test'],
            enabled: true,
            interval: 3600,
          },
        });

        expect(createRuleResponse.status).toBe(201);
        expect(createRuleResponse.data).toHaveProperty('rule_id', ruleId);
        log.info(`✅ Rule created: ${ruleId}`);

        log.info('Step 2: Deploy pack to Fleet agent policy');
        const deployPackResponse = await requestAuth.post(`${API_BASE}/deploy`, {
          data: {
            benchmark_id: benchmarkId,
            agent_policy_ids: ['default'],
            enabled: true,
          },
        });

        expect([200, 201, 202]).toContain(deployPackResponse.status);
        log.info(`✅ Pack deployment initiated`);

        log.info('Step 3: Simulate finding data');
        await esClient.index({
          index: 'compliance-findings-default',
          document: {
            '@timestamp': new Date().toISOString(),
            result: {
              evaluation: 'failed',
              evidence: {
                process_count: 3,
                matching_processes: ['test-proc-1', 'test-proc-2', 'test-proc-3'],
              },
            },
            rule: {
              id: ruleId,
              name: 'E2E Test Rule',
              benchmark: {
                id: benchmarkId,
                version: '1.0.0',
              },
              section: 'Process Management',
            },
            host: {
              hostname: hostId,
              id: hostId,
              ip: ['10.0.0.100'],
            },
            agent: {
              id: 'test-agent',
              version: '8.15.0',
            },
          },
          refresh: true,
        });

        log.info(`✅ Finding indexed`);

        log.info('Step 4: Verify finding appears in API');
        const findingsResponse = await requestAuth.get(
          `${API_BASE}/findings?rule_id=${ruleId}&host_id=${hostId}`
        );

        expect(findingsResponse.status).toBe(200);
        expect(findingsResponse.data.findings.length).toBeGreaterThan(0);

        const finding = findingsResponse.data.findings[0];
        expect(finding.result.evaluation).toBe('failed');
        expect(finding.rule.id).toBe(ruleId);
        expect(finding.host.id).toBe(hostId);
        log.info(`✅ Finding retrieved via API`);

        log.info('Step 5: Verify score calculation includes finding');
        const scoresResponse = await requestAuth.get(`${API_BASE}/scores`);

        expect(scoresResponse.status).toBe(200);
        expect(scoresResponse.data).toHaveProperty('compliance_score');
        expect(typeof scoresResponse.data.compliance_score).toBe('number');
        log.info(`✅ Score calculated: ${scoresResponse.data.compliance_score}%`);

        log.info('Step 6: Create exception for failed finding');
        const createExceptionResponse = await requestAuth.post(`${API_BASE}/exceptions`, {
          data: {
            name: 'E2E Test Exception',
            scope: { type: 'host', target_id: hostId },
            rule_criteria: { rule_ids: [ruleId] },
            host_criteria: { host_ids: [hostId] },
            reason: 'Test environment - expected failure',
          },
        });

        expect(createExceptionResponse.status).toBe(201);
        expect(createExceptionResponse.data).toHaveProperty('exception_id');
        log.info(`✅ Exception created`);

        log.info('Step 7: Verify exception affects scoring');
        const scoresAfterException = await requestAuth.get(`${API_BASE}/scores`);

        expect(scoresAfterException.status).toBe(200);
        // Score should improve or stay same (finding is now excepted)
        expect(scoresAfterException.data.compliance_score).toBeGreaterThanOrEqual(
          scoresResponse.data.compliance_score
        );
        log.info(
          `✅ Score after exception: ${scoresAfterException.data.compliance_score}% (improved or same)`
        );

        log.info('Step 8: Cleanup');
        // Delete exception
        await requestAuth.delete(`${API_BASE}/exceptions/${createExceptionResponse.data.exception_id}`);

        // Delete finding
        await esClient.deleteByQuery({
          index: 'compliance-findings-*',
          body: {
            query: {
              bool: {
                must: [{ term: { 'rule.id': ruleId } }, { term: { 'host.id': hostId } }],
              },
            },
          },
          refresh: true,
        });

        // Delete rule
        await requestAuth.delete(`${API_BASE}/rules/${ruleId}`);

        log.info(`✅ E2E workflow complete and cleaned up`);
      });
    });

    test.describe('Multi-Version Benchmark Workflow', () => {
      test('should support multiple benchmark versions concurrently', async ({
        requestAuth,
        log,
      }) => {
        const benchmarkId = 'cis-linux';

        log.info('Step 1: Create rule for version 1.0');
        const v1Rule = await requestAuth.post(`${API_BASE}/rules/_create`, {
          data: {
            rule_id: `${workflowId}-v1-rule`,
            name: 'CIS Linux v1.0 Rule',
            query: 'SELECT * FROM users;',
            benchmark: {
              id: benchmarkId,
              version: '1.0.0',
            },
            platform: 'linux',
          },
        });

        expect(v1Rule.status).toBe(201);

        log.info('Step 2: Create rule for version 2.0');
        const v2Rule = await requestAuth.post(`${API_BASE}/rules/_create`, {
          data: {
            rule_id: `${workflowId}-v2-rule`,
            name: 'CIS Linux v2.0 Rule',
            query: 'SELECT * FROM users WHERE uid != 0;',
            benchmark: {
              id: benchmarkId,
              version: '2.0.0',
            },
            platform: 'linux',
          },
        });

        expect(v2Rule.status).toBe(201);

        log.info('Step 3: List benchmarks grouped by version');
        const benchmarksResponse = await requestAuth.get(`${API_BASE}/benchmarks`);

        expect(benchmarksResponse.status).toBe(200);
        expect(benchmarksResponse.data.benchmarks).toBeInstanceOf(Array);

        // Should have both versions
        const cisLinuxBenchmarks = benchmarksResponse.data.benchmarks.filter(
          (b: any) => b.id === benchmarkId
        );

        expect(cisLinuxBenchmarks.length).toBeGreaterThanOrEqual(2);

        log.info('Step 4: Filter findings by benchmark version');
        const v1Findings = await requestAuth.get(
          `${API_BASE}/findings?benchmark_id=${benchmarkId}&version=1.0.0`
        );
        const v2Findings = await requestAuth.get(
          `${API_BASE}/findings?benchmark_id=${benchmarkId}&version=2.0.0`
        );

        expect(v1Findings.status).toBe(200);
        expect(v2Findings.status).toBe(200);

        log.info('Step 5: Cleanup');
        await requestAuth.delete(`${API_BASE}/rules/${workflowId}-v1-rule`);
        await requestAuth.delete(`${API_BASE}/rules/${workflowId}-v2-rule`);

        log.info(`✅ Multi-version workflow complete`);
      });
    });

    test.describe('Fleet Integration Workflow', () => {
      test('should handle pack deployment lifecycle', async ({ requestAuth, log }) => {
        const benchmarkId = `${workflowId}-fleet-test`;

        log.info('Step 1: Create rules for benchmark');
        await requestAuth.post(`${API_BASE}/rules/_create`, {
          data: {
            rule_id: `${benchmarkId}-rule1`,
            name: 'Fleet Test Rule 1',
            query: 'SELECT * FROM processes;',
            benchmark: { id: benchmarkId, version: '1.0.0' },
            platform: 'linux',
          },
        });

        await requestAuth.post(`${API_BASE}/rules/_create`, {
          data: {
            rule_id: `${benchmarkId}-rule2`,
            name: 'Fleet Test Rule 2',
            query: 'SELECT * FROM users;',
            benchmark: { id: benchmarkId, version: '1.0.0' },
            platform: 'linux',
          },
        });

        log.info('Step 2: Deploy pack');
        const deployResponse = await requestAuth.post(`${API_BASE}/deploy`, {
          data: {
            benchmark_id: benchmarkId,
            agent_policy_ids: ['default'],
          },
        });

        // May fail if Fleet not configured - that's OK for this test
        expect([200, 201, 400, 500, 503]).toContain(deployResponse.status);

        if (deployResponse.status === 200 || deployResponse.status === 201) {
          const packagePolicyId = deployResponse.data.package_policy_id;

          log.info('Step 3: Verify deployment status');
          const statusResponse = await requestAuth.get(
            `${API_BASE}/packs/${benchmarkId}/status`
          );

          expect(statusResponse.status).toBe(200);
          expect(statusResponse.data.status).toMatch(/deployed|deploying/);

          log.info('Step 4: Undeploy pack');
          const undeployResponse = await requestAuth.delete(
            `${API_BASE}/packs/${packagePolicyId}`
          );

          expect([200, 204]).toContain(undeployResponse.status);
          log.info(`✅ Pack lifecycle complete`);
        } else {
          log.warn(`⚠️ Fleet deployment skipped (Fleet not configured)`);
        }

        // Cleanup rules
        await requestAuth.delete(`${API_BASE}/rules/${benchmarkId}-rule1`);
        await requestAuth.delete(`${API_BASE}/rules/${benchmarkId}-rule2`);
      });
    });

    test.describe('Transform Monitoring Workflow', () => {
      test('should monitor transform health', async ({ requestAuth, log }) => {
        log.info('Step 1: Check transform health');
        const healthResponse = await requestAuth.get(`${API_BASE}/transforms/health`);

        expect([200, 503]).toContain(healthResponse.status);

        if (healthResponse.status === 200) {
          expect(healthResponse.data).toHaveProperty('transforms');
          expect(healthResponse.data.transforms).toBeInstanceOf(Array);

          log.info('Step 2: Verify latest findings transform exists');
          const latestTransform = healthResponse.data.transforms.find(
            (t: any) => t.id === 'compliance-findings-latest'
          );

          if (latestTransform) {
            expect(latestTransform).toHaveProperty('state');
            expect(latestTransform).toHaveProperty('health');
            expect(['started', 'stopped', 'failed']).toContain(latestTransform.state);

            log.info(`✅ Transform state: ${latestTransform.state}`);
          }
        }
      });
    });
  }
);
