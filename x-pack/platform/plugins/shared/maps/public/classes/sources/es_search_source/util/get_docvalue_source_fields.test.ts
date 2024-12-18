/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDocValueAndSourceFields } from './get_docvalue_source_fields';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/public';

function createMockIndexPattern(fields: DataViewField[]): DataView {
  const indexPattern = {
    get fields() {
      return {
        getByName(fieldname: string) {
          return fields.find((f) => f.name === fieldname);
        },
      };
    },
  };

  return indexPattern as unknown as DataView;
}

describe('getDocValueAndSourceFields', () => {
  it('should add runtime fields to docvalue fields', () => {
    const { docValueFields } = getDocValueAndSourceFields(
      createMockIndexPattern([
        {
          name: 'foobar',
          runtimeField: { type: 'keyword' },
        } as DataViewField,
      ]),
      ['foobar'],
      'epoch_millis'
    );

    expect(docValueFields).toEqual(['foobar']);
  });
});
