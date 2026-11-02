/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import {
  getEffectiveFieldConstraints,
  getEffectiveDynamicMapping,
  getUnmappedFieldsNote,
} from './mapping_utils';
import { mockEsMethodResolvedValue } from './test_helpers';

describe('getEffectiveFieldConstraints', () => {
  const createEsClient = () => {
    return elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
  };

  it('returns constraints for a keyword field with ignore_above', async () => {
    const esClient = createEsClient();
    mockEsMethodResolvedValue(esClient.indices.getFieldMapping, {
      '.ds-logs.otel.android-000001': {
        mappings: {
          'attributes.process.name': {
            full_name: 'attributes.process.name',
            mapping: {
              'process.name': {
                type: 'keyword',
                ignore_above: 8191,
              },
            },
          },
        },
      },
    });

    const result = await getEffectiveFieldConstraints(esClient, 'logs.otel.android', [
      'attributes.process.name',
    ]);

    expect(result.size).toBe(1);
    expect(result.get('attributes.process.name')).toEqual({
      type: 'keyword',
      ignore_above: 8191,
    });
  });

  it('returns constraints for multiple fields in a single call', async () => {
    const esClient = createEsClient();
    mockEsMethodResolvedValue(esClient.indices.getFieldMapping, {
      '.ds-logs.otel.android-000001': {
        mappings: {
          'attributes.process.name': {
            full_name: 'attributes.process.name',
            mapping: {
              'process.name': { type: 'keyword', ignore_above: 1024 },
            },
          },
          'attributes.timestamp': {
            full_name: 'attributes.timestamp',
            mapping: {
              timestamp: { type: 'date', format: 'epoch_millis', ignore_malformed: true },
            },
          },
        },
      },
    });

    const result = await getEffectiveFieldConstraints(esClient, 'logs.otel.android', [
      'attributes.process.name',
      'attributes.timestamp',
    ]);

    expect(result.size).toBe(2);
    expect(result.get('attributes.process.name')).toEqual({
      type: 'keyword',
      ignore_above: 1024,
    });
    expect(result.get('attributes.timestamp')).toEqual({
      type: 'date',
      format: 'epoch_millis',
      ignore_malformed: true,
    });
  });

  it('returns empty map for empty field list', async () => {
    const esClient = createEsClient();

    const result = await getEffectiveFieldConstraints(esClient, 'logs.otel.android', []);

    expect(result.size).toBe(0);
    expect(esClient.indices.getFieldMapping).not.toHaveBeenCalled();
  });

  it('skips fields with no mapping in the response', async () => {
    const esClient = createEsClient();
    mockEsMethodResolvedValue(esClient.indices.getFieldMapping, {
      '.ds-logs.otel.android-000001': {
        mappings: {
          'attributes.known': {
            full_name: 'attributes.known',
            mapping: {
              known: { type: 'keyword', ignore_above: 256 },
            },
          },
        },
      },
    });

    const result = await getEffectiveFieldConstraints(esClient, 'logs.otel.android', [
      'attributes.known',
      'attributes.missing',
    ]);

    expect(result.size).toBe(1);
    expect(result.has('attributes.known')).toBe(true);
    expect(result.has('attributes.missing')).toBe(false);
  });

  it('filters to constraint-relevant keys only', async () => {
    const esClient = createEsClient();
    mockEsMethodResolvedValue(esClient.indices.getFieldMapping, {
      '.ds-test-000001': {
        mappings: {
          'my.field': {
            full_name: 'my.field',
            mapping: {
              field: {
                type: 'keyword',
                ignore_above: 512,
                doc_values: true,
                store: false,
                index: true,
                normalizer: 'my_normalizer',
              },
            },
          },
        },
      },
    });

    const result = await getEffectiveFieldConstraints(esClient, 'test', ['my.field']);

    expect(result.get('my.field')).toEqual({
      type: 'keyword',
      ignore_above: 512,
      doc_values: true,
      index: true,
      normalizer: 'my_normalizer',
    });
  });

  it('handles response with empty mappings object', async () => {
    const esClient = createEsClient();
    mockEsMethodResolvedValue(esClient.indices.getFieldMapping, {
      '.ds-test-000001': {
        mappings: {},
      },
    });

    const result = await getEffectiveFieldConstraints(esClient, 'test', ['some.field']);

    expect(result.size).toBe(0);
  });

  it('handles response with no index entries', async () => {
    const esClient = createEsClient();
    mockEsMethodResolvedValue(esClient.indices.getFieldMapping, {});

    const result = await getEffectiveFieldConstraints(esClient, 'test', ['some.field']);

    expect(result.size).toBe(0);
  });

  it('includes coerce and null_value when present', async () => {
    const esClient = createEsClient();
    mockEsMethodResolvedValue(esClient.indices.getFieldMapping, {
      '.ds-test-000001': {
        mappings: {
          'my.number': {
            full_name: 'my.number',
            mapping: {
              number: { type: 'long', coerce: false, null_value: 0 },
            },
          },
        },
      },
    });

    const result = await getEffectiveFieldConstraints(esClient, 'test', ['my.number']);

    expect(result.get('my.number')).toEqual({
      type: 'long',
      coerce: false,
      null_value: 0,
    });
  });
});

