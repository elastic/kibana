/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SyncUserActionPayloadRt, SyncUserActionRt } from './v1';

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

  it('decodes the payload and strips unknown attributes', () => {
    const query = SyncUserActionPayloadRt.decode({
      sync: { ...defaultRequest.sync, foo: 'bar' },
    });

    expect(query).toStrictEqual({ _tag: 'Right', right: defaultRequest });
  });

  it('decodes the user action with its type', () => {
    const query = SyncUserActionRt.decode({ type: 'sync', payload: defaultRequest });

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: { type: 'sync', payload: defaultRequest },
    });
  });

  it('rejects a payload without updated_fields', () => {
    const { updated_fields: _omit, ...rest } = defaultRequest.sync;
    const query = SyncUserActionPayloadRt.decode({ sync: rest });

    expect(query._tag).toBe('Left');
  });
});
