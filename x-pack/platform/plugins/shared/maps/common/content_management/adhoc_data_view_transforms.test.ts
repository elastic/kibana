/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LegacyAdhocDataView } from '../../server';
import { transformAdhocDataViewOut } from './adhoc_data_view_transforms';

describe('transformAdhocDataViewOut', () => {
  test('should convert legacy ad hoc data view to as code', () => {
    expect(
      transformAdhocDataViewOut({
        id: 'adhoc-1',
        title: 'logs-*',
        name: 'My logs',
        timeFieldName: '@timestamp',
        allowHidden: true,
      })
    ).toEqual({
      id: 'adhoc-1',
      type: 'data_view_spec',
      index_pattern: 'logs-*',
      name: 'My logs',
      time_field: '@timestamp',
      allow_hidden_indices: true,
    });
  });

  test('should throw when id is missing', () => {
    expect(() => transformAdhocDataViewOut({ title: 'logs-*' } as LegacyAdhocDataView)).toThrow();
  });
});
