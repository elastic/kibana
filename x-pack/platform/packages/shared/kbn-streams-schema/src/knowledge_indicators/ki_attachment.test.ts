/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  decodeKiOriginId,
  encodeKiOriginId,
  kiAttachmentDataSchemaV1,
  KI_ORIGIN_KIND_FEATURE,
  KI_ORIGIN_KIND_QUERY,
} from './ki_attachment';

describe('encodeKiOriginId / decodeKiOriginId', () => {
  it('round-trips a feature origin', () => {
    const encoded = encodeKiOriginId({ kind: KI_ORIGIN_KIND_FEATURE, id: 'abc-123' });
    expect(encoded).toBe('feature:abc-123');
    expect(decodeKiOriginId(encoded)).toEqual({
      kind: KI_ORIGIN_KIND_FEATURE,
      id: 'abc-123',
    });
  });

  it('round-trips a query origin', () => {
    const encoded = encodeKiOriginId({ kind: KI_ORIGIN_KIND_QUERY, id: 'xyz-789' });
    expect(encoded).toBe('query:xyz-789');
    expect(decodeKiOriginId(encoded)).toEqual({
      kind: KI_ORIGIN_KIND_QUERY,
      id: 'xyz-789',
    });
  });

  it('preserves colons inside the raw id (only splits on the first colon)', () => {
    expect(decodeKiOriginId('feature:logs.app:metric:count')).toEqual({
      kind: KI_ORIGIN_KIND_FEATURE,
      id: 'logs.app:metric:count',
    });
  });

  it.each([
    ['empty string', ''],
    ['kind only', 'feature'],
    ['kind with empty id', 'feature:'],
    ['unknown kind', 'system:abc'],
    ['leading colon', ':abc'],
  ])('returns undefined for %s', (_label, input) => {
    expect(decodeKiOriginId(input)).toBeUndefined();
  });
});

describe('kiAttachmentDataSchemaV1', () => {
  const featurePayload = {
    kind: 'feature' as const,
    stream_name: 'logs.app',
    feature: {
      uuid: 'feature-uuid',
      id: 'feature-id',
      stream_name: 'logs.app',
      type: 'dataset_analysis',
      subtype: 'http',
      title: 'HTTP requests',
      description: 'HTTP request volume',
      properties: { dataset: 'http' },
      confidence: 80,
      status: 'active' as const,
      last_seen: '2024-01-01T00:00:00.000Z',
    },
  };

  const queryPayload = {
    kind: 'query' as const,
    stream_name: 'logs.app',
    rule: { backed: true, id: 'rule-id' },
    query: {
      id: 'query-id',
      title: 'High error rate',
      description: 'fires when errors spike',
      type: 'match' as const,
      esql: { query: 'FROM logs.app | WHERE status >= 500' },
    },
  };

  it('accepts a feature payload', () => {
    expect(kiAttachmentDataSchemaV1.safeParse(featurePayload).success).toBe(true);
  });

  it('accepts a query payload', () => {
    expect(kiAttachmentDataSchemaV1.safeParse(queryPayload).success).toBe(true);
  });

  it('rejects an unknown kind', () => {
    expect(kiAttachmentDataSchemaV1.safeParse({ ...featurePayload, kind: 'other' }).success).toBe(
      false
    );
  });

  it('rejects a feature payload that is missing required fields', () => {
    const broken = { ...featurePayload, feature: { uuid: 'only-uuid' } };
    expect(kiAttachmentDataSchemaV1.safeParse(broken).success).toBe(false);
  });
});
