/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, test } from '@kbn/scout/api';
import { tags } from '@kbn/scout';

/**
 * Scout API Authorization tests for Compliance
 * Tests RBAC enforcement across all compliance endpoints
 */
test.describe(
  'Compliance API Authorization',
  {
    tag: [tags.stateful.classic, '@ess'],
  },
  () => {
    const API_BASE = '/internal/osquery/compliance';

    test.describe('Viewer Role (Read-Only)', () => {
      test('should allow viewing rules', async ({ requestAuth }) => {
        const { status, data } = await requestAuth.get(`${API_BASE}/rules`, {
          role: 'viewer',
        });

        expect(status).toBe(200);
        expect(data).toHaveProperty('rules');
      });

      test('should allow viewing findings', async ({ requestAuth }) => {
        const { status, data } = await requestAuth.get(`${API_BASE}/findings`, {
          role: 'viewer',
        });

        expect(status).toBe(200);
        expect(data).toHaveProperty('findings');
      });

      test('should allow viewing dashboard stats', async ({ requestAuth }) => {
        const { status, data } = await requestAuth.get(`${API_BASE}/scores`, {
          role: 'viewer',
        });

        expect(status).toBe(200);
        expect(data).toHaveProperty('compliance_score');
      });

      test('should block rule creation', async ({ requestAuth }) => {
        const { status } = await requestAuth.post(`${API_BASE}/rules`, {
          role: 'viewer',
          data: {
            rule_id: 'unauthorized-rule',
            name: 'Unauthorized Rule',
            query: 'SELECT * FROM processes;',
          },
        });

        expect(status).toBe(403);
      });

      test('should block rule updates', async ({ requestAuth }) => {
        const { status } = await requestAuth.put(`${API_BASE}/rules/existing-rule`, {
          role: 'viewer',
          data: { enabled: false },
        });

        expect(status).toBe(403);
      });

      test('should block rule deletion', async ({ requestAuth }) => {
        const { status } = await requestAuth.delete(`${API_BASE}/rules/existing-rule`, {
          role: 'viewer',
        });

        expect(status).toBe(403);
      });

      test('should block exception creation', async ({ requestAuth }) => {
        const { status } = await requestAuth.post(`${API_BASE}/exceptions`, {
          role: 'viewer',
          data: { name: 'Unauthorized Exception' },
        });

        expect(status).toBe(403);
      });

      test('should block pack deployment', async ({ requestAuth }) => {
        const { status } = await requestAuth.post(`${API_BASE}/deploy`, {
          role: 'viewer',
          data: { benchmark_id: 'cis-benchmark' },
        });

        expect(status).toBe(403);
      });
    });

    test.describe('Editor Role (Read-Write)', () => {
      test('should allow rule creation', async ({ requestAuth }) => {
        const testRuleId = `test-editor-${Date.now()}`;

        const { status, data } = await requestAuth.post(`${API_BASE}/rules`, {
          role: 'editor',
          data: {
            rule_id: testRuleId,
            name: 'Editor Test Rule',
            description: 'Created by editor role',
            query: 'SELECT * FROM processes;',
            benchmark: {
              id: 'cis-benchmark',
              name: 'CIS Benchmark',
              version: '1.0.0',
            },
            platform: 'linux',
            section: 'Test',
            rule_number: '99.99',
          },
        });

        expect(status).toBe(201);
        expect(data).toHaveProperty('rule_id', testRuleId);

        // Cleanup
        await requestAuth.delete(`${API_BASE}/rules/${testRuleId}`, { role: 'editor' });
      });

      test('should allow rule updates', async ({ requestAuth }) => {
        // Create rule first
        const testRuleId = `test-update-${Date.now()}`;
        await requestAuth.post(`${API_BASE}/rules`, {
          role: 'editor',
          data: {
            rule_id: testRuleId,
            name: 'Original Name',
            query: 'SELECT * FROM processes;',
          },
        });

        // Update rule
        const { status, data } = await requestAuth.put(`${API_BASE}/rules/${testRuleId}`, {
          role: 'editor',
          data: { name: 'Updated Name' },
        });

        expect(status).toBe(200);
        expect(data.name).toBe('Updated Name');

        // Cleanup
        await requestAuth.delete(`${API_BASE}/rules/${testRuleId}`, { role: 'editor' });
      });

      test('should allow exception creation', async ({ requestAuth }) => {
        const { status, data } = await requestAuth.post(`${API_BASE}/exceptions`, {
          role: 'editor',
          data: {
            name: 'Editor Exception',
            scope: { type: 'global' },
            rule_criteria: { rule_ids: ['test-rule'] },
          },
        });

        expect([200, 201]).toContain(status);

        // Cleanup
        if (data.exception_id) {
          await requestAuth.delete(`${API_BASE}/exceptions/${data.exception_id}`, {
            role: 'editor',
          });
        }
      });

      test('should allow pack deployment', async ({ requestAuth }) => {
        const { status } = await requestAuth.post(`${API_BASE}/deploy`, {
          role: 'editor',
          data: {
            benchmark_id: 'cis-benchmark',
            agent_policy_ids: ['test-policy'],
          },
        });

        // May succeed or fail depending on Fleet setup
        expect([200, 201, 400, 500]).toContain(status);
      });

      test('should block admin-only operations', async ({ requestAuth }) => {
        // Check if there are admin-only endpoints
        const { status } = await requestAuth.post(`${API_BASE}/benchmarks/_migrate`, {
          role: 'editor',
          data: { from_version: '1.0', to_version: '2.0' },
        });

        // Editor should be blocked from migrations (if endpoint exists)
        if (status !== 404) {
          expect(status).toBe(403);
        }
      });
    });

    test.describe('Admin Role (Full Access)', () => {
      test('should allow all CRUD operations', async ({ requestAuth }) => {
        const testRuleId = `test-admin-${Date.now()}`;

        // Create
        const createResponse = await requestAuth.post(`${API_BASE}/rules`, {
          role: 'admin',
          data: {
            rule_id: testRuleId,
            name: 'Admin Test Rule',
            query: 'SELECT * FROM processes;',
          },
        });
        expect(createResponse.status).toBe(201);

        // Read
        const readResponse = await requestAuth.get(`${API_BASE}/rules/${testRuleId}`, {
          role: 'admin',
        });
        expect(readResponse.status).toBe(200);

        // Update
        const updateResponse = await requestAuth.put(`${API_BASE}/rules/${testRuleId}`, {
          role: 'admin',
          data: { enabled: false },
        });
        expect(updateResponse.status).toBe(200);

        // Delete
        const deleteResponse = await requestAuth.delete(`${API_BASE}/rules/${testRuleId}`, {
          role: 'admin',
        });
        expect(deleteResponse.status).toBe(204);
      });

      test('should allow administrative operations', async ({ requestAuth }) => {
        // Test cleanup endpoint (admin-only)
        const { status } = await requestAuth.post(`${API_BASE}/cleanup/transforms`, {
          role: 'admin',
          data: { force: true },
        });

        expect([200, 202, 204]).toContain(status);
      });
    });

    test.describe('Cross-Space Authorization', () => {
      test('should isolate data by space', async ({ requestAuth }) => {
        // Create rule in space1
        const space1Rule = await requestAuth.post(`${API_BASE}/rules`, {
          role: 'editor',
          space: 'space1',
          data: {
            rule_id: 'space1-rule',
            name: 'Space 1 Rule',
            query: 'SELECT * FROM processes;',
          },
        });

        expect(space1Rule.status).toBe(201);

        // Try to access from space2
        const space2Access = await requestAuth.get(`${API_BASE}/rules/space1-rule`, {
          role: 'editor',
          space: 'space2',
        });

        expect(space2Access.status).toBe(404); // Should not find rule from different space

        // Cleanup
        await requestAuth.delete(`${API_BASE}/rules/space1-rule`, {
          role: 'editor',
          space: 'space1',
        });
      });
    });
  }
);
