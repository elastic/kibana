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
  'Stream data routing - fork stream API (CRUD)',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    // Stream names must be exactly one level deep when forking from 'logs'
    // Format: logs.<name> where name uses hyphens, not dots
    const streamNamePrefix = 'logs.rt';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type StreamWhere = any;

    apiTest.afterEach(async ({ apiServices }) => {
      // Cleanup test streams - matches any stream starting with 'logs.rt'
      await apiServices.streamsTest.cleanupTestStreams(streamNamePrefix);
    });

    // Basic fork operations
    apiTest(
      'should create a child stream via fork API with eq condition',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const childStreamName = `${streamNamePrefix}-child-eq`;

        const { statusCode, body } = await apiClient.post('api/streams/logs/_fork', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            stream: { name: childStreamName },
            where: { field: 'service.name', eq: 'test-service' },
            status: 'enabled',
          },
          responseType: 'json',
        });

        expect(statusCode).toBe(200);
        expect(body.acknowledged).toBe(true);

        // Verify the stream was created
        const { statusCode: getStatus, body: getBody } = await apiClient.get(
          `api/streams/${childStreamName}`,
          {
            headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
            responseType: 'json',
          }
        );

        expect(getStatus).toBe(200);
        expect(getBody.stream.name).toBe(childStreamName);
      }
    );

    apiTest('should create a child stream with neq condition', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const childStreamName = `${streamNamePrefix}-child-neq`;

      const { statusCode, body } = await apiClient.post('api/streams/logs/_fork', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          stream: { name: childStreamName },
          where: { field: 'log.level', neq: 'debug' },
          status: 'enabled',
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
      expect(body.acknowledged).toBe(true);
    });

    apiTest(
      'should create a child stream with contains condition',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const childStreamName = `${streamNamePrefix}-child-contains`;

        const { statusCode, body } = await apiClient.post('api/streams/logs/_fork', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            stream: { name: childStreamName },
            where: { field: 'message', contains: 'error' },
            status: 'enabled',
          },
          responseType: 'json',
        });

        expect(statusCode).toBe(200);
        expect(body.acknowledged).toBe(true);
      }
    );

    apiTest(
      'should create a child stream with startsWith condition',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const childStreamName = `${streamNamePrefix}-child-starts`;

        const { statusCode, body } = await apiClient.post('api/streams/logs/_fork', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            stream: { name: childStreamName },
            where: { field: 'host.name', startsWith: 'prod-' },
            status: 'enabled',
          },
          responseType: 'json',
        });

        expect(statusCode).toBe(200);
        expect(body.acknowledged).toBe(true);
      }
    );

    apiTest(
      'should create a child stream with endsWith condition',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const childStreamName = `${streamNamePrefix}-child-ends`;

        const { statusCode, body } = await apiClient.post('api/streams/logs/_fork', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            stream: { name: childStreamName },
            where: { field: 'file.path', endsWith: '.log' },
            status: 'enabled',
          },
          responseType: 'json',
        });

        expect(statusCode).toBe(200);
        expect(body.acknowledged).toBe(true);
      }
    );

    apiTest(
      'should create a child stream with exists condition',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const childStreamName = `${streamNamePrefix}-child-exists`;

        const { statusCode, body } = await apiClient.post('api/streams/logs/_fork', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            stream: { name: childStreamName },
            where: { field: 'error.message', exists: true },
            status: 'enabled',
          },
          responseType: 'json',
        });

        expect(statusCode).toBe(200);
        expect(body.acknowledged).toBe(true);
      }
    );

    apiTest(
      'should create a child stream with numeric comparisons',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const childStreamName = `${streamNamePrefix}-child-numeric`;

        // Test gte (greater than or equal)
        const { statusCode } = await apiClient.post('api/streams/logs/_fork', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            stream: { name: childStreamName },
            where: { field: 'http.response.status_code', gte: 500 },
            status: 'enabled',
          },
          responseType: 'json',
        });

        expect(statusCode).toBe(200);
      }
    );

    // Routing rule status tests
    apiTest('should create a disabled routing rule', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const childStreamName = `${streamNamePrefix}-disabled`;

      const { statusCode } = await apiClient.post('api/streams/logs/_fork', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          stream: { name: childStreamName },
          where: { field: 'severity_text', eq: 'debug' },
          status: 'disabled',
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(200);

      // Verify the parent stream has the routing rule as disabled
      const { body: parentBody } = await apiClient.get('api/streams/logs', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      const routingRule = parentBody.stream.ingest.wired.routing.find(
        (r: { destination: string }) => r.destination === childStreamName
      );
      expect(routingRule).toBeDefined();
      expect(routingRule.status).toBe('disabled');
    });

    apiTest(
      'should default to enabled when status is omitted but condition matches',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const childStreamName = `${streamNamePrefix}-dflt-enabled`;

        const { statusCode } = await apiClient.post('api/streams/logs/_fork', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            stream: { name: childStreamName },
            where: { field: 'service.name', eq: 'some-service' },
            // status not provided - should default to enabled
          },
          responseType: 'json',
        });

        expect(statusCode).toBe(200);

        // Verify the routing rule status
        const { body: parentBody } = await apiClient.get('api/streams/logs', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        const routingRule = parentBody.stream.ingest.wired.routing.find(
          (r: { destination: string }) => r.destination === childStreamName
        );
        expect(routingRule).toBeDefined();
        expect(routingRule.status).toBe('enabled');
      }
    );

    // Nested streams tests
    apiTest('should create nested child streams (2 levels)', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      // Level 1: logs.rt-level1 (forked from logs)
      const level1Stream = `${streamNamePrefix}-level1`;
      // Level 2: logs.rt-level1.level2 (forked from logs.rt-level1)
      const level2Stream = `${level1Stream}.level2`;

      // Create first level child
      const { statusCode: l1CreateStatus } = await apiClient.post('api/streams/logs/_fork', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          stream: { name: level1Stream },
          where: { field: 'service.name', eq: 'level1' },
          status: 'enabled',
        },
        responseType: 'json',
      });
      expect(l1CreateStatus).toBe(200);

      // Create second level child (forked from level1)
      const { statusCode } = await apiClient.post(`api/streams/${level1Stream}/_fork`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          stream: { name: level2Stream },
          where: { field: 'log.level', eq: 'error' },
          status: 'enabled',
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(200);

      // Verify both streams exist
      const { statusCode: l1Status } = await apiClient.get(`api/streams/${level1Stream}`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      expect(l1Status).toBe(200);

      const { statusCode: l2Status } = await apiClient.get(`api/streams/${level2Stream}`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      expect(l2Status).toBe(200);
    });

    apiTest('should create multiple sibling streams', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const sibling1 = `${streamNamePrefix}-sibling1`;
      const sibling2 = `${streamNamePrefix}-sibling2`;
      const sibling3 = `${streamNamePrefix}-sibling3`;

      // Create three sibling streams
      for (const [streamName, serviceName] of [
        [sibling1, 'service-a'],
        [sibling2, 'service-b'],
        [sibling3, 'service-c'],
      ]) {
        const { statusCode } = await apiClient.post('api/streams/logs/_fork', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            stream: { name: streamName },
            where: { field: 'service.name', eq: serviceName },
            status: 'enabled',
          },
          responseType: 'json',
        });
        expect(statusCode).toBe(200);
      }

      // Verify parent has all routing rules
      const { body: parentBody } = await apiClient.get('api/streams/logs', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      const destinations = parentBody.stream.ingest.wired.routing.map(
        (r: { destination: string }) => r.destination
      );
      expect(destinations).toContain(sibling1);
      expect(destinations).toContain(sibling2);
      expect(destinations).toContain(sibling3);
    });

    // Delete operations
    apiTest('should delete a child stream', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const childStreamName = `${streamNamePrefix}-to-delete`;

      // Create stream first
      const { statusCode: createStatus } = await apiClient.post('api/streams/logs/_fork', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          stream: { name: childStreamName },
          where: { field: 'service.name', eq: 'to-delete' },
          status: 'enabled',
        },
        responseType: 'json',
      });
      expect(createStatus).toBe(200);

      // Delete the stream
      const { statusCode } = await apiClient.delete(`api/streams/${childStreamName}`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(statusCode).toBe(200);

      // Verify stream is deleted
      const { statusCode: getStatus } = await apiClient.get(`api/streams/${childStreamName}`, {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      expect(getStatus).toBe(404);
    });

    // Complex conditions
    apiTest('should support AND condition', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const childStreamName = `${streamNamePrefix}-cplx-and`;

      const { statusCode, body } = await apiClient.post('api/streams/logs/_fork', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          stream: { name: childStreamName },
          where: {
            and: [
              { field: 'service.name', eq: 'api-gateway' },
              { field: 'log.level', eq: 'error' },
            ],
          },
          status: 'enabled',
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
      expect(body.acknowledged).toBe(true);
    });

    apiTest('should support OR condition', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const childStreamName = `${streamNamePrefix}-cplx-or`;

      const { statusCode, body } = await apiClient.post('api/streams/logs/_fork', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          stream: { name: childStreamName },
          where: {
            or: [
              { field: 'service.name', eq: 'service-a' },
              { field: 'service.name', eq: 'service-b' },
            ],
          },
          status: 'enabled',
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
      expect(body.acknowledged).toBe(true);
    });

    apiTest('should support NOT condition', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const childStreamName = `${streamNamePrefix}-cplx-not`;

      const { statusCode, body } = await apiClient.post('api/streams/logs/_fork', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          stream: { name: childStreamName },
          where: {
            not: { field: 'log.level', eq: 'debug' },
          },
          status: 'enabled',
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
      expect(body.acknowledged).toBe(true);
    });

    apiTest('should support nested AND/OR conditions', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const childStreamName = `${streamNamePrefix}-cplx-nested`;

      const { statusCode, body } = await apiClient.post('api/streams/logs/_fork', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          stream: { name: childStreamName },
          where: {
            and: [
              { field: 'environment', eq: 'production' },
              {
                or: [
                  { field: 'log.level', eq: 'error' },
                  { field: 'log.level', eq: 'warn' },
                ],
              },
            ],
          },
          status: 'enabled',
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
      expect(body.acknowledged).toBe(true);
    });

    apiTest('should support always condition', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const childStreamName = `${streamNamePrefix}-always`;

      const { statusCode, body } = await apiClient.post('api/streams/logs/_fork', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          stream: { name: childStreamName },
          where: { always: {} },
          status: 'enabled',
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
      expect(body.acknowledged).toBe(true);
    });

    apiTest('should support never condition (auto-disables)', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const childStreamName = `${streamNamePrefix}-never`;

      const { statusCode } = await apiClient.post('api/streams/logs/_fork', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          stream: { name: childStreamName },
          where: { never: {} },
          // status not provided - should auto-disable due to never condition
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(200);

      // Verify the routing rule is disabled
      const { body: parentBody } = await apiClient.get('api/streams/logs', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      const routingRule = parentBody.stream.ingest.wired.routing.find(
        (r: { destination: string }) => r.destination === childStreamName
      );
      expect(routingRule).toBeDefined();
      expect(routingRule.status).toBe('disabled');
    });

    apiTest('should support range condition', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const childStreamName = `${streamNamePrefix}-range`;

      const { statusCode, body } = await apiClient.post('api/streams/logs/_fork', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          stream: { name: childStreamName },
          where: {
            field: 'http.response.status_code',
            range: { gte: 400, lt: 500 },
          },
          status: 'enabled',
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(200);
      expect(body.acknowledged).toBe(true);
    });

    // Error handling
    apiTest('should fail to fork with empty condition object', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode } = await apiClient.post('api/streams/logs/_fork', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          stream: { name: `${streamNamePrefix}-invalid-cond` },
          where: {},
          status: 'enabled',
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(400);
    });

    apiTest('should fail to fork to an existing stream name', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const childStreamName = `${streamNamePrefix}-duplicate`;

      // Create stream first
      await apiClient.post('api/streams/logs/_fork', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          stream: { name: childStreamName },
          where: { field: 'service.name', eq: 'dup1' },
          status: 'enabled',
        },
        responseType: 'json',
      });

      // Try to create stream with same name - should fail
      const { statusCode } = await apiClient.post('api/streams/logs/_fork', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          stream: { name: childStreamName },
          where: { field: 'service.name', eq: 'dup2' },
          status: 'enabled',
        },
        responseType: 'json',
      });

      // Should return conflict
      expect(statusCode).toBe(409);
    });

    apiTest(
      'should fail to fork from non-existent parent stream',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();

        const { statusCode } = await apiClient.post('api/streams/non-existent-parent/_fork', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            stream: { name: `${streamNamePrefix}-orphan` },
            where: { field: 'service.name', eq: 'orphan' },
            status: 'enabled',
          },
          responseType: 'json',
        });

        // May return 403 (forbidden) or 404 (not found) depending on permissions
        expect([403, 404]).toContain(statusCode);
      }
    );

    apiTest('should fail with missing stream name', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode } = await apiClient.post('api/streams/logs/_fork', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          stream: {},
          where: { field: 'service.name', eq: 'test' },
          status: 'enabled',
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(400);
    });

    apiTest('should fail with invalid status value', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode } = await apiClient.post('api/streams/logs/_fork', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          stream: { name: `${streamNamePrefix}-invalid-sts` },
          where: { field: 'service.name', eq: 'test' },
          status: 'invalid_status',
        },
        responseType: 'json',
      });

      expect(statusCode).toBe(400);
    });

    // Routing rule update tests
    apiTest('should update routing rule condition', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const childStreamName = `${streamNamePrefix}-update-cond`;

      // Create stream first
      const { statusCode: createStatus } = await apiClient.post('api/streams/logs/_fork', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          stream: { name: childStreamName },
          where: { field: 'service.name', eq: 'original-service' },
          status: 'enabled',
        },
        responseType: 'json',
      });
      expect(createStatus).toBe(200);

      // Get the parent stream to get current routing rules
      const { body: parentBody } = await apiClient.get('api/streams/logs', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      // Find and update the routing rule
      const updatedRouting = parentBody.stream.ingest.wired.routing.map(
        (rule: { destination: string; where: StreamWhere; status: string }) => {
          if (rule.destination === childStreamName) {
            return {
              ...rule,
              where: { field: 'service.name', eq: 'updated-service' },
            };
          }
          return rule;
        }
      );

      // Update parent stream with new routing
      const { updated_at: _, ...processingWithoutUpdatedAt } =
        parentBody.stream.ingest.processing || {};
      const updateResponse = await apiClient.put('api/streams/logs/_ingest', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          ingest: {
            ...parentBody.stream.ingest,
            processing: processingWithoutUpdatedAt,
            wired: {
              ...parentBody.stream.ingest.wired,
              routing: updatedRouting,
            },
          },
        },
        responseType: 'json',
      });

      expect(updateResponse.statusCode).toBe(200);

      // Verify the routing rule was updated
      const { body: verifyBody } = await apiClient.get('api/streams/logs', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      const updatedRule = verifyBody.stream.ingest.wired.routing.find(
        (r: { destination: string }) => r.destination === childStreamName
      );
      expect(updatedRule).toBeDefined();
      expect(updatedRule.where.eq).toBe('updated-service');
    });

    apiTest(
      'should update routing rule status from enabled to disabled',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const childStreamName = `${streamNamePrefix}-toggle-status`;

        // Create stream with enabled status
        await apiClient.post('api/streams/logs/_fork', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            stream: { name: childStreamName },
            where: { field: 'service.name', eq: 'toggle-test' },
            status: 'enabled',
          },
          responseType: 'json',
        });

        // Get parent stream
        const { body: parentBody } = await apiClient.get('api/streams/logs', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        // Update status to disabled
        const updatedRouting = parentBody.stream.ingest.wired.routing.map(
          (rule: { destination: string; where: StreamWhere; status: string }) => {
            if (rule.destination === childStreamName) {
              return { ...rule, status: 'disabled' };
            }
            return rule;
          }
        );

        const { updated_at: _, ...processingWithoutUpdatedAt } =
          parentBody.stream.ingest.processing || {};
        const updateResponse = await apiClient.put('api/streams/logs/_ingest', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            ingest: {
              ...parentBody.stream.ingest,
              processing: processingWithoutUpdatedAt,
              wired: {
                ...parentBody.stream.ingest.wired,
                routing: updatedRouting,
              },
            },
          },
          responseType: 'json',
        });

        expect(updateResponse.statusCode).toBe(200);

        // Verify status was updated
        const { body: verifyBody } = await apiClient.get('api/streams/logs', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        const updatedRule = verifyBody.stream.ingest.wired.routing.find(
          (r: { destination: string }) => r.destination === childStreamName
        );
        expect(updatedRule.status).toBe('disabled');
      }
    );

    apiTest('should reorder routing rules', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();
      const stream1 = `${streamNamePrefix}-reorder1`;
      const stream2 = `${streamNamePrefix}-reorder2`;
      const stream3 = `${streamNamePrefix}-reorder3`;

      // Create three streams in order
      for (const [streamName, serviceName] of [
        [stream1, 'service-1'],
        [stream2, 'service-2'],
        [stream3, 'service-3'],
      ]) {
        await apiClient.post('api/streams/logs/_fork', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            stream: { name: streamName },
            where: { field: 'service.name', eq: serviceName },
            status: 'enabled',
          },
          responseType: 'json',
        });
      }

      // Get parent stream
      const { body: parentBody } = await apiClient.get('api/streams/logs', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      // Reorder: move stream3 to first position among our test streams
      const testStreamRoutes = parentBody.stream.ingest.wired.routing.filter(
        (r: { destination: string }) =>
          r.destination === stream1 || r.destination === stream2 || r.destination === stream3
      );

      const otherRoutes = parentBody.stream.ingest.wired.routing.filter(
        (r: { destination: string }) =>
          r.destination !== stream1 && r.destination !== stream2 && r.destination !== stream3
      );

      // Reorder test routes: stream3, stream1, stream2
      const reorderedTestRoutes = [
        testStreamRoutes.find((r: { destination: string }) => r.destination === stream3),
        testStreamRoutes.find((r: { destination: string }) => r.destination === stream1),
        testStreamRoutes.find((r: { destination: string }) => r.destination === stream2),
      ];

      const reorderedRouting = [...otherRoutes, ...reorderedTestRoutes];

      const { updated_at: _, ...processingWithoutUpdatedAt } =
        parentBody.stream.ingest.processing || {};
      const updateResponse = await apiClient.put('api/streams/logs/_ingest', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        body: {
          ingest: {
            ...parentBody.stream.ingest,
            processing: processingWithoutUpdatedAt,
            wired: {
              ...parentBody.stream.ingest.wired,
              routing: reorderedRouting,
            },
          },
        },
        responseType: 'json',
      });

      expect(updateResponse.statusCode).toBe(200);

      // Verify the order was updated
      const { body: verifyBody } = await apiClient.get('api/streams/logs', {
        headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      const testRoutes = verifyBody.stream.ingest.wired.routing.filter(
        (r: { destination: string }) =>
          r.destination === stream1 || r.destination === stream2 || r.destination === stream3
      );

      // stream3 should come before stream1 and stream2
      const stream3Index = testRoutes.findIndex(
        (r: { destination: string }) => r.destination === stream3
      );
      const stream1Index = testRoutes.findIndex(
        (r: { destination: string }) => r.destination === stream1
      );
      const stream2Index = testRoutes.findIndex(
        (r: { destination: string }) => r.destination === stream2
      );

      expect(stream3Index).toBeLessThan(stream1Index);
      expect(stream1Index).toBeLessThan(stream2Index);
    });

    apiTest(
      'should update routing rule to use complex condition',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const childStreamName = `${streamNamePrefix}-complex-upd`;

        // Create stream with simple condition
        await apiClient.post('api/streams/logs/_fork', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            stream: { name: childStreamName },
            where: { field: 'service.name', eq: 'simple' },
            status: 'enabled',
          },
          responseType: 'json',
        });

        // Get parent stream
        const { body: parentBody } = await apiClient.get('api/streams/logs', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        // Update to complex AND condition
        const updatedRouting = parentBody.stream.ingest.wired.routing.map(
          (rule: { destination: string; where: StreamWhere; status: string }) => {
            if (rule.destination === childStreamName) {
              return {
                ...rule,
                where: {
                  and: [
                    { field: 'service.name', eq: 'api-gateway' },
                    { field: 'log.level', eq: 'error' },
                  ],
                },
              };
            }
            return rule;
          }
        );

        const { updated_at: _, ...processingWithoutUpdatedAt } =
          parentBody.stream.ingest.processing || {};
        const updateResponse = await apiClient.put('api/streams/logs/_ingest', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          body: {
            ingest: {
              ...parentBody.stream.ingest,
              processing: processingWithoutUpdatedAt,
              wired: {
                ...parentBody.stream.ingest.wired,
                routing: updatedRouting,
              },
            },
          },
          responseType: 'json',
        });

        expect(updateResponse.statusCode).toBe(200);

        // Verify the complex condition was saved
        const { body: verifyBody } = await apiClient.get('api/streams/logs', {
          headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        const updatedRule = verifyBody.stream.ingest.wired.routing.find(
          (r: { destination: string }) => r.destination === childStreamName
        );
        expect(updatedRule.where.and).toBeDefined();
        expect(updatedRule.where.and).toHaveLength(2);
      }
    );
  }
);
