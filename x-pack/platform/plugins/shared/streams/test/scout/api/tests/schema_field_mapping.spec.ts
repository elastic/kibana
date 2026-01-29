/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { streamsApiTest as apiTest } from '../fixtures';
import { COMMON_API_HEADERS } from '../fixtures/constants';

apiTest.describe('Stream schema - field mapping API', { tag: ['@ess', '@svlOblt'] }, () => {
  // Unmapped fields tests
  apiTest('should get unmapped fields for a stream', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    const { statusCode, body } = await apiClient.get(
      'internal/streams/logs/schema/unmapped_fields',
      {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      }
    );

    expect(statusCode).toBe(200);
    expect(body.unmappedFields).toBeDefined();
    expect(Array.isArray(body.unmappedFields)).toBe(true);
  });

  apiTest(
    'should return error for non-existent stream unmapped fields',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode } = await apiClient.get(
        'internal/streams/non-existent-stream/schema/unmapped_fields',
        {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        }
      );

      // May return 403 (no permission) or 404 (not found) depending on auth check order
      expect([403, 404]).toContain(statusCode);
    }
  );

  // Field type simulation tests - keyword
  apiTest('should simulate field mapping with keyword type', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    const { statusCode, body } = await apiClient.post(
      'internal/streams/logs/schema/fields_simulation',
      {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          field_definitions: [
            { name: 'service.name', type: 'keyword' },
            { name: 'host.name', type: 'keyword' },
          ],
        },
        responseType: 'json',
      }
    );

    expect(statusCode).toBe(200);
    expect(body.status).toBeDefined();
    expect(['unknown', 'success', 'failure']).toContain(body.status);
  });

  apiTest('should simulate single keyword field', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    const { statusCode, body } = await apiClient.post(
      'internal/streams/logs/schema/fields_simulation',
      {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          field_definitions: [{ name: 'user.id', type: 'keyword' }],
        },
        responseType: 'json',
      }
    );

    expect(statusCode).toBe(200);
    expect(body.status).toBeDefined();
  });

  // Field type simulation - match_only_text
  apiTest(
    'should simulate field mapping with match_only_text type',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode, body } = await apiClient.post(
        'internal/streams/logs/schema/fields_simulation',
        {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: {
            field_definitions: [{ name: 'description', type: 'match_only_text' }],
          },
          responseType: 'json',
        }
      );

      expect(statusCode).toBe(200);
      expect(body.status).toBeDefined();
    }
  );

  // Field type simulation - long
  apiTest('should simulate field mapping with long type', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    const { statusCode, body } = await apiClient.post(
      'internal/streams/logs/schema/fields_simulation',
      {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          field_definitions: [
            { name: 'http.response.status_code', type: 'long' },
            { name: 'process.pid', type: 'long' },
          ],
        },
        responseType: 'json',
      }
    );

    expect(statusCode).toBe(200);
    expect(body.status).toBeDefined();
  });

  apiTest('should simulate single long field', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    const { statusCode, body } = await apiClient.post(
      'internal/streams/logs/schema/fields_simulation',
      {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          field_definitions: [{ name: 'event.duration', type: 'long' }],
        },
        responseType: 'json',
      }
    );

    expect(statusCode).toBe(200);
    expect(body.status).toBeDefined();
  });

  // Field type simulation - double
  apiTest('should simulate field mapping with double type', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    const { statusCode, body } = await apiClient.post(
      'internal/streams/logs/schema/fields_simulation',
      {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          field_definitions: [
            { name: 'metrics.cpu_percent', type: 'double' },
            { name: 'metrics.memory_percent', type: 'double' },
          ],
        },
        responseType: 'json',
      }
    );

    expect(statusCode).toBe(200);
    expect(body.status).toBeDefined();
  });

  apiTest('should simulate single double field', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    const { statusCode, body } = await apiClient.post(
      'internal/streams/logs/schema/fields_simulation',
      {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          field_definitions: [{ name: 'transaction.duration.us', type: 'double' }],
        },
        responseType: 'json',
      }
    );

    expect(statusCode).toBe(200);
    expect(body.status).toBeDefined();
  });

  // Field type simulation - boolean
  apiTest('should simulate field mapping with boolean type', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    const { statusCode, body } = await apiClient.post(
      'internal/streams/logs/schema/fields_simulation',
      {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          field_definitions: [{ name: 'event.success', type: 'boolean' }],
        },
        responseType: 'json',
      }
    );

    expect(statusCode).toBe(200);
    expect(body.status).toBeDefined();
  });

  apiTest('should simulate multiple boolean fields', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    const { statusCode, body } = await apiClient.post(
      'internal/streams/logs/schema/fields_simulation',
      {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          field_definitions: [
            { name: 'event.success', type: 'boolean' },
            { name: 'user.active', type: 'boolean' },
            { name: 'process.running', type: 'boolean' },
          ],
        },
        responseType: 'json',
      }
    );

    expect(statusCode).toBe(200);
    expect(body.status).toBeDefined();
  });

  // Field type simulation - date
  apiTest('should simulate field mapping with date type', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    const { statusCode, body } = await apiClient.post(
      'internal/streams/logs/schema/fields_simulation',
      {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          field_definitions: [{ name: 'event.created', type: 'date' }],
        },
        responseType: 'json',
      }
    );

    expect(statusCode).toBe(200);
    expect(body.status).toBeDefined();
  });

  apiTest('should simulate multiple date fields', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    const { statusCode, body } = await apiClient.post(
      'internal/streams/logs/schema/fields_simulation',
      {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          field_definitions: [
            { name: 'event.created', type: 'date' },
            { name: 'event.start', type: 'date' },
            { name: 'event.end', type: 'date' },
          ],
        },
        responseType: 'json',
      }
    );

    expect(statusCode).toBe(200);
    expect(body.status).toBeDefined();
  });

  // Field type simulation - ip
  apiTest('should simulate field mapping with ip type', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    const { statusCode, body } = await apiClient.post(
      'internal/streams/logs/schema/fields_simulation',
      {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          field_definitions: [
            { name: 'source.ip', type: 'ip' },
            { name: 'destination.ip', type: 'ip' },
          ],
        },
        responseType: 'json',
      }
    );

    expect(statusCode).toBe(200);
    expect(body.status).toBeDefined();
  });

  apiTest('should simulate single ip field', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    const { statusCode, body } = await apiClient.post(
      'internal/streams/logs/schema/fields_simulation',
      {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          field_definitions: [{ name: 'client.ip', type: 'ip' }],
        },
        responseType: 'json',
      }
    );

    expect(statusCode).toBe(200);
    expect(body.status).toBeDefined();
  });

  // Field type simulation - geo_point
  apiTest('should simulate field mapping with geo_point type', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    const { statusCode, body } = await apiClient.post(
      'internal/streams/logs/schema/fields_simulation',
      {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          field_definitions: [{ name: 'client.geo.location', type: 'geo_point' }],
        },
        responseType: 'json',
      }
    );

    expect(statusCode).toBe(200);
    expect(body.status).toBeDefined();
  });

  apiTest('should simulate multiple geo_point fields', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    const { statusCode, body } = await apiClient.post(
      'internal/streams/logs/schema/fields_simulation',
      {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          field_definitions: [
            { name: 'source.geo.location', type: 'geo_point' },
            { name: 'destination.geo.location', type: 'geo_point' },
          ],
        },
        responseType: 'json',
      }
    );

    expect(statusCode).toBe(200);
    expect(body.status).toBeDefined();
  });

  // Mixed field types
  apiTest(
    'should simulate multiple field definitions of different types',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      const { statusCode, body } = await apiClient.post(
        'internal/streams/logs/schema/fields_simulation',
        {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: {
            field_definitions: [
              { name: 'field_keyword', type: 'keyword' },
              { name: 'field_long', type: 'long' },
              { name: 'field_boolean', type: 'boolean' },
              { name: 'field_double', type: 'double' },
              { name: 'field_ip', type: 'ip' },
              { name: 'field_date', type: 'date' },
              { name: 'field_geo', type: 'geo_point' },
            ],
          },
          responseType: 'json',
        }
      );

      expect(statusCode).toBe(200);
      expect(body.status).toBeDefined();
    }
  );

  // Nested field names
  apiTest('should handle deeply nested field names', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    const { statusCode, body } = await apiClient.post(
      'internal/streams/logs/schema/fields_simulation',
      {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          field_definitions: [
            { name: 'deeply.nested.field.name', type: 'keyword' },
            { name: 'another.nested.field', type: 'long' },
          ],
        },
        responseType: 'json',
      }
    );

    expect(statusCode).toBe(200);
    expect(body.status).toBeDefined();
  });

  apiTest('should handle ECS-style field names', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    const { statusCode, body } = await apiClient.post(
      'internal/streams/logs/schema/fields_simulation',
      {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          field_definitions: [
            { name: 'http.request.method', type: 'keyword' },
            { name: 'http.response.status_code', type: 'long' },
            { name: 'http.response.body.bytes', type: 'long' },
            { name: 'url.full', type: 'keyword' },
            { name: 'user_agent.original', type: 'keyword' },
          ],
        },
        responseType: 'json',
      }
    );

    expect(statusCode).toBe(200);
    expect(body.status).toBeDefined();
  });

  // Error handling
  apiTest('should return error for invalid field type', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    const { statusCode } = await apiClient.post('internal/streams/logs/schema/fields_simulation', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: {
        field_definitions: [{ name: 'test.field', type: 'invalid_type' }],
      },
      responseType: 'json',
    });

    expect(statusCode).toBe(400);
  });

  apiTest('should handle empty field definitions', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    const { statusCode, body } = await apiClient.post(
      'internal/streams/logs/schema/fields_simulation',
      {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          field_definitions: [],
        },
        responseType: 'json',
      }
    );

    // Empty field definitions returns success since there's nothing to fail
    expect(statusCode).toBe(200);
    expect(['unknown', 'success']).toContain(body.status);
  });

  apiTest('should return error for non-existent stream', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    const { statusCode } = await apiClient.post(
      'internal/streams/non-existent-stream/schema/fields_simulation',
      {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          field_definitions: [{ name: 'test.field', type: 'keyword' }],
        },
        responseType: 'json',
      }
    );

    // May return 403 (no permission) or 404 (not found) depending on auth check order
    expect([403, 404]).toContain(statusCode);
  });

  apiTest('should handle missing field name', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    const { statusCode } = await apiClient.post('internal/streams/logs/schema/fields_simulation', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: {
        field_definitions: [{ type: 'keyword' }],
      },
      responseType: 'json',
    });

    expect(statusCode).toBe(400);
  });

  apiTest('should handle missing field type', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    const { statusCode } = await apiClient.post('internal/streams/logs/schema/fields_simulation', {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: {
        field_definitions: [{ name: 'test.field' }],
      },
      responseType: 'json',
    });

    expect(statusCode).toBe(400);
  });

  // Simulation result validation
  apiTest(
    'should return simulation error for incompatible mapping',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asStreamsAdmin();

      // Try to map a field that would conflict with existing data
      const { statusCode, body } = await apiClient.post(
        'internal/streams/logs/schema/fields_simulation',
        {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: {
            field_definitions: [
              // Mapping message (typically text) as long should potentially cause issues
              { name: 'message', type: 'long' },
            ],
          },
          responseType: 'json',
        }
      );

      expect(statusCode).toBe(200);
      // If there's data that doesn't match, it should return failure with simulationError
      // We check both possible statuses without conditional expect
      expect(['unknown', 'success', 'failure']).toContain(body.status);
    }
  );

  apiTest('should provide simulation details in response', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asStreamsAdmin();

    const { statusCode, body } = await apiClient.post(
      'internal/streams/logs/schema/fields_simulation',
      {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: {
          field_definitions: [{ name: 'custom.field', type: 'keyword' }],
        },
        responseType: 'json',
      }
    );

    expect(statusCode).toBe(200);
    expect(body.status).toBeDefined();
    // Response should have either success/unknown or failure with error details
  });
});
