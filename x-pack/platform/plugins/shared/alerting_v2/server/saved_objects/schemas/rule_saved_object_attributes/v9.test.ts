/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deepFreeze } from '@kbn/std';
import { ruleSavedObjectAttributesSchema } from './v9';

const attributes = {
  kind: 'alert',
  metadata: { name: 'cpu' },
  query: { base: 'FROM logs-*', breach: { segment: 'WHERE count > 10' } },
  recovery: { strategy: 'no_breach' },
  no_data: { strategy: 'ignore' },
  schedule: { every: '1m' },
  time_field: '@timestamp',
  enabled: true,
  createdBy: { profile_uid: 'elastic' },
  updatedBy: { profile_uid: 'elastic' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('rule saved object attributes v9', () => {
  beforeAll(() => {
    deepFreeze({ schemas: { create: ruleSavedObjectAttributesSchema } });
  });

  it('accepts existing rules without a reason', () => {
    expect(ruleSavedObjectAttributesSchema.validate(attributes)).toEqual(attributes);
  });

  it('preserves the original unresolved template including whitespace', () => {
    const reason = { template: '  CPU on {{host.name}} was {{cpu_pct}}%.\n' };
    expect(ruleSavedObjectAttributesSchema.validate({ ...attributes, reason }).reason).toEqual(
      reason
    );
  });

  it('accepts the 1024-character boundary', () => {
    const reason = { template: 'a'.repeat(1024) };
    expect(ruleSavedObjectAttributesSchema.validate({ ...attributes, reason }).reason).toEqual(
      reason
    );
  });

  it('rejects templates exceeding 1024 characters', () => {
    expect(() =>
      ruleSavedObjectAttributesSchema.validate({
        ...attributes,
        reason: { template: 'a'.repeat(1025) },
      })
    ).toThrow('[reason');
  });

  it.each([
    { template: '' },
    { template: ' ' },
    { template: '\t\n' },
    { template: 42 },
    {},
    'CPU on {{host.name}}',
    null,
  ])('rejects an invalid reason: %p', (reason) => {
    expect(() => ruleSavedObjectAttributesSchema.validate({ ...attributes, reason })).toThrow(
      '[reason'
    );
  });
});
