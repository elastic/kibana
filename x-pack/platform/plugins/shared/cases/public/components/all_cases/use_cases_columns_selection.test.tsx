/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { renderHook } from '@testing-library/react';

import type { AppMockRenderer } from '../../common/mock';

import { createAppMockRenderer } from '../../common/mock';
import { useCasesColumnsSelection } from './use_cases_columns_selection';
import { useCasesColumnsConfiguration } from './use_cases_columns_configuration';

jest.mock('./use_cases_columns_configuration');

const useCasesColumnsConfigurationMock = useCasesColumnsConfiguration as jest.Mock;

const localStorageKey = 'securitySolution.cases.list.tableColumns';
const casesColumnsConfig = {
  title: {
    field: 'title',
    name: 'Name',
    canDisplay: true,
  },
  assignees: {
    field: 'assignees',
    name: 'Assignees',
    canDisplay: true,
  },
  tags: {
    field: 'tags',
    name: 'Tags',
    canDisplay: true,
  },
};

describe('useCasesColumnsSelection ', () => {
  let appMockRender: AppMockRenderer;
  const license = licensingMock.createLicense({
    license: { type: 'platinum' },
  });

  beforeEach(() => {
    appMockRender = createAppMockRenderer({ license });

    useCasesColumnsConfigurationMock.mockReturnValue(casesColumnsConfig);

    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the expected selectedColumns when the localstorage is empty', async () => {
    const { result } = renderHook(() => useCasesColumnsSelection(), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "selectedColumns": Array [
          Object {
            "field": "title",
            "isChecked": undefined,
            "name": "Name",
          },
          Object {
            "field": "assignees",
            "isChecked": undefined,
            "name": "Assignees",
          },
          Object {
            "field": "tags",
            "isChecked": undefined,
            "name": "Tags",
          },
        ],
        "setSelectedColumns": [Function],
      }
    `);
  });

  it('calls mergeSelectedColumnsWithConfiguration with existing localstorage value', async () => {
    const selectedColumns = [
      {
        field: 'title',
        name: 'Name',
        isChecked: false,
      },
    ];

    localStorage.setItem(localStorageKey, JSON.stringify(selectedColumns));

    const { result } = renderHook(() => useCasesColumnsSelection(), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "selectedColumns": Array [
          Object {
            "field": "title",
            "isChecked": false,
            "name": "Name",
          },
          Object {
            "field": "assignees",
            "isChecked": undefined,
            "name": "Assignees",
          },
          Object {
            "field": "tags",
            "isChecked": undefined,
            "name": "Tags",
          },
        ],
        "setSelectedColumns": [Function],
      }
    `);
  });
});
