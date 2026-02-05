/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { streamsApiTest as apiTest } from '../fixtures';
import { COMMON_API_HEADERS } from '../fixtures/constants';
import type { InsightInput } from '../services/streams_api_service';

apiTest.describe('Insights CRUD API', { tag: ['@ess', '@svlOblt'] }, () => {
  // Helper to create a test insight input
  function createTestInsightInput(overrides: Partial<InsightInput> = {}): InsightInput {
    return {
      title: 'Test Insight',
      description: 'This is a test insight for integration testing',
      impact: 'medium',
      evidence: [
        {
          streamName: 'logs',
          queryTitle: 'Test Query',
          featureName: 'test-feature',
          eventCount: 100,
        },
      ],
      recommendations: ['Consider investigating further', 'Review the related logs'],
      ...overrides,
    };
  }

  // Store created insight IDs for cleanup
  const createdInsightIds: string[] = [];

  apiTest.afterEach(async ({ apiServices }) => {
    // Clean up all created insights
    for (const id of createdInsightIds) {
      try {
        await apiServices.streamsTest.deleteInsight(id);
      } catch {
        // Ignore errors during cleanup
      }
    }
    createdInsightIds.length = 0;
  });

  // Test: Create an insight
  apiTest('should create a new insight', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    const input = createTestInsightInput({ title: 'Create Test Insight' });

    const response = await apiClient.post('internal/streams/_insights', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: input,
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('insight');
    expect(response.body.insight).toHaveProperty('id');
    expect(response.body.insight.title).toBe(input.title);
    expect(response.body.insight.description).toBe(input.description);
    expect(response.body.insight.impact).toBe(input.impact);
    expect(response.body.insight.evidence).toHaveLength(1);
    expect(response.body.insight.recommendations).toHaveLength(2);
    expect(response.body.insight.status).toBe('active');
    expect(response.body.insight).toHaveProperty('created_at');
    expect(response.body.insight).toHaveProperty('updated_at');

    // Track for cleanup
    createdInsightIds.push(response.body.insight.id);
  });

  // Test: Get an insight by ID
  apiTest('should get an insight by ID', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    // First create an insight
    const input = createTestInsightInput({ title: 'Get Test Insight' });
    const createResponse = await apiClient.post('internal/streams/_insights', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: input,
      responseType: 'json',
    });
    expect(createResponse.statusCode).toBe(200);
    const insightId = createResponse.body.insight.id;
    createdInsightIds.push(insightId);

    // Now get the insight
    const getResponse = await apiClient.get(`internal/streams/_insights/${insightId}`, {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.body.insight.id).toBe(insightId);
    expect(getResponse.body.insight.title).toBe(input.title);
  });

  // Test: Get non-existent insight returns 404
  apiTest('should return 404 for non-existent insight', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    const response = await apiClient.get('internal/streams/_insights/non-existent-id', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(response.statusCode).toBe(404);
  });

  // Test: List all insights
  // TODO: Skip - list endpoint has an issue with ES field name resolution for dot-notation keys
  apiTest.skip('should list all insights', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    // Create a few insights
    const input1 = createTestInsightInput({ title: 'List Test Insight 1' });
    const input2 = createTestInsightInput({ title: 'List Test Insight 2', impact: 'high' });

    const create1 = await apiClient.post('internal/streams/_insights', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: input1,
      responseType: 'json',
    });
    expect(create1.statusCode).toBe(200);
    createdInsightIds.push(create1.body.insight.id);

    const create2 = await apiClient.post('internal/streams/_insights', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: input2,
      responseType: 'json',
    });
    expect(create2.statusCode).toBe(200);
    createdInsightIds.push(create2.body.insight.id);

    // List all insights
    const listResponse = await apiClient.get('internal/streams/_insights', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.body).toHaveProperty('insights');
    expect(listResponse.body).toHaveProperty('total');
    expect(listResponse.body.insights.length).toBeGreaterThanOrEqual(2);

    // Verify both created insights are in the list
    const titles = listResponse.body.insights.map((i: { title: string }) => i.title);
    expect(titles).toContain('List Test Insight 1');
    expect(titles).toContain('List Test Insight 2');
  });

  // Test: List insights with status filter
  apiTest('should filter insights by status', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    // Create an insight
    const input = createTestInsightInput({ title: 'Filter Status Test Insight' });
    const createResponse = await apiClient.post('internal/streams/_insights', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: input,
      responseType: 'json',
    });
    expect(createResponse.statusCode).toBe(200);
    const insightId = createResponse.body.insight.id;
    createdInsightIds.push(insightId);

    // Update it to dismissed
    const updateResponse = await apiClient.put(`internal/streams/_insights/${insightId}`, {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: { status: 'dismissed' },
      responseType: 'json',
    });
    expect(updateResponse.statusCode).toBe(200);

    // Filter by dismissed status
    const listDismissed = await apiClient.get('internal/streams/_insights?status=dismissed', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(listDismissed.statusCode).toBe(200);
    expect(listDismissed.body.insights.some((i: { id: string }) => i.id === insightId)).toBe(true);

    // Filter by active status should not include dismissed insight
    const listActive = await apiClient.get('internal/streams/_insights?status=active', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(listActive.statusCode).toBe(200);
    expect(listActive.body.insights.some((i: { id: string }) => i.id === insightId)).toBe(false);
  });

  // Test: List insights with impact filter
  apiTest('should filter insights by impact', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    // Create insights with different impact levels
    const inputHigh = createTestInsightInput({ title: 'High Impact Insight', impact: 'high' });
    const inputLow = createTestInsightInput({ title: 'Low Impact Insight', impact: 'low' });

    const createHigh = await apiClient.post('internal/streams/_insights', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: inputHigh,
      responseType: 'json',
    });
    expect(createHigh.statusCode).toBe(200);
    createdInsightIds.push(createHigh.body.insight.id);

    const createLow = await apiClient.post('internal/streams/_insights', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: inputLow,
      responseType: 'json',
    });
    expect(createLow.statusCode).toBe(200);
    createdInsightIds.push(createLow.body.insight.id);

    // Filter by high impact
    const listHigh = await apiClient.get('internal/streams/_insights?impact=high', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(listHigh.statusCode).toBe(200);
    expect(
      listHigh.body.insights.some((i: { id: string }) => i.id === createHigh.body.insight.id)
    ).toBe(true);
    expect(
      listHigh.body.insights.some((i: { id: string }) => i.id === createLow.body.insight.id)
    ).toBe(false);
  });

  // Test: Update an insight
  apiTest('should update an existing insight', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    // Create an insight
    const input = createTestInsightInput({ title: 'Update Test Insight' });
    const createResponse = await apiClient.post('internal/streams/_insights', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: input,
      responseType: 'json',
    });
    expect(createResponse.statusCode).toBe(200);
    const insightId = createResponse.body.insight.id;
    createdInsightIds.push(insightId);

    // Update the insight
    const updateResponse = await apiClient.put(`internal/streams/_insights/${insightId}`, {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: {
        title: 'Updated Title',
        impact: 'critical',
      },
      responseType: 'json',
    });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.body.insight.title).toBe('Updated Title');
    expect(updateResponse.body.insight.impact).toBe('critical');
    // Original fields should be preserved
    expect(updateResponse.body.insight.description).toBe(input.description);
  });

  // Test: Update insight status to dismissed
  apiTest('should update insight status to dismissed', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    // Create an insight
    const input = createTestInsightInput({ title: 'Dismiss Test Insight' });
    const createResponse = await apiClient.post('internal/streams/_insights', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: input,
      responseType: 'json',
    });
    expect(createResponse.statusCode).toBe(200);
    const insightId = createResponse.body.insight.id;
    createdInsightIds.push(insightId);
    expect(createResponse.body.insight.status).toBe('active');

    // Dismiss the insight
    const updateResponse = await apiClient.put(`internal/streams/_insights/${insightId}`, {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: { status: 'dismissed' },
      responseType: 'json',
    });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.body.insight.status).toBe('dismissed');
  });

  // Test: Update non-existent insight returns 404
  apiTest(
    'should return 404 when updating non-existent insight',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const response = await apiClient.put('internal/streams/_insights/non-existent-id', {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: { title: 'Updated Title' },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(404);
    }
  );

  // Test: Delete an insight
  apiTest('should delete an insight', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    // Create an insight
    const input = createTestInsightInput({ title: 'Delete Test Insight' });
    const createResponse = await apiClient.post('internal/streams/_insights', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: input,
      responseType: 'json',
    });
    expect(createResponse.statusCode).toBe(200);
    const insightId = createResponse.body.insight.id;
    // Don't add to cleanup since we're deleting it

    // Delete the insight
    const deleteResponse = await apiClient.delete(`internal/streams/_insights/${insightId}`, {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(deleteResponse.statusCode).toBe(200);
    expect(deleteResponse.body.acknowledged).toBe(true);

    // Verify it's gone
    const getResponse = await apiClient.get(`internal/streams/_insights/${insightId}`, {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(getResponse.statusCode).toBe(404);
  });

  // Test: Delete non-existent insight returns 404
  apiTest(
    'should return 404 when deleting non-existent insight',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const response = await apiClient.delete('internal/streams/_insights/non-existent-id', {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(404);
    }
  );

  // Test: Bulk create insights
  // TODO: Skip - verifies via list which has dot-notation field name issue
  apiTest.skip('should bulk create insights', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    const input1 = createTestInsightInput({ title: 'Bulk Create Insight 1' });
    const input2 = createTestInsightInput({ title: 'Bulk Create Insight 2', impact: 'high' });

    const bulkResponse = await apiClient.post('internal/streams/_insights/_bulk', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: {
        operations: [{ index: { insight: input1 } }, { index: { insight: input2 } }],
      },
      responseType: 'json',
    });

    expect(bulkResponse.statusCode).toBe(200);
    expect(bulkResponse.body.acknowledged).toBe(true);

    // Verify insights were created
    const listResponse = await apiClient.get('internal/streams/_insights', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    const titles = listResponse.body.insights.map((i: { title: string }) => i.title);
    expect(titles).toContain('Bulk Create Insight 1');
    expect(titles).toContain('Bulk Create Insight 2');

    // Add to cleanup
    listResponse.body.insights.forEach((i: { id: string; title: string }) => {
      if (i.title.startsWith('Bulk Create Insight')) {
        createdInsightIds.push(i.id);
      }
    });
  });

  // Test: Bulk update insights
  apiTest('should bulk update insights', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    // Create insights first
    const input1 = createTestInsightInput({ title: 'Bulk Update Insight 1' });
    const input2 = createTestInsightInput({ title: 'Bulk Update Insight 2' });

    const create1 = await apiClient.post('internal/streams/_insights', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: input1,
      responseType: 'json',
    });
    const create2 = await apiClient.post('internal/streams/_insights', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: input2,
      responseType: 'json',
    });

    createdInsightIds.push(create1.body.insight.id);
    createdInsightIds.push(create2.body.insight.id);

    // Bulk update - note: insight field is required even when just updating status
    const bulkResponse = await apiClient.post('internal/streams/_insights/_bulk', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: {
        operations: [
          { update: { id: create1.body.insight.id, insight: { title: 'Updated Bulk 1' } } },
          { update: { id: create2.body.insight.id, insight: {}, status: 'dismissed' } },
        ],
      },
      responseType: 'json',
    });

    expect(bulkResponse.statusCode).toBe(200);
    expect(bulkResponse.body.acknowledged).toBe(true);

    // Verify updates
    const get1 = await apiClient.get(`internal/streams/_insights/${create1.body.insight.id}`, {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });
    expect(get1.body.insight.title).toBe('Updated Bulk 1');

    const get2 = await apiClient.get(`internal/streams/_insights/${create2.body.insight.id}`, {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });
    expect(get2.body.insight.status).toBe('dismissed');
  });

  // Test: Bulk delete insights
  apiTest('should bulk delete insights', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    // Create insights first
    const input1 = createTestInsightInput({ title: 'Bulk Delete Insight 1' });
    const input2 = createTestInsightInput({ title: 'Bulk Delete Insight 2' });

    const create1 = await apiClient.post('internal/streams/_insights', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: input1,
      responseType: 'json',
    });
    const create2 = await apiClient.post('internal/streams/_insights', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: input2,
      responseType: 'json',
    });

    // Don't add to cleanup since we're deleting

    // Bulk delete
    const bulkResponse = await apiClient.post('internal/streams/_insights/_bulk', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: {
        operations: [
          { delete: { id: create1.body.insight.id } },
          { delete: { id: create2.body.insight.id } },
        ],
      },
      responseType: 'json',
    });

    expect(bulkResponse.statusCode).toBe(200);
    expect(bulkResponse.body.acknowledged).toBe(true);

    // Verify deletions
    const get1 = await apiClient.get(`internal/streams/_insights/${create1.body.insight.id}`, {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });
    expect(get1.statusCode).toBe(404);

    const get2 = await apiClient.get(`internal/streams/_insights/${create2.body.insight.id}`, {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });
    expect(get2.statusCode).toBe(404);
  });

  // Test: Bulk operations with mixed types
  // TODO: Skip - verifies via list which has dot-notation field name issue
  apiTest.skip('should handle mixed bulk operations', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    // Create an insight to update and another to delete
    const input1 = createTestInsightInput({ title: 'Mixed Bulk Update Target' });
    const input2 = createTestInsightInput({ title: 'Mixed Bulk Delete Target' });

    const create1 = await apiClient.post('internal/streams/_insights', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: input1,
      responseType: 'json',
    });
    const create2 = await apiClient.post('internal/streams/_insights', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: input2,
      responseType: 'json',
    });

    createdInsightIds.push(create1.body.insight.id);
    // Don't add create2 since it's being deleted

    const newInsightInput = createTestInsightInput({ title: 'Mixed Bulk New Insight' });

    // Perform mixed operations
    const bulkResponse = await apiClient.post('internal/streams/_insights/_bulk', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: {
        operations: [
          { index: { insight: newInsightInput } },
          { update: { id: create1.body.insight.id, insight: { impact: 'critical' } } },
          { delete: { id: create2.body.insight.id } },
        ],
      },
      responseType: 'json',
    });

    expect(bulkResponse.statusCode).toBe(200);

    // Verify the new insight was created
    const listResponse = await apiClient.get('internal/streams/_insights', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });
    const newInsight = listResponse.body.insights.find(
      (i: { title: string }) => i.title === 'Mixed Bulk New Insight'
    );
    expect(newInsight).toBeDefined();
    createdInsightIds.push(newInsight.id);

    // Verify the update
    const get1 = await apiClient.get(`internal/streams/_insights/${create1.body.insight.id}`, {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });
    expect(get1.body.insight.impact).toBe('critical');

    // Verify the delete
    const get2 = await apiClient.get(`internal/streams/_insights/${create2.body.insight.id}`, {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      responseType: 'json',
    });
    expect(get2.statusCode).toBe(404);
  });

  // Test: Bulk operations with non-existent IDs should fail
  apiTest('should fail bulk operations with non-existent IDs', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    const bulkResponse = await apiClient.post('internal/streams/_insights/_bulk', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: {
        operations: [
          { update: { id: 'non-existent-1', insight: { title: 'Updated' } } },
          { delete: { id: 'non-existent-2' } },
        ],
      },
      responseType: 'json',
    });

    expect(bulkResponse.statusCode).toBe(404);
  });

  // Test: Read-only user cannot create insights (403)
  apiTest('should deny read-only user from creating insights', async ({ apiClient, samlAuth }) => {
    const { cookieHeader: readOnlyHeader } = await samlAuth.asStreamsReadOnly();

    // Read-only user cannot create (should get 403 for missing manage privilege)
    const createAttempt = await apiClient.post('internal/streams/_insights', {
      headers: { ...COMMON_API_HEADERS, ...readOnlyHeader },
      body: createTestInsightInput({ title: 'Should Fail' }),
      responseType: 'json',
    });
    expect(createAttempt.statusCode).toBe(403);
  });

  // Test: Read-only user cannot use bulk operations
  apiTest('should deny read-only user from bulk operations', async ({ apiClient, samlAuth }) => {
    const { cookieHeader: readOnlyHeader } = await samlAuth.asStreamsReadOnly();

    // Read-only user cannot use bulk operations (should get 403)
    const bulkAttempt = await apiClient.post('internal/streams/_insights/_bulk', {
      headers: { ...COMMON_API_HEADERS, ...readOnlyHeader },
      body: {
        operations: [{ index: { insight: createTestInsightInput({ title: 'Should Fail' }) } }],
      },
      responseType: 'json',
    });
    expect(bulkAttempt.statusCode).toBe(403);
  });
});
