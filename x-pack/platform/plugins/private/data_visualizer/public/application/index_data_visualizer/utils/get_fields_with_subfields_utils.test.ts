/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFieldsWithSubFields } from './get_fields_with_subfields_utils';

describe('getFieldsWithSubFields', () => {
  const input = {
    visibleFieldNames: ['field1', 'field2', 'exampleRuntimeField'],
    fieldsToFetch: ['field3'],
  };

  const currentDataView = {
    fields: [
      { name: 'field1' },
      { name: 'field2' },
      {
        name: 'field2.keyword',
        getSubtypeMulti: jest.fn().mockReturnValue({ multi: { parent: 'field2' } }),
      },
      { name: 'field3' },
      {
        name: 'field3.keyword',
        getSubtypeMulti: jest.fn().mockReturnValue({ multi: { parent: 'field3' } }),
      },
      { name: 'field4' },
      {
        name: 'exampleRuntimeField',
        runtimeField: {
          type: 'keyword',
          script: {
            source: 'emit(\n"test"\n)',
          },
        },
      },
    ],
    getRuntimeMappings: jest.fn().mockReturnValue({
      exampleRuntimeField: {
        type: 'keyword',
        script: {
          source: 'emit(\n"test"\n)',
        },
      },
    }),
  };

  it('should return visibleFieldNames and fieldsToFetch when shouldGetSubfields is true', () => {
    const result = getFieldsWithSubFields({
      input,
      // @ts-expect-error This is just a partial mock
      currentDataView,
      shouldGetSubfields: true,
    });

    expect(result.visibleFieldNames).toEqual([
      'field1',
      'field2',
      'field2.keyword',
      'exampleRuntimeField',
      'field3',
    ]);

    expect(result.fieldsToFetch).toEqual([
      'field1',
      'field2',
      'field2.keyword',
      'exampleRuntimeField',
      'field3',
    ]);
  });
  it('should return visibleFieldNames and undefined fieldsToFetch when shouldGetSubfields is false', () => {
    const result = getFieldsWithSubFields({
      input,
      // @ts-expect-error This is just a partial mock
      currentDataView,
      shouldGetSubfields: false,
    });

    expect(result.visibleFieldNames).toEqual(['field1', 'field2', 'exampleRuntimeField']);
    expect(result.fieldsToFetch).toBeUndefined();
  });
});