describe('getEffectiveDynamicMapping', () => {
  it('returns the dynamic setting from the last (write) index', () => {
    const response = {
      '.ds-logs-otel-000001': { mappings: { dynamic: 'true' as const, properties: {} } },
      '.ds-logs-otel-000002': { mappings: { dynamic: 'false' as const, properties: {} } },
    };
    expect(getEffectiveDynamicMapping(response)).toBe('false');
  });

  it('returns "true" when dynamic is absent (ES default)', () => {
    const response = {
      '.ds-logs-otel-000001': { mappings: { properties: {} } },
    };
    expect(getEffectiveDynamicMapping(response)).toBe('true');
  });

  it('returns "strict" when dynamic is strict', () => {
    const response = {
      '.ds-logs-otel-000001': { mappings: { dynamic: 'strict' as const, properties: {} } },
    };
    expect(getEffectiveDynamicMapping(response)).toBe('strict');
  });

  it('returns "runtime" when dynamic is runtime', () => {
    const response = {
      '.ds-logs-otel-000001': { mappings: { dynamic: 'runtime' as const, properties: {} } },
    };
    expect(getEffectiveDynamicMapping(response)).toBe('runtime');
  });

  it('returns "true" for an empty response', () => {
    expect(getEffectiveDynamicMapping({})).toBe('true');
  });
});

describe('getUnmappedFieldsNote', () => {
  it('returns source-only note for dynamic: false (string)', () => {
    const note = getUnmappedFieldsNote('false');
    expect(note).toContain('dynamic: false');
    expect(note).toContain('not indexed');
    expect(note).toContain('Add explicit field mappings');
  });

  it('returns source-only note for dynamic: false (boolean)', () => {
    const note = getUnmappedFieldsNote(false);
    expect(note).toContain('dynamic: false');
    expect(note).toContain('not indexed');
  });

  it('returns strict note for dynamic: strict', () => {
    const note = getUnmappedFieldsNote('strict');
    expect(note).toContain('dynamic: strict');
    expect(note).toContain('rejected');
    expect(note).toContain('Explicit field mappings are required');
  });

  it('returns runtime note for dynamic: runtime', () => {
    const note = getUnmappedFieldsNote('runtime');
    expect(note).toContain('dynamic: runtime');
    expect(note).toContain('runtime fields');
    expect(note).toContain('not indexed on disk');
  });

  it('returns dynamic: true note for dynamic: true', () => {
    const note = getUnmappedFieldsNote('true');
    expect(note).toContain('dynamic: true');
    expect(note).toContain('field_overrides');
    expect(note).toContain('field caps');
  });

  it('returns dynamic: true note for unknown values (fallback)', () => {
    const note = getUnmappedFieldsNote('true');
    expect(note).toContain('dynamic: true');
  });
});
