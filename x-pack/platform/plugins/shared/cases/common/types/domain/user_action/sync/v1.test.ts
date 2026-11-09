/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SyncUserActionPayloadSchema, SyncUserActionSchema } from './v1';

describe('Sync', () => {
  const defaultRequest = {
    sync: {
      connector_name: 'My SN connector',
      external_id: 'external_id',
      external_title: 'INC01',
      external_url: 'https://example.com/INC01',
      updated_fields: ['title', 'status'],
      conflicted_fields: ['description'],
      external_updated_by: 'admin',
    },
  };

  it('parses the payload and strips unknown attributes', () => {
    const result = SyncUserActionPayloadSchema.safeParse({
      sync: { ...defaultRequest.sync, foo: 'bar' },
    });

    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(defaultRequest);
  });

  it('parses the user action with its type', () => {
    const result = SyncUserActionSchema.safeParse({ type: 'sync', payload: defaultRequest });

    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual({ type: 'sync', payload: defaultRequest });
  });

  it('rejects a payload without updated_fields', () => {
    const { updated_fields: _omit, ...rest } = defaultRequest.sync;
    const result = SyncUserActionPayloadSchema.safeParse({ sync: rest });

    expect(result.success).toBe(false);
  });
});
