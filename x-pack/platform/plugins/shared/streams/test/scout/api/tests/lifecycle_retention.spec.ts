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
  'Stream lifecycle - retention API',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    // Stream names must be exactly one level deep when forking from 'logs'
    // Format: logs.<name> where name uses hyphens, not dots
    // The prefix 'lc' is used for cleanup matching
    const streamNamePrefix = 'logs.lc';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type ApiClient = any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type CookieHeader = any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type StreamResponse = any;

    // Helper to create a stream and verify it was created
    async function createTestStream(
      apiClient: ApiClient,
      cookieHeader: CookieHeader,
      streamName: string,
      condition: { field: string; eq: string }
    ): Promise<{ success: boolean; error?: string }> {
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

      return { success: true };
    }

    // Helper to get a stream and verify it exists
    async function getStream(
      apiClient: ApiClient,
      cookieHeader: CookieHeader,
      streamName: string
    ): Promise<{ success: boolean; stream?: StreamResponse; error?: string }> {
      const response = await apiClient.get(`api/streams/${streamName}`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      if (response.statusCode !== 200) {
        return {
          success: false,
          error: `GET stream failed with status ${response.statusCode}: ${JSON.stringify(
            response.body
          )}`,
        };
      }

      if (!response.body?.stream?.ingest) {
        return {
          success: false,
          error: `Stream response missing expected structure: ${JSON.stringify(response.body)}`,
        };
      }

      return { success: true, stream: response.body };
    }

    // Helper to extract writeable ingest config (removes read-only fields like 'updated_at')
    function getWriteableIngest(streamResponse: StreamResponse): StreamResponse {
      const ingest = streamResponse.stream.ingest;
      // Remove 'updated_at' from processing as it's a read-only field
      const { updated_at: _, ...processingWithoutUpdatedAt } = ingest.processing || {};
      return {
        ...ingest,
        processing: processingWithoutUpdatedAt,
      };
    }

    apiTest.afterEach(async ({ apiServices }) => {
      // Cleanup test streams - matches any stream starting with 'logs.lc'
      await apiServices.streamsTest.cleanupTestStreams(streamNamePrefix);
    });

    // Test: Stream should be created with inherited lifecycle by default
    apiTest(
      'should create stream with inherited lifecycle by default',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const testStream = `${streamNamePrefix}-inherit-default`;

        const createResult = await createTestStream(apiClient, cookieHeader, testStream, {
          field: 'service.name',
          eq: 'lifecycle-test',
        });
        expect(createResult.success, createResult.error).toBe(true);

        const getResult = await getStream(apiClient, cookieHeader, testStream);
        expect(getResult.success, getResult.error).toBe(true);

        expect(getResult.stream!.stream.ingest.lifecycle).toBeDefined();
        expect(getResult.stream!.stream.ingest.lifecycle.inherit).toBeDefined();
      }
    );

    // Test: Stream response should include effective_lifecycle
    apiTest(
      'should include effective_lifecycle in stream response',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const testStream = `${streamNamePrefix}-effective`;

        const createResult = await createTestStream(apiClient, cookieHeader, testStream, {
          field: 'service.name',
          eq: 'effective-test',
        });
        expect(createResult.success, createResult.error).toBe(true);

        const getResult = await getStream(apiClient, cookieHeader, testStream);
        expect(getResult.success, getResult.error).toBe(true);

        expect(getResult.stream!.effective_lifecycle).toBeDefined();
        expect(getResult.stream!.effective_lifecycle.from).toBeDefined();
      }
    );

    // Test: Update stream with DSL retention of 7 days
    apiTest(
      'should update stream with DSL retention of 7 days',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const testStream = `${streamNamePrefix}-dsl-7d`;

        const createResult = await createTestStream(apiClient, cookieHeader, testStream, {
          field: 'service.name',
          eq: 'retention-7d',
        });
        expect(createResult.success, createResult.error).toBe(true);

        const getResult = await getStream(apiClient, cookieHeader, testStream);
        expect(getResult.success, getResult.error).toBe(true);

        const updateResponse = await apiClient.put(`api/streams/${testStream}/_ingest`, {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            ingest: {
              ...getWriteableIngest(getResult.stream!),
              lifecycle: {
                dsl: {
                  data_retention: '7d',
                },
              },
            },
          },
          responseType: 'json',
        });

        expect(updateResponse).toHaveStatusCode(200);

        const verifyResult = await getStream(apiClient, cookieHeader, testStream);
        expect(verifyResult.success, verifyResult.error).toBe(true);

        expect(verifyResult.stream!.stream.ingest.lifecycle.dsl).toBeDefined();
        expect(verifyResult.stream!.stream.ingest.lifecycle.dsl.data_retention).toBe('7d');
      }
    );

    // Test: Update stream with DSL retention of 30 days
    apiTest(
      'should update stream with DSL retention of 30 days',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const testStream = `${streamNamePrefix}-dsl-30d`;

        const createResult = await createTestStream(apiClient, cookieHeader, testStream, {
          field: 'service.name',
          eq: 'retention-30d',
        });
        expect(createResult.success, createResult.error).toBe(true);

        const getResult = await getStream(apiClient, cookieHeader, testStream);
        expect(getResult.success, getResult.error).toBe(true);

        const updateResponse = await apiClient.put(`api/streams/${testStream}/_ingest`, {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            ingest: {
              ...getWriteableIngest(getResult.stream!),
              lifecycle: {
                dsl: {
                  data_retention: '30d',
                },
              },
            },
          },
          responseType: 'json',
        });

        expect(updateResponse).toHaveStatusCode(200);

        const verifyResult = await getStream(apiClient, cookieHeader, testStream);
        expect(verifyResult.success, verifyResult.error).toBe(true);
        expect(verifyResult.stream!.stream.ingest.lifecycle.dsl.data_retention).toBe('30d');
      }
    );

    // Test: Update stream with DSL retention of 90 days
    apiTest(
      'should update stream with DSL retention of 90 days',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const testStream = `${streamNamePrefix}-dsl-90d`;

        const createResult = await createTestStream(apiClient, cookieHeader, testStream, {
          field: 'service.name',
          eq: 'retention-90d',
        });
        expect(createResult.success, createResult.error).toBe(true);

        const getResult = await getStream(apiClient, cookieHeader, testStream);
        expect(getResult.success, getResult.error).toBe(true);

        const updateResponse = await apiClient.put(`api/streams/${testStream}/_ingest`, {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            ingest: {
              ...getWriteableIngest(getResult.stream!),
              lifecycle: {
                dsl: {
                  data_retention: '90d',
                },
              },
            },
          },
          responseType: 'json',
        });

        expect(updateResponse).toHaveStatusCode(200);
      }
    );

    // Test: Update stream with DSL retention using hours unit
    apiTest(
      'should update stream with DSL retention using hours unit',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const testStream = `${streamNamePrefix}-dsl-hours`;

        const createResult = await createTestStream(apiClient, cookieHeader, testStream, {
          field: 'service.name',
          eq: 'retention-hours',
        });
        expect(createResult.success, createResult.error).toBe(true);

        const getResult = await getStream(apiClient, cookieHeader, testStream);
        expect(getResult.success, getResult.error).toBe(true);

        const updateResponse = await apiClient.put(`api/streams/${testStream}/_ingest`, {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            ingest: {
              ...getWriteableIngest(getResult.stream!),
              lifecycle: {
                dsl: {
                  data_retention: '72h',
                },
              },
            },
          },
          responseType: 'json',
        });

        expect(updateResponse).toHaveStatusCode(200);
      }
    );

    // Test: Switch from inherited to DSL lifecycle
    apiTest('should switch from inherited to DSL lifecycle', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const testStream = `${streamNamePrefix}-switch-to-dsl`;

      const createResult = await createTestStream(apiClient, cookieHeader, testStream, {
        field: 'service.name',
        eq: 'switch-test',
      });
      expect(createResult.success, createResult.error).toBe(true);

      const initialResult = await getStream(apiClient, cookieHeader, testStream);
      expect(initialResult.success, initialResult.error).toBe(true);
      expect(initialResult.stream!.stream.ingest.lifecycle.inherit).toBeDefined();

      const updateResponse = await apiClient.put(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          ingest: {
            ...getWriteableIngest(initialResult.stream!),
            lifecycle: {
              dsl: {
                data_retention: '14d',
              },
            },
          },
        },
        responseType: 'json',
      });

      expect(updateResponse).toHaveStatusCode(200);

      const verifyResult = await getStream(apiClient, cookieHeader, testStream);
      expect(verifyResult.success, verifyResult.error).toBe(true);

      expect(verifyResult.stream!.stream.ingest.lifecycle.dsl).toBeDefined();
      expect(verifyResult.stream!.stream.ingest.lifecycle.inherit).toBeUndefined();
    });

    // Test: Switch from DSL back to inherited lifecycle
    apiTest(
      'should switch from DSL back to inherited lifecycle',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const testStream = `${streamNamePrefix}-switch-inherit`;

        const createResult = await createTestStream(apiClient, cookieHeader, testStream, {
          field: 'service.name',
          eq: 'switch-back',
        });
        expect(createResult.success, createResult.error).toBe(true);

        const getResult = await getStream(apiClient, cookieHeader, testStream);
        expect(getResult.success, getResult.error).toBe(true);

        // First set to DSL
        const dslUpdateResponse = await apiClient.put(`api/streams/${testStream}/_ingest`, {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            ingest: {
              ...getWriteableIngest(getResult.stream!),
              lifecycle: {
                dsl: {
                  data_retention: '7d',
                },
              },
            },
          },
          responseType: 'json',
        });
        expect(dslUpdateResponse).toHaveStatusCode(200);

        const dslResult = await getStream(apiClient, cookieHeader, testStream);
        expect(dslResult.success, dslResult.error).toBe(true);

        // Now switch back to inherited
        const inheritUpdateResponse = await apiClient.put(`api/streams/${testStream}/_ingest`, {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            ingest: {
              ...getWriteableIngest(dslResult.stream!),
              lifecycle: {
                inherit: {},
              },
            },
          },
          responseType: 'json',
        });

        expect(inheritUpdateResponse).toHaveStatusCode(200);

        const verifyResult = await getStream(apiClient, cookieHeader, testStream);
        expect(verifyResult.success, verifyResult.error).toBe(true);

        expect(verifyResult.stream!.stream.ingest.lifecycle.inherit).toBeDefined();
        expect(verifyResult.stream!.stream.ingest.lifecycle.dsl).toBeUndefined();
      }
    );

    // Test: Modify existing DSL retention value
    apiTest('should modify existing DSL retention value', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const testStream = `${streamNamePrefix}-modify-dsl`;

      const createResult = await createTestStream(apiClient, cookieHeader, testStream, {
        field: 'service.name',
        eq: 'modify-test',
      });
      expect(createResult.success, createResult.error).toBe(true);

      const getResult = await getStream(apiClient, cookieHeader, testStream);
      expect(getResult.success, getResult.error).toBe(true);

      // Set initial retention
      const initialUpdateResponse = await apiClient.put(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          ingest: {
            ...getWriteableIngest(getResult.stream!),
            lifecycle: {
              dsl: {
                data_retention: '7d',
              },
            },
          },
        },
        responseType: 'json',
      });
      expect(initialUpdateResponse).toHaveStatusCode(200);

      const stream7dResult = await getStream(apiClient, cookieHeader, testStream);
      expect(stream7dResult.success, stream7dResult.error).toBe(true);
      expect(stream7dResult.stream!.stream.ingest.lifecycle.dsl.data_retention).toBe('7d');

      // Modify retention
      const modifyUpdateResponse = await apiClient.put(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          ingest: {
            ...getWriteableIngest(stream7dResult.stream!),
            lifecycle: {
              dsl: {
                data_retention: '14d',
              },
            },
          },
        },
        responseType: 'json',
      });

      expect(modifyUpdateResponse).toHaveStatusCode(200);

      const verifyResult = await getStream(apiClient, cookieHeader, testStream);
      expect(verifyResult.success, verifyResult.error).toBe(true);
      expect(verifyResult.stream!.stream.ingest.lifecycle.dsl.data_retention).toBe('14d');
    });

    // Test: Read ingest settings via GET _ingest
    apiTest('should read ingest settings via GET _ingest', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const testStream = `${streamNamePrefix}-read-ingest`;

      const createResult = await createTestStream(apiClient, cookieHeader, testStream, {
        field: 'service.name',
        eq: 'ingest-read',
      });
      expect(createResult.success, createResult.error).toBe(true);

      const { statusCode, body } = await apiClient.get(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
      expect(body.ingest).toBeDefined();
      expect(body.ingest.lifecycle).toBeDefined();
      expect(body.ingest.processing).toBeDefined();
      expect(body.ingest.wired).toBeDefined();
    });

    // Test: Update only lifecycle without affecting other ingest settings
    apiTest(
      'should update only lifecycle without affecting other ingest settings',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const testStream = `${streamNamePrefix}-partial`;

        const createResult = await createTestStream(apiClient, cookieHeader, testStream, {
          field: 'service.name',
          eq: 'partial',
        });
        expect(createResult.success, createResult.error).toBe(true);

        const getResult = await getStream(apiClient, cookieHeader, testStream);
        expect(getResult.success, getResult.error).toBe(true);

        const originalProcessing = getResult.stream!.stream.ingest.processing;

        const updateResponse = await apiClient.put(`api/streams/${testStream}/_ingest`, {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            ingest: {
              ...getWriteableIngest(getResult.stream!),
              lifecycle: {
                dsl: {
                  data_retention: '7d',
                },
              },
            },
          },
          responseType: 'json',
        });
        expect(updateResponse).toHaveStatusCode(200);

        const verifyResult = await getStream(apiClient, cookieHeader, testStream);
        expect(verifyResult.success, verifyResult.error).toBe(true);

        expect(verifyResult.stream!.stream.ingest.lifecycle.dsl.data_retention).toBe('7d');
        expect(verifyResult.stream!.stream.ingest.processing.steps).toStrictEqual(
          originalProcessing.steps
        );
      }
    );

    // Test: Return error for non-existent stream lifecycle
    apiTest(
      'should return error for non-existent stream lifecycle',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();

        const { statusCode } = await apiClient.get('api/streams/non-existent-stream/_ingest', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        // May return 403 (forbidden) or 404 (not found) depending on permissions
        expect([403, 404]).toContain(statusCode);
      }
    );

    // Test: Return error when updating non-existent stream
    apiTest(
      'should return error when updating non-existent stream',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();

        const { statusCode } = await apiClient.put('api/streams/non-existent-stream/_ingest', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            ingest: {
              lifecycle: {
                dsl: {
                  data_retention: '7d',
                },
              },
              processing: { steps: [] },
              settings: {},
              wired: { fields: {}, routing: [] },
              failure_store: { inherit: {} },
            },
          },
          responseType: 'json',
        });

        // May return 403 (forbidden) or 404 (not found) depending on permissions
        expect([403, 404]).toContain(statusCode);
      }
    );

    // Test: Return 400 for invalid lifecycle format
    apiTest('should return 400 for invalid lifecycle format', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const testStream = `${streamNamePrefix}-invalid`;

      const createResult = await createTestStream(apiClient, cookieHeader, testStream, {
        field: 'service.name',
        eq: 'invalid',
      });
      expect(createResult.success, createResult.error).toBe(true);

      const getResult = await getStream(apiClient, cookieHeader, testStream);
      expect(getResult.success, getResult.error).toBe(true);

      const { statusCode } = await apiClient.put(`api/streams/${testStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          ingest: {
            ...getWriteableIngest(getResult.stream!),
            lifecycle: {
              invalid_type: {},
            },
          },
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(400);
    });

    // Test: Child stream inherits lifecycle from parent stream
    apiTest('should inherit lifecycle from parent stream', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      // Parent is one level: logs.lc-parent
      const parentStream = `${streamNamePrefix}-parent`;
      // Child is two levels: logs.lc-parent.child (forked from logs.lc-parent)
      const childStream = `${parentStream}.child`;

      // Create parent stream (forked from logs)
      const createParentResult = await createTestStream(apiClient, cookieHeader, parentStream, {
        field: 'service.name',
        eq: 'parent-service',
      });
      expect(createParentResult.success, createParentResult.error).toBe(true);

      const parentResult = await getStream(apiClient, cookieHeader, parentStream);
      expect(parentResult.success, parentResult.error).toBe(true);

      // Set custom retention on parent
      const updateParentResponse = await apiClient.put(`api/streams/${parentStream}/_ingest`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          ingest: {
            ...getWriteableIngest(parentResult.stream!),
            lifecycle: {
              dsl: {
                data_retention: '30d',
              },
            },
          },
        },
        responseType: 'json',
      });
      expect(updateParentResponse).toHaveStatusCode(200);

      // Create child stream (forked from parent)
      const forkChildResponse = await apiClient.post(`api/streams/${parentStream}/_fork`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          stream: { name: childStream },
          where: { field: 'log.level', eq: 'error' },
          status: 'enabled',
        },
        responseType: 'json',
      });
      expect(forkChildResponse).toHaveStatusCode(200);

      const childResult = await getStream(apiClient, cookieHeader, childStream);
      expect(childResult.success, childResult.error).toBe(true);

      expect(childResult.stream!.stream.ingest.lifecycle.inherit).toBeDefined();
      expect(childResult.stream!.effective_lifecycle.from).toBe(parentStream);
    });
  }
);
