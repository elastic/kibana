/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createImportConfigDataSchema,
  updateImportConfigDataSchema,
} from './import_config_data_schema';

const validCreateData = {
  kind: 'alert',
  metadata: { name: 'Datadog production', routing_tags: ['team-a'] },
  connector_id: 'connector-1',
};

describe('createImportConfigDataSchema', () => {
  it('accepts a valid import', () => {
    expect(createImportConfigDataSchema.safeParse(validCreateData).success).toBe(true);
  });

  it('accepts a signal import without routing tags', () => {
    const result = createImportConfigDataSchema.safeParse({
      ...validCreateData,
      kind: 'signal',
      metadata: { name: 'Signals' },
    });

    expect(result.success).toBe(true);
  });

  it.each([
    ['routing tags on a signal import', { ...validCreateData, kind: 'signal' }],
    ['an unknown kind', { ...validCreateData, kind: 'rule' }],
    ['a missing connector id', { kind: 'alert', metadata: { name: 'Import' } }],
    ['an empty name', { ...validCreateData, metadata: { name: '' } }],
    ['an empty tags array', { ...validCreateData, metadata: { name: 'Import', tags: [] } }],
    ['an unknown field', { ...validCreateData, enabled: true }],
    ['an id with invalid characters', { ...validCreateData, id: 'not valid!' }],
  ])('rejects %s', (_, data) => {
    expect(createImportConfigDataSchema.safeParse(data).success).toBe(false);
  });
});

describe('updateImportConfigDataSchema', () => {
  it('accepts a partial metadata patch that clears a field', () => {
    const result = updateImportConfigDataSchema.safeParse({
      metadata: { description: null, tags: ['datadog'] },
    });

    expect(result.success).toBe(true);
  });

  it('does not accept a connector id', () => {
    expect(updateImportConfigDataSchema.safeParse({ connector_id: 'connector-2' }).success).toBe(
      false
    );
  });
});
