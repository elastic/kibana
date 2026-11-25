/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createExternalSourceDataSchema,
  putExternalSourceDataSchema,
  updateExternalSourceDataSchema,
} from './external_source_data_schema';

const validCreateData = {
  type: 'datadog',
  kind: 'alert',
  metadata: { name: 'Datadog production', routing_tags: ['team-a'] },
};

describe('createExternalSourceDataSchema', () => {
  it('accepts a valid import', () => {
    expect(createExternalSourceDataSchema.safeParse(validCreateData).success).toBe(true);
  });

  it('accepts a signal import without routing tags', () => {
    const result = createExternalSourceDataSchema.safeParse({
      ...validCreateData,
      kind: 'signal',
      metadata: { name: 'Signals' },
    });

    expect(result.success).toBe(true);
  });

  it.each([
    ['routing tags on a signal import', { ...validCreateData, kind: 'signal' }],
    ['an unknown kind', { ...validCreateData, kind: 'rule' }],
    ['a connector id', { ...validCreateData, connector_id: 'connector-1' }],
    ['a missing type', { ...validCreateData, type: undefined }],
    ['an unknown type', { ...validCreateData, type: 'pagerduty' }],
    ['an empty name', { ...validCreateData, metadata: { name: '' } }],
    ['an empty tags array', { ...validCreateData, metadata: { name: 'Import', tags: [] } }],
    ['an unknown field', { ...validCreateData, enabled: true }],
    ['an id with invalid characters', { ...validCreateData, id: 'not valid!' }],
  ])('rejects %s', (_, data) => {
    expect(createExternalSourceDataSchema.safeParse(data).success).toBe(false);
  });
});

describe('updateExternalSourceDataSchema', () => {
  it('accepts a partial metadata patch that clears a field', () => {
    const result = updateExternalSourceDataSchema.safeParse({
      metadata: { description: null, tags: ['datadog'] },
    });

    expect(result.success).toBe(true);
  });

  it('does not accept a connector id', () => {
    expect(updateExternalSourceDataSchema.safeParse({ connector_id: 'connector-2' }).success).toBe(
      false
    );
  });

  it('does not accept a type', () => {
    expect(updateExternalSourceDataSchema.safeParse({ type: 'datadog' }).success).toBe(false);
  });
});

describe('putExternalSourceDataSchema', () => {
  it('accepts a full import without an id', () => {
    expect(putExternalSourceDataSchema.safeParse(validCreateData).success).toBe(true);
  });

  it.each([
    ['an id in the body', { ...validCreateData, id: 'import-1' }],
    ['a connector id', { ...validCreateData, connector_id: 'connector-1' }],
    ['a missing type', { ...validCreateData, type: undefined }],
    ['routing tags on a signal import', { ...validCreateData, kind: 'signal' }],
  ])('rejects %s', (_, data) => {
    expect(putExternalSourceDataSchema.safeParse(data).success).toBe(false);
  });
});
