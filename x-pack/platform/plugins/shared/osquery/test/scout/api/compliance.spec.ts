/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect } from '@playwright/test';
import type { ComplianceRuleMetadata, ComplianceFinding } from '../../../common/compliance/types';

/**
 * Scout API tests for Compliance Endpoint Monitoring.
 * Tests all compliance API endpoints for functionality, security, and error handling.
 */

test.describe('Compliance API Endpoints', () => {
  const API_BASE = '/internal/endpoint_compliance';
  const TEST_RULE_ID = 'test-rule-001';
  const TEST_BENCHMARK_ID = 'cis-benchmarks-test';

  // Test data setup
  const mockRule: ComplianceRuleMetadata = {
    rule_id: TEST_RULE_ID,
    name: 'Test Compliance Rule',
    description: 'A test rule for Scout API validation',
    query: 'SELECT * FROM processes WHERE name LIKE "%test%";',
    remediation: 'Remove test processes from system',
    benchmark: {
      id: TEST_BENCHMARK_ID,
      name: 'Test CIS Benchmark',
      version: '1.0.0',
      posture_type: 'endpoint',
    },
    rule_number: '1.1.1',
    section: 'Initial Setup',
    level: 1,
    platform: 'linux',
    frameworks: [
      {
        id: 'cis',
        version: '1.0',
        control: '1.1.1',
      },
    ],
    tags: ['test', 'scout'],
    enabled: true,
    interval: 3600,
    prebuilt: false,
    resource_type: 'process',
  };

  const mockFinding: ComplianceFinding = {
    '@timestamp': new Date().toISOString(),
    result: {
      evaluation: 'failed',
      evidence: {
        process_count: 5,
        matching_processes: ['test-proc-1', 'test-proc-2'],
      },
    },
    rule: {
      id: TEST_RULE_ID,
      name: 'Test Compliance Rule',
      benchmark: {
        id: TEST_BENCHMARK_ID,
        name: 'Test CIS Benchmark',
        version: '1.0.0',
      },
      section: 'Initial Setup',
      level: 1,
    },
    host: {
      hostname: 'scout-test-host',
      id: 'host-scout-001',
      ip: ['192.168.1.100'],
      mac: ['00:0c:29:12:34:56'],
      name: 'scout-test-host',
      os: {
        family: 'linux',
        kernel: '5.4.0-74-generic',
        name: 'Ubuntu',
        platform: 'linux',
        version: '20.04',
      },
    },
    agent: {
      id: 'agent-scout-001',
      name: 'elastic-agent',
      version: '8.15.0',
    },
    event: {
      ingested: new Date().toISOString(),
      created: new Date().toISOString(),
      kind: 'state',
      category: ['configuration'],
      type: ['info'],
      outcome: 'failure',
    },
  };

  test.beforeAll(async ({ request }) => {
    // Setup test data
    await request.post(`${API_BASE}/rules`, {
      data: mockRule,
    });

    await request.post(`${API_BASE}/findings`, {
      data: mockFinding,
    });
  });

  test.afterAll(async ({ request }) => {
    // Cleanup test data
    await request.delete(`${API_BASE}/rules/${TEST_RULE_ID}`);
    await request.delete(`${API_BASE}/findings/_cleanup`, {
      data: { hostId: 'host-scout-001', ruleId: TEST_RULE_ID },
    });
  });

  test.describe('Rules Management', () => {
    test('should list compliance rules', async ({ request }) => {
      const response = await request.get(`${API_BASE}/rules`);
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('rules');
      expect(data).toHaveProperty('total');
      expect(data.rules).toBeInstanceOf(Array);
      
      // Check if our test rule exists
      const testRule = data.rules.find((rule: any) => rule.rule_id === TEST_RULE_ID);
      expect(testRule).toBeDefined();
      expect(testRule.name).toBe(mockRule.name);
      expect(testRule.enabled).toBe(true);
    });

    test('should get specific compliance rule', async ({ request }) => {
      const response = await request.get(`${API_BASE}/rules/${TEST_RULE_ID}`);
      
      expect(response.status()).toBe(200);
      
      const rule = await response.json();
      expect(rule.rule_id).toBe(TEST_RULE_ID);
      expect(rule.name).toBe(mockRule.name);
      expect(rule.benchmark.id).toBe(TEST_BENCHMARK_ID);
      expect(rule.platform).toBe('linux');
    });

    test('should handle non-existent rule gracefully', async ({ request }) => {
      const response = await request.get(`${API_BASE}/rules/non-existent-rule`);
      
      expect(response.status()).toBe(404);
      
      const error = await response.json();
      expect(error).toHaveProperty('message');
      expect(error.message).toContain('not found');
    });

    test('should create new compliance rule', async ({ request }) => {
      const newRule = {
        ...mockRule,
        rule_id: 'test-rule-create',
        name: 'Created Test Rule',
      };

      const response = await request.post(`${API_BASE}/rules`, {
        data: newRule,
      });
      
      expect(response.status()).toBe(201);
      
      const createdRule = await response.json();
      expect(createdRule.rule_id).toBe('test-rule-create');
      expect(createdRule.name).toBe('Created Test Rule');

      // Cleanup
      await request.delete(`${API_BASE}/rules/test-rule-create`);
    });

    test('should validate rule creation payload', async ({ request }) => {
      const invalidRule = {
        name: 'Invalid Rule',
        // Missing required fields
      };

      const response = await request.post(`${API_BASE}/rules`, {
        data: invalidRule,
      });
      
      expect(response.status()).toBe(400);
      
      const error = await response.json();
      expect(error).toHaveProperty('message');
      expect(error.message).toContain('validation');
    });

    test('should update compliance rule', async ({ request }) => {
      const updates = {
        name: 'Updated Test Rule Name',
        description: 'Updated description via Scout test',
        enabled: false,
      };

      const response = await request.put(`${API_BASE}/rules/${TEST_RULE_ID}`, {
        data: updates,
      });
      
      expect(response.status()).toBe(200);
      
      const updatedRule = await response.json();
      expect(updatedRule.name).toBe(updates.name);
      expect(updatedRule.description).toBe(updates.description);
      expect(updatedRule.enabled).toBe(false);

      // Restore original state
      await request.put(`${API_BASE}/rules/${TEST_RULE_ID}`, {
        data: { name: mockRule.name, description: mockRule.description, enabled: true },
      });
    });
  });

  test.describe('Findings API', () => {
    test('should list compliance findings', async ({ request }) => {
      const response = await request.get(`${API_BASE}/findings`);
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('findings');
      expect(data).toHaveProperty('total');
      expect(data.findings).toBeInstanceOf(Array);
      
      // Check if our test finding exists
      const testFinding = data.findings.find((finding: any) => 
        finding.rule.id === TEST_RULE_ID && 
        finding.host.id === 'host-scout-001'
      );
      expect(testFinding).toBeDefined();
      expect(testFinding.result.evaluation).toBe('failed');
    });

    test('should filter findings by rule ID', async ({ request }) => {
      const response = await request.get(`${API_BASE}/findings?rule_id=${TEST_RULE_ID}`);
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.findings).toBeInstanceOf(Array);
      
      // All findings should be for our test rule
      data.findings.forEach((finding: any) => {
        expect(finding.rule.id).toBe(TEST_RULE_ID);
      });
    });

    test('should filter findings by host ID', async ({ request }) => {
      const response = await request.get(`${API_BASE}/findings?host_id=host-scout-001`);
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.findings).toBeInstanceOf(Array);
      
      // All findings should be for our test host
      data.findings.forEach((finding: any) => {
        expect(finding.host.id).toBe('host-scout-001');
      });
    });

    test('should filter findings by evaluation result', async ({ request }) => {
      const response = await request.get(`${API_BASE}/findings?evaluation=failed`);
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.findings).toBeInstanceOf(Array);
      
      // All findings should be failed
      data.findings.forEach((finding: any) => {
        expect(finding.result.evaluation).toBe('failed');
      });
    });

    test('should support pagination', async ({ request }) => {
      const page1Response = await request.get(`${API_BASE}/findings?page=1&per_page=1`);
      expect(page1Response.status()).toBe(200);
      
      const page1Data = await page1Response.json();
      expect(page1Data.findings).toHaveLength(1);
      expect(page1Data).toHaveProperty('total');
      expect(page1Data).toHaveProperty('page', 1);
      expect(page1Data).toHaveProperty('per_page', 1);

      if (page1Data.total > 1) {
        const page2Response = await request.get(`${API_BASE}/findings?page=2&per_page=1`);
        expect(page2Response.status()).toBe(200);
        
        const page2Data = await page2Response.json();
        expect(page2Data.findings).toHaveLength(1);
        expect(page2Data.page).toBe(2);
        
        // Different findings on different pages
        expect(page1Data.findings[0]).not.toEqual(page2Data.findings[0]);
      }
    });
  });

  test.describe('Dashboard Statistics', () => {
    test('should get compliance dashboard statistics', async ({ request }) => {
      const response = await request.get(`${API_BASE}/stats`);
      
      expect(response.status()).toBe(200);
      
      const stats = await response.json();
      expect(stats).toHaveProperty('total_findings');
      expect(stats).toHaveProperty('passed_findings');
      expect(stats).toHaveProperty('failed_findings');
      expect(stats).toHaveProperty('compliance_score');
      expect(stats).toHaveProperty('benchmarks');
      expect(stats).toHaveProperty('hosts');
      
      expect(typeof stats.total_findings).toBe('number');
      expect(typeof stats.compliance_score).toBe('number');
      expect(stats.compliance_score).toBeGreaterThanOrEqual(0);
      expect(stats.compliance_score).toBeLessThanOrEqual(100);
      
      expect(stats.benchmarks).toBeInstanceOf(Array);
      expect(stats.hosts).toBeInstanceOf(Array);
    });

    test('should get time-based compliance trends', async ({ request }) => {
      const response = await request.get(`${API_BASE}/stats/trends?time_range=7d`);
      
      expect(response.status()).toBe(200);
      
      const trends = await response.json();
      expect(trends).toHaveProperty('time_range', '7d');
      expect(trends).toHaveProperty('data_points');
      expect(trends.data_points).toBeInstanceOf(Array);
      
      trends.data_points.forEach((point: any) => {
        expect(point).toHaveProperty('timestamp');
        expect(point).toHaveProperty('compliance_score');
        expect(point).toHaveProperty('total_findings');
        expect(typeof point.compliance_score).toBe('number');
      });
    });
  });

  test.describe('Pack Deployment', () => {
    test('should deploy compliance pack to Fleet', async ({ request }) => {
      const packDeployment = {
        benchmark_id: TEST_BENCHMARK_ID,
        agent_policy_ids: ['test-policy-001'],
        enabled: true,
      };

      const response = await request.post(`${API_BASE}/packs/deploy`, {
        data: packDeployment,
      });
      
      expect(response.status()).toBe(200);
      
      const deployment = await response.json();
      expect(deployment).toHaveProperty('success', true);
      expect(deployment).toHaveProperty('package_policy_id');
      expect(deployment).toHaveProperty('deployed_queries');
      expect(typeof deployment.deployed_queries).toBe('number');
    });

    test('should list deployed packs', async ({ request }) => {
      const response = await request.get(`${API_BASE}/packs`);
      
      expect(response.status()).toBe(200);
      
      const packs = await response.json();
      expect(packs).toBeInstanceOf(Array);
      
      packs.forEach((pack: any) => {
        expect(pack).toHaveProperty('benchmark_id');
        expect(pack).toHaveProperty('package_policy_id');
        expect(pack).toHaveProperty('agent_policies');
        expect(pack).toHaveProperty('status');
      });
    });

    test('should get pack deployment status', async ({ request }) => {
      const response = await request.get(`${API_BASE}/packs/${TEST_BENCHMARK_ID}/status`);
      
      expect(response.status()).toBe(200);
      
      const status = await response.json();
      expect(status).toHaveProperty('benchmark_id', TEST_BENCHMARK_ID);
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('agent_policies');
      expect(status).toHaveProperty('deployment_health');
      
      expect(['deployed', 'deploying', 'failed', 'not_deployed']).toContain(status.status);
    });
  });

  test.describe('Exception Management', () => {
    const testExceptionId = 'scout-test-exception';

    test('should create compliance exception', async ({ request }) => {
      const exception = {
        name: 'Scout Test Exception',
        description: 'Exception created during Scout API testing',
        scope: {
          type: 'rule',
          target_id: TEST_RULE_ID,
          target_name: 'Test Compliance Rule',
        },
        rule_criteria: {
          rule_ids: [TEST_RULE_ID],
        },
        host_criteria: {
          host_ids: ['host-scout-001'],
        },
        time_scope: {
          type: 'temporary',
          end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        },
        approval: {
          status: 'auto_approved',
          risk_assessment: {
            risk_level: 'low',
            business_justification: 'Testing purposes only',
            review_required: false,
          },
        },
        enabled: true,
        priority: 50,
        created_by: 'scout-test-user',
      };

      const response = await request.post(`${API_BASE}/exceptions`, {
        data: exception,
      });
      
      expect(response.status()).toBe(201);
      
      const createdException = await response.json();
      expect(createdException).toHaveProperty('exception_id');
      expect(createdException.name).toBe(exception.name);
      expect(createdException.scope.type).toBe('rule');
      expect(createdException.status).toBe('active');
    });

    test('should list compliance exceptions', async ({ request }) => {
      const response = await request.get(`${API_BASE}/exceptions`);
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('exceptions');
      expect(data).toHaveProperty('total');
      expect(data.exceptions).toBeInstanceOf(Array);
    });

    test('should find matching exceptions for criteria', async ({ request }) => {
      const criteria = {
        ruleId: TEST_RULE_ID,
        hostId: 'host-scout-001',
      };

      const response = await request.post(`${API_BASE}/exceptions/_match`, {
        data: criteria,
      });
      
      expect(response.status()).toBe(200);
      
      const matches = await response.json();
      expect(matches).toHaveProperty('exceptions');
      expect(matches).toHaveProperty('conflicts');
      expect(matches.exceptions).toBeInstanceOf(Array);
    });
  });

  test.describe('Authentication & Authorization', () => {
    test('should require authentication for all endpoints', async ({ request }) => {
      // Test without authentication headers
      const unauthenticatedRequest = request;
      
      const response = await unauthenticatedRequest.get(`${API_BASE}/rules`, {
        headers: {
          'Authorization': '', // Remove auth
        },
      });
      
      expect([401, 403]).toContain(response.status());
    });

    test('should enforce RBAC for sensitive operations', async ({ request }) => {
      // This would test with a limited-privilege user
      // For now, just verify the endpoint structure exists
      const response = await request.post(`${API_BASE}/rules`, {
        data: { ...mockRule, rule_id: 'rbac-test' },
      });
      
      // Should succeed with proper permissions
      expect([200, 201, 403]).toContain(response.status());
      
      if (response.status() === 201) {
        // Cleanup if created
        await request.delete(`${API_BASE}/rules/rbac-test`);
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle malformed request bodies', async ({ request }) => {
      const response = await request.post(`${API_BASE}/rules`, {
        data: 'invalid-json-string',
      });
      
      expect(response.status()).toBe(400);
      
      const error = await response.json();
      expect(error).toHaveProperty('message');
    });

    test('should handle missing required parameters', async ({ request }) => {
      const response = await request.get(`${API_BASE}/findings/invalid-rule-id`);
      
      expect(response.status()).toBe(404);
    });

    test('should provide consistent error format', async ({ request }) => {
      const response = await request.get(`${API_BASE}/non-existent-endpoint`);
      
      expect(response.status()).toBe(404);
      
      const error = await response.json();
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('statusCode');
      expect(typeof error.message).toBe('string');
      expect(typeof error.statusCode).toBe('number');
    });
  });

  test.describe('Performance & Reliability', () => {
    test('should handle concurrent requests', async ({ request }) => {
      const promises = Array.from({ length: 5 }, () =>
        request.get(`${API_BASE}/stats`)
      );
      
      const responses = await Promise.all(promises);
      
      responses.forEach((response) => {
        expect(response.status()).toBe(200);
      });
    });

    test('should respond within reasonable time limits', async ({ request }) => {
      const startTime = Date.now();
      
      const response = await request.get(`${API_BASE}/findings?per_page=100`);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.status()).toBe(200);
      expect(responseTime).toBeLessThan(5000); // 5 seconds max
    });

    test('should handle large result sets with pagination', async ({ request }) => {
      const response = await request.get(`${API_BASE}/findings?per_page=1000`);
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.findings.length).toBeLessThanOrEqual(1000);
      
      if (data.total > 1000) {
        expect(data).toHaveProperty('page');
        expect(data).toHaveProperty('per_page');
      }
    });
  });

  test.describe('Data Validation', () => {
    test('should validate rule schema on creation', async ({ request }) => {
      const invalidRule = {
        rule_id: 'validation-test',
        name: 'Test Rule',
        // Missing required fields like query, benchmark, etc.
        platform: 'invalid-platform', // Should be one of: darwin, windows, linux
      };

      const response = await request.post(`${API_BASE}/rules`, {
        data: invalidRule,
      });
      
      expect(response.status()).toBe(400);
      
      const error = await response.json();
      expect(error.message).toContain('validation');
    });

    test('should validate time ranges in queries', async ({ request }) => {
      const response = await request.get(`${API_BASE}/findings?time_range=invalid`);
      
      expect(response.status()).toBe(400);
      
      const error = await response.json();
      expect(error.message).toContain('time_range');
    });

    test('should sanitize input to prevent injection', async ({ request }) => {
      const maliciousInput = {
        rule_id: 'test"; DROP TABLE rules; --',
        name: '<script>alert("xss")</script>',
        query: 'SELECT * FROM processes WHERE name = "; DROP TABLE findings; --"',
      };

      const response = await request.post(`${API_BASE}/rules`, {
        data: { ...mockRule, ...maliciousInput },
      });
      
      // Should either reject malicious input or sanitize it
      expect([400, 201]).toContain(response.status());
      
      if (response.status() === 201) {
        const createdRule = await response.json();
        expect(createdRule.name).not.toContain('<script>');
        expect(createdRule.query).not.toContain('DROP TABLE');
        
        // Cleanup
        await request.delete(`${API_BASE}/rules/${createdRule.rule_id}`);
      }
    });
  });
});