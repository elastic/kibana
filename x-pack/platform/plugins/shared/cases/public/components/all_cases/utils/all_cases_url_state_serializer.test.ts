/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomFieldTypes } from '../../../../common/types/domain';
import { DEFAULT_QUERY_PARAMS, DEFAULT_FILTER_OPTIONS } from '../../../containers/constants';

import { allCasesUrlStateSerializer } from './all_cases_url_state_serializer';

describe('allCasesUrlStateSerializer', () => {
  it('serializes correctly with default values', () => {
    expect(
      allCasesUrlStateSerializer({
        filterOptions: DEFAULT_FILTER_OPTIONS,
        queryParams: DEFAULT_QUERY_PARAMS,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "page": 1,
        "perPage": 10,
        "sortField": "createdAt",
        "sortOrder": "desc",
      }
    `);
  });

  it('serializes custom fields correctly', () => {
    expect(
      allCasesUrlStateSerializer({
        filterOptions: {
          ...DEFAULT_FILTER_OPTIONS,
          customFields: {
            foo: { type: CustomFieldTypes.TEXT, options: ['bar'] },
            bar: { type: CustomFieldTypes.TEXT, options: ['foo'] },
          },
        },
        queryParams: DEFAULT_QUERY_PARAMS,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "customFields": Object {
          "bar": Array [
            "foo",
          ],
          "foo": Array [
            "bar",
          ],
        },
        "page": 1,
        "perPage": 10,
        "sortField": "createdAt",
        "sortOrder": "desc",
      }
    `);
  });

  it('removes unsupported filter options', () => {
    expect(
      allCasesUrlStateSerializer({
        filterOptions: {
          ...DEFAULT_FILTER_OPTIONS,
          searchFields: ['title'],
          reporters: [{ username: 'elastic', email: null, full_name: null }],
          owner: ['cases'],
        },
        queryParams: DEFAULT_QUERY_PARAMS,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "page": 1,
        "perPage": 10,
        "sortField": "createdAt",
        "sortOrder": "desc",
      }
    `);
  });

  it('removes empty values', () => {
    expect(
      allCasesUrlStateSerializer({
        filterOptions: { ...DEFAULT_FILTER_OPTIONS, status: [], search: '', customFields: {} },
        queryParams: DEFAULT_QUERY_PARAMS,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "page": 1,
        "perPage": 10,
        "sortField": "createdAt",
        "sortOrder": "desc",
      }
    `);
  });

  it('converts null assignees correctly', () => {
    expect(
      allCasesUrlStateSerializer({
        filterOptions: {
          ...DEFAULT_FILTER_OPTIONS,
          assignees: [null, 'elastic'],
        },
        queryParams: DEFAULT_QUERY_PARAMS,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "assignees": Array [
          "none",
          "elastic",
        ],
        "page": 1,
        "perPage": 10,
        "sortField": "createdAt",
        "sortOrder": "desc",
      }
    `);
  });
});
