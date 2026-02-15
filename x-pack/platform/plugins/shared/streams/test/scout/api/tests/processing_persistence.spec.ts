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
  'Stream data processing - persistence API (CRUD)',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    // Stream names must be exactly one level deep when forking from 'logs'
    const streamNamePrefix = 'logs.pp';

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

    // Test: Create a single grok processor
    apiTest('should create a single grok processor', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const testStream = `${streamNamePrefix}-grok`;

      const createResult = await createAndGetStream(apiClient, cookieHeader, testStream, {
        field: 'service.name',
        eq: 'grok-test',
      });
      expect(createResult.success, createResult.error).toBe(true);

      const ingest = getWriteableIngest(createResult.stream!);

      // Add a grok processor
      const updateResponse = await apiClient.put(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          ingest: {
            ...ingest,
            processing: {
              steps: [
                {
                  action: 'grok',
                  from: 'body.text',
                  patterns: ['%{WORD:attributes.method} %{URIPATH:attributes.path}'],
                },
              ],
            },
          },
        },
        responseType: 'json',
      });

      expect(updateResponse.statusCode).toBe(200);

      // Verify the processor was saved
      const verifyResponse = await apiClient.get(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(verifyResponse.statusCode).toBe(200);
      expect(verifyResponse.body.ingest.processing.steps).toHaveLength(1);
      expect(verifyResponse.body.ingest.processing.steps[0].action).toBe('grok');
      expect(verifyResponse.body.ingest.processing.steps[0].from).toBe('body.text');
    });

    // Test: Create a dissect processor
    apiTest('should create a dissect processor', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const testStream = `${streamNamePrefix}-dissect`;

      const createResult = await createAndGetStream(apiClient, cookieHeader, testStream, {
        field: 'service.name',
        eq: 'dissect-test',
      });
      expect(createResult.success, createResult.error).toBe(true);

      const ingest = getWriteableIngest(createResult.stream!);

      const updateResponse = await apiClient.put(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          ingest: {
            ...ingest,
            processing: {
              steps: [
                {
                  action: 'dissect',
                  from: 'body.text',
                  pattern: '%{attributes.user} %{attributes.action}',
                },
              ],
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

      expect(verifyResponse.statusCode).toBe(200);
      expect(verifyResponse.body.ingest.processing.steps[0].action).toBe('dissect');
    });

    // Test: Create multiple processors in sequence
    apiTest('should create multiple processors in sequence', async ({ apiClient, samlAuth }) => {
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
            processing: {
              steps: [
                {
                  action: 'grok',
                  from: 'body.text',
                  patterns: ['%{IP:attributes.client_ip} %{WORD:attributes.method}'],
                },
                {
                  action: 'uppercase',
                  from: 'attributes.method',
                },
                {
                  action: 'set',
                  to: 'attributes.processed',
                  value: 'true',
                },
              ],
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

      expect(verifyResponse.statusCode).toBe(200);
      expect(verifyResponse.body.ingest.processing.steps).toHaveLength(3);
      expect(verifyResponse.body.ingest.processing.steps[0].action).toBe('grok');
      expect(verifyResponse.body.ingest.processing.steps[1].action).toBe('uppercase');
      expect(verifyResponse.body.ingest.processing.steps[2].action).toBe('set');
    });

    // Test: Update an existing processor
    apiTest('should update an existing processor', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const testStream = `${streamNamePrefix}-update`;

      const createResult = await createAndGetStream(apiClient, cookieHeader, testStream, {
        field: 'service.name',
        eq: 'update-test',
      });
      expect(createResult.success, createResult.error).toBe(true);

      let ingest = getWriteableIngest(createResult.stream!);

      // Create initial processor
      await apiClient.put(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          ingest: {
            ...ingest,
            processing: {
              steps: [
                {
                  action: 'grok',
                  from: 'body.text',
                  patterns: ['%{WORD:attributes.method}'],
                },
              ],
            },
          },
        },
        responseType: 'json',
      });

      // Get the updated stream
      const getResponse = await apiClient.get(`api/streams/${testStream}`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      ingest = getWriteableIngest(getResponse.body);

      // Update the processor with a new pattern
      const updateResponse = await apiClient.put(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          ingest: {
            ...ingest,
            processing: {
              steps: [
                {
                  action: 'grok',
                  from: 'body.text',
                  patterns: ['%{WORD:attributes.hostname}'],
                },
              ],
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

      expect(verifyResponse.body.ingest.processing.steps[0].patterns[0]).toBe(
        '%{WORD:attributes.hostname}'
      );
    });

    // Test: Remove all processors
    apiTest('should remove all processors', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const testStream = `${streamNamePrefix}-remove`;

      const createResult = await createAndGetStream(apiClient, cookieHeader, testStream, {
        field: 'service.name',
        eq: 'remove-test',
      });
      expect(createResult.success, createResult.error).toBe(true);

      let ingest = getWriteableIngest(createResult.stream!);

      // Create a processor first
      await apiClient.put(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          ingest: {
            ...ingest,
            processing: {
              steps: [
                {
                  action: 'grok',
                  from: 'body.text',
                  patterns: ['%{WORD:attributes.method}'],
                },
              ],
            },
          },
        },
        responseType: 'json',
      });

      // Get the updated stream
      const getResponse = await apiClient.get(`api/streams/${testStream}`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      ingest = getWriteableIngest(getResponse.body);

      // Remove all processors
      const updateResponse = await apiClient.put(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          ingest: {
            ...ingest,
            processing: {
              steps: [],
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

      expect(verifyResponse.body.ingest.processing.steps).toHaveLength(0);
    });

    // Test: Create processor with conditional step
    apiTest('should create processor with conditional step', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const testStream = `${streamNamePrefix}-conditional`;

      const createResult = await createAndGetStream(apiClient, cookieHeader, testStream, {
        field: 'service.name',
        eq: 'conditional-test',
      });
      expect(createResult.success, createResult.error).toBe(true);

      const ingest = getWriteableIngest(createResult.stream!);

      const updateResponse = await apiClient.put(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          ingest: {
            ...ingest,
            processing: {
              steps: [
                {
                  condition: {
                    field: 'log.level',
                    eq: 'error',
                    steps: [
                      {
                        action: 'set',
                        to: 'attributes.severity',
                        value: 'high',
                      },
                    ],
                  },
                },
              ],
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

      expect(verifyResponse.body.ingest.processing.steps).toHaveLength(1);
      expect(verifyResponse.body.ingest.processing.steps[0].condition).toBeDefined();
      expect(verifyResponse.body.ingest.processing.steps[0].condition.steps).toHaveLength(1);
    });

    // Test: Create nested conditional steps
    apiTest('should create nested conditional steps', async ({ apiClient, samlAuth }) => {
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
            processing: {
              steps: [
                {
                  condition: {
                    field: 'environment',
                    eq: 'production',
                    steps: [
                      {
                        action: 'grok',
                        from: 'body.text',
                        patterns: ['%{IP:attributes.client_ip}'],
                      },
                      {
                        condition: {
                          field: 'log.level',
                          eq: 'error',
                          steps: [
                            {
                              action: 'set',
                              to: 'attributes.alert',
                              value: 'true',
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
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

      const steps = verifyResponse.body.ingest.processing.steps;
      expect(steps).toHaveLength(1);
      expect(steps[0].condition.steps).toHaveLength(2);
      expect(steps[0].condition.steps[0].action).toBe('grok');
      expect(steps[0].condition.steps[1].condition).toBeDefined();
    });

    // Test: Reorder processors
    apiTest('should reorder processors', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const testStream = `${streamNamePrefix}-reorder`;

      const createResult = await createAndGetStream(apiClient, cookieHeader, testStream, {
        field: 'service.name',
        eq: 'reorder-test',
      });
      expect(createResult.success, createResult.error).toBe(true);

      let ingest = getWriteableIngest(createResult.stream!);

      // Create initial processors
      await apiClient.put(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          ingest: {
            ...ingest,
            processing: {
              steps: [
                { action: 'set', to: 'attributes.step1', value: '1' },
                { action: 'set', to: 'attributes.step2', value: '2' },
                { action: 'set', to: 'attributes.step3', value: '3' },
              ],
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

      // Reorder processors (move step3 to first position)
      const updateResponse = await apiClient.put(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          ingest: {
            ...ingest,
            processing: {
              steps: [
                { action: 'set', to: 'attributes.step3', value: '3' },
                { action: 'set', to: 'attributes.step1', value: '1' },
                { action: 'set', to: 'attributes.step2', value: '2' },
              ],
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

      const steps = verifyResponse.body.ingest.processing.steps;
      expect(steps[0].to).toBe('attributes.step3');
      expect(steps[1].to).toBe('attributes.step1');
      expect(steps[2].to).toBe('attributes.step2');
    });

    // Test: Processing update should not affect other ingest settings
    apiTest(
      'should not affect lifecycle when updating processing',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const testStream = `${streamNamePrefix}-isolated`;

        const createResult = await createAndGetStream(apiClient, cookieHeader, testStream, {
          field: 'service.name',
          eq: 'isolated-test',
        });
        expect(createResult.success, createResult.error).toBe(true);

        let ingest = getWriteableIngest(createResult.stream!);

        // Set a custom lifecycle first
        await apiClient.put(`api/streams/${testStream}/_ingest`, {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            ingest: {
              ...ingest,
              lifecycle: { dsl: { data_retention: '30d' } },
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

        // Now update processing
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

        // Verify lifecycle is unchanged
        const verifyResponse = await apiClient.get(`api/streams/${testStream}/_ingest`, {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(verifyResponse.body.ingest.lifecycle.dsl.data_retention).toBe('30d');
        expect(verifyResponse.body.ingest.processing.steps).toHaveLength(1);
      }
    );

    // Test: Return error for invalid processor action
    apiTest('should return 400 for invalid processor action', async ({ apiClient, samlAuth }) => {
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
            processing: {
              steps: [
                {
                  action: 'invalid_action',
                  from: 'message',
                },
              ],
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
              wired: { fields: {}, routing: [] },
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
