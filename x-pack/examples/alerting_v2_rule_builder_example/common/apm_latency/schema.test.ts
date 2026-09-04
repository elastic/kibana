/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_FIELD_VALUE_LENGTH, MAX_THRESHOLD_MS } from './constants';
import { apmLatencyBuilderFieldsSchema } from './schema';

const valid = {
  index: 'traces-apm*',
  timeField: '@timestamp',
  serviceName: 'checkout',
  percentile: 95,
  thresholdMs: 500,
  groupByTransactionName: false,
};

const accepts = (fields: unknown) => apmLatencyBuilderFieldsSchema.safeParse(fields).success;

describe('apmLatencyBuilderFieldsSchema', () => {
  it('accepts the minimum a rule needs', () => {
    expect(accepts(valid)).toBe(true);
  });

  it('accepts the optional narrowing fields', () => {
    expect(accepts({ ...valid, environment: 'production', transactionType: 'request' })).toBe(true);
  });

  it.each([
    ['a missing service name', { ...valid, serviceName: undefined }],
    ['an empty service name', { ...valid, serviceName: '' }],
    [
      'an over-long service name',
      { ...valid, serviceName: 'a'.repeat(MAX_FIELD_VALUE_LENGTH + 1) },
    ],
    ['an unsupported percentile', { ...valid, percentile: 42 }],
    ['a zero threshold', { ...valid, thresholdMs: 0 }],
    ['a negative threshold', { ...valid, thresholdMs: -1 }],
    ['an implausibly large threshold', { ...valid, thresholdMs: MAX_THRESHOLD_MS + 1 }],
    ['an unknown field', { ...valid, unexpected: true }],
  ])('rejects %s', (_label, fields) => {
    expect(accepts(fields)).toBe(false);
  });

  it('is bounded, which registration requires', () => {
    // Registration converts the schema to JSON Schema and refuses unbounded
    // strings or open objects, so assert the properties it looks for.
    const json = z.toJSONSchema(apmLatencyBuilderFieldsSchema, { io: 'input' }) as {
      additionalProperties: boolean;
      properties: Record<string, { type?: string; maxLength?: number }>;
    };

    expect(json.additionalProperties).toBe(false);
    for (const [name, property] of Object.entries(json.properties)) {
      if (property.type === 'string') {
        expect(property.maxLength).toBeDefined();
      }
      expect(name).toBeTruthy();
    }
  });
});
