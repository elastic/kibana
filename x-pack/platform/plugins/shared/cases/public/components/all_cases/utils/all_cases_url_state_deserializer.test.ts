/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomFieldTypes } from '../../../../common/types/domain';
import { DEFAULT_CASES_TABLE_STATE } from '../../../containers/constants';

import { allCasesUrlStateDeserializer } from './all_cases_url_state_deserializer';

describe('allCasesUrlStateDeserializer', () => {
  const { customFields, ...filterOptionsWithoutCustomFields } =
    DEFAULT_CASES_TABLE_STATE.filterOptions;

  const defaultMap = {
    ...filterOptionsWithoutCustomFields,
    ...DEFAULT_CASES_TABLE_STATE.queryParams,
  };

  it('parses defaults correctly', () => {
    expect(allCasesUrlStateDeserializer(defaultMap)).toMatchInlineSnapshot(`
      Object {
        "filterOptions": Object {
          "assignees": Array [],
          "category": Array [],
          "owner": Array [],
          "reporters": Array [],
          "search": "",
          "searchFields": Array [
            "title",
            "description",
          ],
          "severity": Array [],
          "status": Array [],
          "tags": Array [],
        },
        "queryParams": Object {
          "page": 1,
          "perPage": 10,
          "sortField": "createdAt",
          "sortOrder": "desc",
        },
      }
    `);
  });

  it('parses an empty object correctly', () => {
    expect(allCasesUrlStateDeserializer({})).toMatchInlineSnapshot(`
      Object {
        "filterOptions": Object {},
        "queryParams": Object {},
      }
    `);
  });

  it('does not return unknown values', () => {
    // @ts-expect-error: testing unknown values
    expect(allCasesUrlStateDeserializer({ foo: 'bar' })).toMatchInlineSnapshot(`
      Object {
        "filterOptions": Object {},
        "queryParams": Object {},
      }
    `);
  });

  it('converts page to integer correctly', () => {
    // @ts-expect-error: testing integer conversion
    expect(allCasesUrlStateDeserializer({ page: '1' }).queryParams.page).toBe(1);
  });

  it('sets perPage to the maximum allowed value if it is set to over the limit', () => {
    // @ts-expect-error: testing integer conversion
    expect(allCasesUrlStateDeserializer({ perPage: '1000' }).queryParams.perPage).toBe(100);
  });

  it('converts perPage to integer correctly', () => {
    // @ts-expect-error: testing integer conversion
    expect(allCasesUrlStateDeserializer({ perPage: '2' }).queryParams.perPage).toBe(2);
  });

  it('sets the defaults to page and perPage correctly if they are not numbers', () => {
    // @ts-expect-error: testing integer conversion
    expect(allCasesUrlStateDeserializer({ page: 'foo', perPage: 'bar' }).queryParams.page).toBe(
      DEFAULT_CASES_TABLE_STATE.queryParams.page
    );

    // @ts-expect-error: testing integer conversion
    expect(allCasesUrlStateDeserializer({ page: 'foo', perPage: 'bar' }).queryParams.perPage).toBe(
      DEFAULT_CASES_TABLE_STATE.queryParams.perPage
    );
  });

  it('does not return the page and perPage if they are not defined', () => {
    expect(allCasesUrlStateDeserializer({})).toMatchInlineSnapshot(`
      Object {
        "filterOptions": Object {},
        "queryParams": Object {},
      }
    `);
  });

  it('sets the sortOrder correctly', () => {
    expect(allCasesUrlStateDeserializer({ sortOrder: 'asc' }).queryParams.sortOrder).toBe('asc');
  });

  it('parses custom fields correctly', () => {
    expect(
      allCasesUrlStateDeserializer(
        {
          customFields: {
            'my-custom-field-1': ['foo', 'qux'],
            'my-custom-field-2': ['bar', 'baz'],
            'my-custom-field-4': [],
          },
        },
        [
          {
            key: 'my-custom-field-1',
            type: CustomFieldTypes.TOGGLE,
            required: false,
            label: 'foo',
          },
          {
            key: 'my-custom-field-2',
            type: CustomFieldTypes.TOGGLE,
            required: false,
            label: 'foo',
          },
          {
            key: 'my-custom-field-4',
            type: CustomFieldTypes.TOGGLE,
            required: false,
            label: 'foo',
          },
        ]
      )
    ).toMatchInlineSnapshot(`
      Object {
        "filterOptions": Object {
          "customFields": Object {
            "my-custom-field-1": Object {
              "options": Array [
                "foo",
                "qux",
              ],
              "type": "toggle",
            },
            "my-custom-field-2": Object {
              "options": Array [
                "bar",
                "baz",
              ],
              "type": "toggle",
            },
            "my-custom-field-4": Object {
              "options": Array [],
              "type": "toggle",
            },
          },
        },
        "queryParams": Object {},
      }
    `);
  });

  it('removes unknown custom fields', () => {
    expect(
      allCasesUrlStateDeserializer(
        {
          customFields: {
            'my-custom-field-1': ['foo', 'qux'],
            'my-custom-field-2': ['bar', 'baz'],
          },
        },
        [
          {
            key: 'my-custom-field-1',
            type: CustomFieldTypes.TOGGLE,
            required: false,
            label: 'foo',
          },
        ]
      )
    ).toMatchInlineSnapshot(`
      Object {
        "filterOptions": Object {
          "customFields": Object {
            "my-custom-field-1": Object {
              "options": Array [
                "foo",
                "qux",
              ],
              "type": "toggle",
            },
          },
        },
        "queryParams": Object {},
      }
    `);
  });

  it('parses none assignees correctly', () => {
    expect(allCasesUrlStateDeserializer({ assignees: ['none', 'elastic'] })).toMatchInlineSnapshot(`
      Object {
        "filterOptions": Object {
          "assignees": Array [
            null,
            "elastic",
          ],
        },
        "queryParams": Object {},
      }
    `);
  });
});
