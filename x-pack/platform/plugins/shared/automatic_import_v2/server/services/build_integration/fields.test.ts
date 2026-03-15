/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import { generateFieldMappings, mergeSamples } from './fields';

const KNOWN_ECS_FIELDS = new Set([
  '@timestamp',
  'message',
  'source.ip',
  'source.port',
  'event.category',
  'event.type',
  'event.action',
  'event.dataset',
  'http.request.method',
  'http.response.status_code',
  'http.response.body.bytes',
  'url.path',
]);

const createMockFieldsMetadataClient = (): jest.Mocked<IFieldsMetadataClient> => {
  const mock: jest.Mocked<IFieldsMetadataClient> = {
    getByName: jest.fn(),
    find: jest.fn().mockImplementation(({ fieldNames, source }) => {
      const matchedFields: Record<string, { name: string; source: string }> = {};
      if (source?.includes('ecs') && fieldNames) {
        for (const name of fieldNames) {
          if (KNOWN_ECS_FIELDS.has(name)) {
            matchedFields[name] = { name, source: 'ecs' };
          }
        }
      }
      return Promise.resolve({ toPlain: () => matchedFields });
    }),
  };
  return mock;
};

describe('fields', () => {
  let fieldsMetadataClient: jest.Mocked<IFieldsMetadataClient>;

  beforeEach(() => {
    fieldsMetadataClient = createMockFieldsMetadataClient();
  });

  describe('mergeSamples', () => {
    it('returns empty object for empty input', () => {
      expect(mergeSamples([])).toEqual({});
    });

    it('returns the doc itself for a single doc', () => {
      const doc = { foo: 'bar', count: 42 };
      expect(mergeSamples([doc])).toEqual({ foo: 'bar', count: 42 });
    });

    it('merges multiple docs with distinct keys', () => {
      const docs = [{ a: 1 }, { b: 'hello' }, { c: true }];
      expect(mergeSamples(docs)).toEqual({ a: 1, b: 'hello', c: true });
    });

    it('deep-merges nested objects', () => {
      const docs = [
        { server: { ip: '1.2.3.4' } },
        { server: { port: 443, hostname: 'example.com' } },
      ];
      const result = mergeSamples(docs);
      expect(result).toEqual({
        server: { ip: '1.2.3.4', port: 443, hostname: 'example.com' },
      });
    });

    it('keeps the first non-empty value when keys overlap', () => {
      const docs = [{ status: 'ok' }, { status: 'error' }];
      const result = mergeSamples(docs);
      expect(result.status).toBe('ok');
    });

    it('fills empty values from later docs', () => {
      const docs = [{ status: null }, { status: 'active' }];
      const result = mergeSamples(docs);
      expect(result.status).toBe('active');
    });

    it('handles arrays by copying them', () => {
      const docs = [{ tags: ['web', 'prod'] }, { tags: ['staging'] }];
      const result = mergeSamples(docs);
      expect(result.tags).toEqual(['staging']);
    });

    it('skips unsafe property names', () => {
      const docs = [{ __proto__: { polluted: true }, safe_field: 'ok' }];
      const result = mergeSamples(docs);
      expect(result.safe_field).toBe('ok');
      expect((result as Record<string, unknown>).__proto__).toBeUndefined();
    });
  });

  describe('generateFieldMappings', () => {
    it('returns empty array for empty input', async () => {
      expect(await generateFieldMappings([], fieldsMetadataClient)).toEqual([]);
    });

    it('generates fields for simple scalar values', async () => {
      const docs = [
        {
          my_app: {
            request_id: 'abc123',
            status_code: 200,
            success: true,
          },
        },
      ];
      const fields = await generateFieldMappings(docs, fieldsMetadataClient);

      expect(fields).toEqual(
        expect.arrayContaining([
          { name: 'my_app.request_id', type: 'keyword', is_ecs: false },
          { name: 'my_app.status_code', type: 'long', is_ecs: false },
          { name: 'my_app.success', type: 'boolean', is_ecs: false },
        ])
      );
    });

    it('marks ECS fields as is_ecs: true using fields_metadata', async () => {
      const docs = [
        {
          source: { ip: '10.0.0.1', port: 8080 },
          event: { category: 'network', type: 'connection' },
          message: 'test log line',
        },
      ];
      const fields = await generateFieldMappings(docs, fieldsMetadataClient);

      const sourceIp = fields.find((f) => f.name === 'source.ip');
      const sourcePort = fields.find((f) => f.name === 'source.port');
      const eventCategory = fields.find((f) => f.name === 'event.category');
      const message = fields.find((f) => f.name === 'message');

      expect(sourceIp).toEqual({ name: 'source.ip', type: 'keyword', is_ecs: true });
      expect(sourcePort).toEqual({ name: 'source.port', type: 'long', is_ecs: true });
      expect(eventCategory).toEqual({ name: 'event.category', type: 'keyword', is_ecs: true });
      expect(message).toEqual({ name: 'message', type: 'keyword', is_ecs: true });
    });

    it('calls fieldsMetadataClient.find with correct parameters', async () => {
      const docs = [{ source: { ip: '10.0.0.1' }, custom: 'value' }];
      await generateFieldMappings(docs, fieldsMetadataClient);

      expect(fieldsMetadataClient.find).toHaveBeenCalledWith({
        fieldNames: expect.arrayContaining(['source.ip', 'custom']),
        source: ['ecs'],
      });
    });

    it('marks custom top-level fields as is_ecs: false', async () => {
      const docs = [
        {
          apache: { access: { method: 'GET', response_code: 200 } },
          custom_field: 'value',
        },
      ];
      const fields = await generateFieldMappings(docs, fieldsMetadataClient);

      for (const field of fields) {
        expect(field.is_ecs).toBe(false);
      }
    });

    it('correctly mixes ECS and custom fields', async () => {
      const docs = [
        {
          source: { ip: '192.168.1.1' },
          event: { action: 'login' },
          my_integration: { user_id: 'u123', request_time: 42 },
        },
      ];
      const fields = await generateFieldMappings(docs, fieldsMetadataClient);

      const ecsFields = fields.filter((f) => f.is_ecs);
      const customFields = fields.filter((f) => !f.is_ecs);

      expect(ecsFields.length).toBeGreaterThan(0);
      expect(customFields.length).toBeGreaterThan(0);

      expect(ecsFields.map((f) => f.name)).toEqual(
        expect.arrayContaining(['source.ip', 'event.action'])
      );
      expect(customFields.map((f) => f.name)).toEqual(
        expect.arrayContaining(['my_integration.user_id', 'my_integration.request_time'])
      );
    });

    it('handles deeply nested objects', async () => {
      const docs = [
        {
          my_app: {
            http: {
              request: {
                headers: {
                  content_type: 'application/json',
                },
              },
            },
          },
        },
      ];
      const fields = await generateFieldMappings(docs, fieldsMetadataClient);

      expect(fields).toContainEqual({
        name: 'my_app.http.request.headers.content_type',
        type: 'keyword',
        is_ecs: false,
      });
    });

    it('handles arrays with object elements by using the first element', async () => {
      const docs = [
        {
          items: [{ name: 'item1', count: 5 }],
        },
      ];
      const fields = await generateFieldMappings(docs, fieldsMetadataClient);

      expect(fields).toEqual(
        expect.arrayContaining([
          { name: 'items.name', type: 'keyword', is_ecs: false },
          { name: 'items.count', type: 'long', is_ecs: false },
        ])
      );
    });

    it('handles arrays with scalar elements', async () => {
      const docs = [{ my_tags: ['web', 'prod'] }];
      const fields = await generateFieldMappings(docs, fieldsMetadataClient);

      expect(fields).toContainEqual({ name: 'my_tags', type: 'keyword', is_ecs: false });
    });

    it('handles null values as keyword type', async () => {
      const docs = [{ my_field: null }];
      const fields = await generateFieldMappings(docs, fieldsMetadataClient);

      expect(fields).toContainEqual({ name: 'my_field', type: 'keyword', is_ecs: false });
    });

    it('merges multiple pipeline docs before generating fields', async () => {
      const docs = [{ my_app: { field_a: 'hello' } }, { my_app: { field_b: 42 } }];
      const fields = await generateFieldMappings(docs, fieldsMetadataClient);
      const fieldNames = fields.map((f) => f.name);

      expect(fieldNames).toContain('my_app.field_a');
      expect(fieldNames).toContain('my_app.field_b');
    });

    it('skips unsafe property names like __proto__', async () => {
      const docs = [{ safe: 'value', __proto__: { bad: true } }];
      const fields = await generateFieldMappings(docs, fieldsMetadataClient);
      const fieldNames = fields.map((f) => f.name);

      expect(fieldNames).toContain('safe');
      expect(fieldNames).not.toContain('__proto__');
      expect(fieldNames).not.toContain('__proto__.bad');
    });

    it('produces correct types for a realistic pipeline output', async () => {
      const docs = [
        {
          '@timestamp': '2024-01-01T00:00:00.000Z',
          message: 'GET /api/status 200',
          event: { category: 'web', type: 'access', dataset: 'my_app.access' },
          source: { ip: '10.0.0.1', port: 54321 },
          http: {
            request: { method: 'GET' },
            response: { status_code: 200, body: { bytes: 1024 } },
          },
          url: { path: '/api/status' },
          my_app: {
            access: {
              request_id: 'req-abc-123',
              duration_ms: 42,
              authenticated: true,
            },
          },
        },
      ];
      const fields = await generateFieldMappings(docs, fieldsMetadataClient);

      // ECS fields
      expect(fields).toContainEqual({ name: '@timestamp', type: 'keyword', is_ecs: true });
      expect(fields).toContainEqual({ name: 'message', type: 'keyword', is_ecs: true });
      expect(fields).toContainEqual({
        name: 'http.response.status_code',
        type: 'long',
        is_ecs: true,
      });
      expect(fields).toContainEqual({
        name: 'http.response.body.bytes',
        type: 'long',
        is_ecs: true,
      });

      // Custom fields
      expect(fields).toContainEqual({
        name: 'my_app.access.request_id',
        type: 'keyword',
        is_ecs: false,
      });
      expect(fields).toContainEqual({
        name: 'my_app.access.duration_ms',
        type: 'long',
        is_ecs: false,
      });
      expect(fields).toContainEqual({
        name: 'my_app.access.authenticated',
        type: 'boolean',
        is_ecs: false,
      });
    });
  });
});
