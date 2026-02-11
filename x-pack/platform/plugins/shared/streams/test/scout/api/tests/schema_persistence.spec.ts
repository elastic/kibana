/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { streamsApiTest as apiTest } from '../fixtures';
import { PUBLIC_API_HEADERS } from '../fixtures/constants';

apiTest.describe(
  'Stream schema - field mapping persistence API (CRUD)',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    // Stream names must be exactly one level deep when forking from 'logs'
    const streamNamePrefix = 'logs.sp';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type ApiClient = any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type CookieHeader = any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type StreamResponse = any;

    // Helper to create a stream and get its definition
    async function createAndGetStream(
      apiClient: ApiClient,
      cookieHeader: CookieHeader,
      streamName: string,
      condition: { field: string; eq: string }
    ): Promise<{ success: boolean; stream?: StreamResponse; error?: string }> {
      const forkResponse = await apiClient.post('api/streams/logs/_fork', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          stream: { name: streamName },
          where: condition,
          status: 'enabled',
        },
        responseType: 'json',
      });

      if (forkResponse.statusCode !== 200) {
        return {
          success: false,
          error: `Fork failed with status ${forkResponse.statusCode}: ${JSON.stringify(
            forkResponse.body
          )}`,
        };
      }

      const getResponse = await apiClient.get(`api/streams/${streamName}`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      if (getResponse.statusCode !== 200) {
        return {
          success: false,
          error: `GET stream failed: ${JSON.stringify(getResponse.body)}`,
        };
      }

      return { success: true, stream: getResponse.body };
    }

    // Helper to extract writeable ingest config
    function getWriteableIngest(streamResponse: StreamResponse): StreamResponse {
      const ingest = streamResponse.stream.ingest;
      const { updated_at: _, ...processingWithoutUpdatedAt } = ingest.processing || {};
      return {
        ...ingest,
        processing: processingWithoutUpdatedAt,
      };
    }

    apiTest.afterEach(async ({ apiServices }) => {
      await apiServices.streamsTest.cleanupTestStreams(streamNamePrefix);
    });

    // Test: Map a single field with keyword type
    apiTest('should map a single field with keyword type', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const testStream = `${streamNamePrefix}-keyword`;

      const createResult = await createAndGetStream(apiClient, cookieHeader, testStream, {
        field: 'service.name',
        eq: 'keyword-test',
      });
      expect(createResult.success, createResult.error).toBe(true);

      const ingest = getWriteableIngest(createResult.stream!);

      // Add a field mapping
      const updateResponse = await apiClient.put(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          ingest: {
            ...ingest,
            wired: {
              ...ingest.wired,
              fields: {
                'attributes.custom_id': { type: 'keyword' },
              },
            },
          },
        },
        responseType: 'json',
      });

      expect(updateResponse.statusCode).toBe(200);

      // Verify the field was mapped
      const verifyResponse = await apiClient.get(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(verifyResponse.statusCode).toBe(200);
      expect(verifyResponse.body.ingest.wired.fields['attributes.custom_id']).toBeDefined();
      expect(verifyResponse.body.ingest.wired.fields['attributes.custom_id'].type).toBe('keyword');
    });

    // Test: Map a field with long type
    apiTest('should map a field with long type', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const testStream = `${streamNamePrefix}-long`;

      const createResult = await createAndGetStream(apiClient, cookieHeader, testStream, {
        field: 'service.name',
        eq: 'long-test',
      });
      expect(createResult.success, createResult.error).toBe(true);

      const ingest = getWriteableIngest(createResult.stream!);

      const updateResponse = await apiClient.put(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          ingest: {
            ...ingest,
            wired: {
              ...ingest.wired,
              fields: {
                'attributes.response_code': { type: 'long' },
              },
            },
          },
        },
        responseType: 'json',
      });

      expect(updateResponse.statusCode).toBe(200);

      const verifyResponse = await apiClient.get(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(verifyResponse.body.ingest.wired.fields['attributes.response_code'].type).toBe('long');
    });

    // Test: Map a field with double type
    apiTest('should map a field with double type', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const testStream = `${streamNamePrefix}-double`;

      const createResult = await createAndGetStream(apiClient, cookieHeader, testStream, {
        field: 'service.name',
        eq: 'double-test',
      });
      expect(createResult.success, createResult.error).toBe(true);

      const ingest = getWriteableIngest(createResult.stream!);

      const updateResponse = await apiClient.put(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          ingest: {
            ...ingest,
            wired: {
              ...ingest.wired,
              fields: {
                'attributes.cpu_percent': { type: 'double' },
              },
            },
          },
        },
        responseType: 'json',
      });

      expect(updateResponse.statusCode).toBe(200);

      const verifyResponse = await apiClient.get(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(verifyResponse.body.ingest.wired.fields['attributes.cpu_percent'].type).toBe('double');
    });

    // Test: Map a field with boolean type
    apiTest('should map a field with boolean type', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const testStream = `${streamNamePrefix}-boolean`;

      const createResult = await createAndGetStream(apiClient, cookieHeader, testStream, {
        field: 'service.name',
        eq: 'boolean-test',
      });
      expect(createResult.success, createResult.error).toBe(true);

      const ingest = getWriteableIngest(createResult.stream!);

      const updateResponse = await apiClient.put(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          ingest: {
            ...ingest,
            wired: {
              ...ingest.wired,
              fields: {
                'attributes.is_active': { type: 'boolean' },
              },
            },
          },
        },
        responseType: 'json',
      });

      expect(updateResponse.statusCode).toBe(200);

      const verifyResponse = await apiClient.get(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(verifyResponse.body.ingest.wired.fields['attributes.is_active'].type).toBe('boolean');
    });

    // Test: Map a field with ip type
    apiTest('should map a field with ip type', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const testStream = `${streamNamePrefix}-ip`;

      const createResult = await createAndGetStream(apiClient, cookieHeader, testStream, {
        field: 'service.name',
        eq: 'ip-test',
      });
      expect(createResult.success, createResult.error).toBe(true);

      const ingest = getWriteableIngest(createResult.stream!);

      const updateResponse = await apiClient.put(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          ingest: {
            ...ingest,
            wired: {
              ...ingest.wired,
              fields: {
                'attributes.client_ip': { type: 'ip' },
              },
            },
          },
        },
        responseType: 'json',
      });

      expect(updateResponse.statusCode).toBe(200);

      const verifyResponse = await apiClient.get(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(verifyResponse.body.ingest.wired.fields['attributes.client_ip'].type).toBe('ip');
    });

    // Test: Map a field with date type
    apiTest('should map a field with date type', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const testStream = `${streamNamePrefix}-date`;

      const createResult = await createAndGetStream(apiClient, cookieHeader, testStream, {
        field: 'service.name',
        eq: 'date-test',
      });
      expect(createResult.success, createResult.error).toBe(true);

      const ingest = getWriteableIngest(createResult.stream!);

      const updateResponse = await apiClient.put(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          ingest: {
            ...ingest,
            wired: {
              ...ingest.wired,
              fields: {
                'attributes.event_time': { type: 'date' },
              },
            },
          },
        },
        responseType: 'json',
      });

      expect(updateResponse.statusCode).toBe(200);

      const verifyResponse = await apiClient.get(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(verifyResponse.body.ingest.wired.fields['attributes.event_time'].type).toBe('date');
    });

    // Test: Map multiple fields at once
    apiTest('should map multiple fields at once', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const testStream = `${streamNamePrefix}-multi`;

      const createResult = await createAndGetStream(apiClient, cookieHeader, testStream, {
        field: 'service.name',
        eq: 'multi-test',
      });
      expect(createResult.success, createResult.error).toBe(true);

      const ingest = getWriteableIngest(createResult.stream!);

      const updateResponse = await apiClient.put(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          ingest: {
            ...ingest,
            wired: {
              ...ingest.wired,
              fields: {
                'attributes.user_id': { type: 'keyword' },
                'attributes.request_count': { type: 'long' },
                'attributes.response_time': { type: 'double' },
                'attributes.success': { type: 'boolean' },
              },
            },
          },
        },
        responseType: 'json',
      });

      expect(updateResponse.statusCode).toBe(200);

      const verifyResponse = await apiClient.get(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      const fields = verifyResponse.body.ingest.wired.fields;
      expect(fields['attributes.user_id'].type).toBe('keyword');
      expect(fields['attributes.request_count'].type).toBe('long');
      expect(fields['attributes.response_time'].type).toBe('double');
      expect(fields['attributes.success'].type).toBe('boolean');
    });

    // Test: Unmap a field
    apiTest('should unmap a field', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const testStream = `${streamNamePrefix}-unmap`;

      const createResult = await createAndGetStream(apiClient, cookieHeader, testStream, {
        field: 'service.name',
        eq: 'unmap-test',
      });
      expect(createResult.success, createResult.error).toBe(true);

      let ingest = getWriteableIngest(createResult.stream!);

      // First, map a field
      await apiClient.put(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          ingest: {
            ...ingest,
            wired: {
              ...ingest.wired,
              fields: {
                'attributes.to_remove': { type: 'keyword' },
              },
            },
          },
        },
        responseType: 'json',
      });

      // Verify it was mapped
      let verifyResponse = await apiClient.get(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      expect(verifyResponse.body.ingest.wired.fields['attributes.to_remove']).toBeDefined();

      // Get updated stream
      const getResponse = await apiClient.get(`api/streams/${testStream}`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      ingest = getWriteableIngest(getResponse.body);

      // Now unmap the field by removing it from fields
      const { 'attributes.to_remove': _, ...remainingFields } = ingest.wired.fields;

      const updateResponse = await apiClient.put(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          ingest: {
            ...ingest,
            wired: {
              ...ingest.wired,
              fields: remainingFields,
            },
          },
        },
        responseType: 'json',
      });

      expect(updateResponse.statusCode).toBe(200);

      // Verify the field was unmapped
      verifyResponse = await apiClient.get(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(verifyResponse.body.ingest.wired.fields['attributes.to_remove']).toBeUndefined();
    });

    // Test: Update field type (if supported)
    apiTest('should add a new field and keep existing ones', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const testStream = `${streamNamePrefix}-addfield`;

      const createResult = await createAndGetStream(apiClient, cookieHeader, testStream, {
        field: 'service.name',
        eq: 'addfield-test',
      });
      expect(createResult.success, createResult.error).toBe(true);

      let ingest = getWriteableIngest(createResult.stream!);

      // Map first field
      await apiClient.put(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          ingest: {
            ...ingest,
            wired: {
              ...ingest.wired,
              fields: {
                'attributes.field1': { type: 'keyword' },
              },
            },
          },
        },
        responseType: 'json',
      });

      // Get updated stream
      const getResponse = await apiClient.get(`api/streams/${testStream}`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      ingest = getWriteableIngest(getResponse.body);

      // Add a second field while keeping the first
      const updateResponse = await apiClient.put(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          ingest: {
            ...ingest,
            wired: {
              ...ingest.wired,
              fields: {
                ...ingest.wired.fields,
                'attributes.field2': { type: 'long' },
              },
            },
          },
        },
        responseType: 'json',
      });

      expect(updateResponse.statusCode).toBe(200);

      const verifyResponse = await apiClient.get(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(verifyResponse.body.ingest.wired.fields['attributes.field1'].type).toBe('keyword');
      expect(verifyResponse.body.ingest.wired.fields['attributes.field2'].type).toBe('long');
    });

    // Test: Field mapping should not affect processing settings
    apiTest(
      'should not affect processing when updating field mappings',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const testStream = `${streamNamePrefix}-isolated`;

        const createResult = await createAndGetStream(apiClient, cookieHeader, testStream, {
          field: 'service.name',
          eq: 'isolated-test',
        });
        expect(createResult.success, createResult.error).toBe(true);

        let ingest = getWriteableIngest(createResult.stream!);

        // Set up processing first
        await apiClient.put(`api/streams/${testStream}/_ingest`, {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            ingest: {
              ...ingest,
              processing: {
                steps: [{ action: 'set', to: 'attributes.test', value: 'value' }],
              },
            },
          },
          responseType: 'json',
        });

        // Get updated stream
        const getResponse = await apiClient.get(`api/streams/${testStream}`, {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });
        ingest = getWriteableIngest(getResponse.body);

        // Now update field mappings
        await apiClient.put(`api/streams/${testStream}/_ingest`, {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            ingest: {
              ...ingest,
              wired: {
                ...ingest.wired,
                fields: {
                  ...ingest.wired.fields,
                  'attributes.new_field': { type: 'keyword' },
                },
              },
            },
          },
          responseType: 'json',
        });

        // Verify processing is unchanged
        const verifyResponse = await apiClient.get(`api/streams/${testStream}/_ingest`, {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(verifyResponse.body.ingest.processing.steps).toHaveLength(1);
        expect(verifyResponse.body.ingest.processing.steps[0].action).toBe('set');
        expect(verifyResponse.body.ingest.wired.fields['attributes.new_field']).toBeDefined();
      }
    );

    // Test: Map deeply nested field
    apiTest('should map deeply nested field', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const testStream = `${streamNamePrefix}-nested`;

      const createResult = await createAndGetStream(apiClient, cookieHeader, testStream, {
        field: 'service.name',
        eq: 'nested-test',
      });
      expect(createResult.success, createResult.error).toBe(true);

      const ingest = getWriteableIngest(createResult.stream!);

      const updateResponse = await apiClient.put(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          ingest: {
            ...ingest,
            wired: {
              ...ingest.wired,
              fields: {
                'body.structured.http.request.method': { type: 'keyword' },
                'body.structured.http.response.status_code': { type: 'long' },
              },
            },
          },
        },
        responseType: 'json',
      });

      expect(updateResponse.statusCode).toBe(200);

      const verifyResponse = await apiClient.get(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      const fields = verifyResponse.body.ingest.wired.fields;
      expect(fields['body.structured.http.request.method'].type).toBe('keyword');
      expect(fields['body.structured.http.response.status_code'].type).toBe('long');
    });

    // Test: Return error for invalid field type
    apiTest('should return 400 for invalid field type', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const testStream = `${streamNamePrefix}-invalid`;

      const createResult = await createAndGetStream(apiClient, cookieHeader, testStream, {
        field: 'service.name',
        eq: 'invalid-test',
      });
      expect(createResult.success, createResult.error).toBe(true);

      const ingest = getWriteableIngest(createResult.stream!);

      const { statusCode } = await apiClient.put(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          ingest: {
            ...ingest,
            wired: {
              ...ingest.wired,
              fields: {
                'attributes.invalid': { type: 'invalid_type' },
              },
            },
          },
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(400);
    });

    // Test: Return error for non-existent stream
    apiTest(
      'should return error when updating non-existent stream',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();

        const { statusCode } = await apiClient.put('api/streams/non-existent-stream/_ingest', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            ingest: {
              processing: { steps: [] },
              lifecycle: { inherit: {} },
              wired: {
                fields: { 'attributes.test': { type: 'keyword' } },
                routing: [],
              },
            },
          },
          responseType: 'json',
        });

        // May return 400 (bad request), 403 (forbidden), or 404 (not found)
        expect([400, 403, 404]).toContain(statusCode);
      }
    );
  }
);
