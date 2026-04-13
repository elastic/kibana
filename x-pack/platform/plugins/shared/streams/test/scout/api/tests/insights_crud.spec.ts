/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { getImpactLevel, type Insight, type SaveInsightBody } from '@kbn/streams-schema';
import { v4 as uuidv4 } from 'uuid';
import { tags } from '@kbn/scout';
import { streamsApiTest as apiTest } from '../fixtures';
import { COMMON_API_HEADERS } from '../fixtures/constants';

apiTest.describe(
  'Insights CRUD API',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    function createTestInsight(overrides: Partial<Insight> = {}): Insight {
      return {
        id: uuidv4(),
        generated_at: new Date().toISOString(),
        title: 'Test Insight',
        description: 'This is a test insight for integration testing',
        impact: 'medium',
        impact_level: getImpactLevel('medium'),
        evidence: [
          {
            stream_name: 'logs',
            query_title: 'Test Query',
            event_count: 100,
          },
        ],
        recommendations: ['Consider investigating further', 'Review the related logs'],
        ...overrides,
      };
    }

    /** Body for PUT /_insights/{id}: insight without id (id comes from path). */
    function saveInsightBody(insight: Insight): SaveInsightBody {
      const { id: _id, ...rest } = insight;
      return rest;
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

    // Test: Create an insight (PUT with id in path)
    apiTest('should create a new insight', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const input = createTestInsight({ title: 'Create Test Insight' });

      const response = await apiClient.put(`internal/streams/_insights/${input.id}`, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: saveInsightBody(input),
        responseType: 'json',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.insight).toBeDefined();
      expect(response.body.insight.id).toBe(input.id);
      expect(response.body.insight.title).toBe(input.title);
      expect(response.body.insight.description).toBe(input.description);
      expect(response.body.insight.impact).toBe(input.impact);
      expect(response.body.insight.evidence).toHaveLength(1);
      expect(response.body.insight.recommendations).toHaveLength(2);

      // Track for cleanup
      createdInsightIds.push(response.body.insight.id);
    });

    // Test: Get an insight by ID
    apiTest('should get an insight by ID', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      // First create an insight
      const input = createTestInsight({ title: 'Get Test Insight' });
      const createResponse = await apiClient.put(`internal/streams/_insights/${input.id}`, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: saveInsightBody(input),
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
    // Failing, see https://github.com/elastic/kibana/issues/262787
    apiTest.skip('should list all insights', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      // Create a few insights
      const input1 = createTestInsight({ title: 'List Test Insight 1' });
      const input2 = createTestInsight({ title: 'List Test Insight 2', impact: 'high' });

      const create1 = await apiClient.put(`internal/streams/_insights/${input1.id}`, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: saveInsightBody(input1),
        responseType: 'json',
      });
      expect(create1.statusCode).toBe(200);
      createdInsightIds.push(create1.body.insight.id);

      const create2 = await apiClient.put(`internal/streams/_insights/${input2.id}`, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: saveInsightBody(input2),
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
      expect(listResponse.body.insights).toBeDefined();
      expect(listResponse.body.total).toBeDefined();
      expect(listResponse.body.insights.length).toHaveLength(2);

      // Verify both created insights are in the list
      const titles = listResponse.body.insights.map((i: { title: string }) => i.title);
      expect(titles).toContain('List Test Insight 1');
      expect(titles).toContain('List Test Insight 2');
    });

    // Test: List insights with impact filter
    apiTest('should filter insights by impact', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      // Create insights with different impact levels
      const inputHigh = createTestInsight({ title: 'High Impact Insight', impact: 'high' });
      const inputLow = createTestInsight({ title: 'Low Impact Insight', impact: 'low' });

      const createHigh = await apiClient.put(`internal/streams/_insights/${inputHigh.id}`, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: saveInsightBody(inputHigh),
        responseType: 'json',
      });
      expect(createHigh.statusCode).toBe(200);
      createdInsightIds.push(createHigh.body.insight.id);

      const createLow = await apiClient.put(`internal/streams/_insights/${inputLow.id}`, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: saveInsightBody(inputLow),
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
      const input = createTestInsight({ title: 'Update Test Insight' });
      const createResponse = await apiClient.put(`internal/streams/_insights/${input.id}`, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: saveInsightBody(input),
        responseType: 'json',
      });
      expect(createResponse.statusCode).toBe(200);
      const insightId = createResponse.body.insight.id;
      createdInsightIds.push(insightId);

      // Update the insight (body without id; id in path)
      const updatedInput = createTestInsight({
        ...input,
        id: insightId,
        title: 'Updated Title',
        impact: 'critical',
        impact_level: getImpactLevel('critical'),
      });
      const updateResponse = await apiClient.put(`internal/streams/_insights/${insightId}`, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: saveInsightBody(updatedInput),
        responseType: 'json',
      });

      expect(updateResponse.statusCode).toBe(200);
      expect(updateResponse.body.insight.title).toBe('Updated Title');
      expect(updateResponse.body.insight.impact).toBe('critical');
      // Original fields should be preserved
      expect(updateResponse.body.insight.description).toBe(input.description);
    });

    // Test: Delete an insight
    apiTest('should delete an insight', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      // Create an insight
      const input = createTestInsight({ title: 'Delete Test Insight' });
      const createResponse = await apiClient.put(`internal/streams/_insights/${input.id}`, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: saveInsightBody(input),
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
    // Failing, see https://github.com/elastic/kibana/issues/262787
    apiTest.skip('should bulk create insights', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const bulkResponse = await apiClient.post('internal/streams/_insights/_bulk', {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          operations: [
            { index: createTestInsight({ title: 'Bulk Create Insight 1' }) },
            { index: createTestInsight({ title: 'Bulk Create Insight 2', impact: 'high' }) },
          ],
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

    // Test: Bulk delete insights
    apiTest('should bulk delete insights', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      // Create insights first
      const input1 = createTestInsight({ title: 'Bulk Delete Insight 1' });
      const input2 = createTestInsight({ title: 'Bulk Delete Insight 2' });

      const create1 = await apiClient.put(`internal/streams/_insights/${input1.id}`, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: saveInsightBody(input1),
        responseType: 'json',
      });
      const create2 = await apiClient.put(`internal/streams/_insights/${input2.id}`, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: saveInsightBody(input2),
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
    // Failing, see https://github.com/elastic/kibana/issues/262787
    apiTest.skip('should handle mixed bulk operations', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      // Create an insight to update and another to delete
      const input1 = createTestInsight({ title: 'Mixed Bulk Update Target' });
      const input2 = createTestInsight({ title: 'Mixed Bulk Delete Target' });

      const create1 = await apiClient.put(`internal/streams/_insights/${input1.id}`, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: saveInsightBody(input1),
        responseType: 'json',
      });
      const create2 = await apiClient.put(`internal/streams/_insights/${input2.id}`, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: saveInsightBody(input2),
        responseType: 'json',
      });

      createdInsightIds.push(create1.body.insight.id);
      // Don't add create2 since it's being deleted

      // Perform mixed operations (index = new insight, update/delete as in API)
      const bulkResponse = await apiClient.post('internal/streams/_insights/_bulk', {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          operations: [
            { index: { id: create1.body.insight.id, insight: { impact: 'critical' } } },
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
    // Failing, see https://github.com/elastic/kibana/issues/262787
    apiTest.skip(
      'should fail bulk operations with non-existent IDs',
      async ({ apiClient, samlAuth }) => {
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
      }
    );

    // Test: Read-only user cannot create insights (403)
    apiTest(
      'should deny read-only user from creating insights',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader: readOnlyHeader } = await samlAuth.asStreamsReadOnly();

        // Read-only user cannot create (should get 403 for missing manage privilege)
        const forbidInput = createTestInsight({ title: 'Should Fail' });
        const createAttempt = await apiClient.put(`internal/streams/_insights/${forbidInput.id}`, {
          headers: { ...COMMON_API_HEADERS, ...readOnlyHeader },
          body: saveInsightBody(forbidInput),
          responseType: 'json',
        });
        expect(createAttempt.statusCode).toBe(403);
      }
    );

    // Test: Read-only user cannot use bulk operations
    apiTest('should deny read-only user from bulk operations', async ({ apiClient, samlAuth }) => {
      const { cookieHeader: readOnlyHeader } = await samlAuth.asStreamsReadOnly();

      // Read-only user cannot use bulk operations (should get 403)
      const bulkAttempt = await apiClient.post('internal/streams/_insights/_bulk', {
        headers: { ...COMMON_API_HEADERS, ...readOnlyHeader },
        body: {
          operations: [{ index: createTestInsight({ title: 'Should Fail' }) }],
        },
        responseType: 'json',
      });
      expect(bulkAttempt.statusCode).toBe(403);
    });
  }
);
