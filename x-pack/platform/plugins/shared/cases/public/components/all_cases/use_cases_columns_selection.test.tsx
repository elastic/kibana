/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { renderHook, act } from '@testing-library/react';

import { TestProviders } from '../../common/mock';
import { useCasesColumnsSelection } from './use_cases_columns_selection';
import { useCasesColumnsConfiguration } from './use_cases_columns_configuration';
import { useCasesConfig } from '../../common/lib/kibana';
import { useGlobalInlineFields } from './hooks/use_global_inline_fields';
import { LOCAL_STORAGE_KEYS } from '../../../common/constants';
import React from 'react';

jest.mock('./use_cases_columns_configuration');
jest.mock('../../common/lib/kibana', () => ({
  ...jest.requireActual('../../common/lib/kibana'),
  useCasesConfig: jest.fn(),
}));
jest.mock('./hooks/use_global_inline_fields', () => ({
  ...jest.requireActual('./hooks/use_global_inline_fields'),
  useGlobalInlineFields: jest.fn(),
}));

const useCasesColumnsConfigurationMock = useCasesColumnsConfiguration as jest.Mock;
const useCasesConfigMock = useCasesConfig as jest.Mock;
const useGlobalInlineFieldsMock = useGlobalInlineFields as jest.Mock;

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
  const license = licensingMock.createLicense({
    license: { type: 'platinum' },
  });

  beforeEach(() => {
    useCasesColumnsConfigurationMock.mockReturnValue(casesColumnsConfig);
    useCasesConfigMock.mockReturnValue({ templatesEnabled: false });
    useGlobalInlineFieldsMock.mockReturnValue({ globalInlineFields: [], isLoading: false });

    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the expected selectedColumns when the localstorage is empty', async () => {
    const { result } = renderHook(() => useCasesColumnsSelection(), {
      wrapper: (props) => <TestProviders {...props} license={license} />,
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
      wrapper: (props) => <TestProviders {...props} license={license} />,
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

describe('useCasesColumnsSelection — global field sync (Bug 19099)', () => {
  const license = licensingMock.createLicense({ license: { type: 'platinum' } });
  const sharedStorageKey = `securitySolution.${LOCAL_STORAGE_KEYS.casesGlobalFieldColumns}`;
  const tableStorageKey = `securitySolution.${LOCAL_STORAGE_KEYS.casesTableColumns}`;

  const mockGlobalField = { name: 'priority', type: 'keyword', control: 'INPUT_TEXT' };
  const globalColumnsConfig = {
    title: { field: 'title', name: 'Name', canDisplay: true, isCheckedDefault: true },
    priority_as_keyword: {
      field: 'priority_as_keyword',
      name: 'Priority',
      canDisplay: true,
      isCheckedDefault: false,
    },
  };

  beforeEach(() => {
    useCasesColumnsConfigurationMock.mockReturnValue(globalColumnsConfig);
    useCasesConfigMock.mockReturnValue({ templatesEnabled: true });
    useGlobalInlineFieldsMock.mockReturnValue({
      globalInlineFields: [mockGlobalField],
      isLoading: false,
      isLoaded: true,
    });
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('reads global field checked state from the shared key', () => {
    localStorage.setItem(sharedStorageKey, JSON.stringify({ priority_as_keyword: true }));

    const { result } = renderHook(() => useCasesColumnsSelection(), {
      wrapper: (props) => <TestProviders {...props} license={license} />,
    });

    const globalCol = result.current.selectedColumns.find((c) => c.field === 'priority_as_keyword');
    expect(globalCol?.isChecked).toBe(true);
  });

  it('defaults global field to unchecked when the shared key is absent', () => {
    const { result } = renderHook(() => useCasesColumnsSelection(), {
      wrapper: (props) => <TestProviders {...props} license={license} />,
    });

    const globalCol = result.current.selectedColumns.find((c) => c.field === 'priority_as_keyword');
    expect(globalCol?.isChecked).toBeFalsy();
  });

  it('writes global field checked state to the shared key and full array to the table key', () => {
    const { result } = renderHook(() => useCasesColumnsSelection(), {
      wrapper: (props) => <TestProviders {...props} license={license} />,
    });

    act(() => {
      result.current.setSelectedColumns([
        { field: 'title', name: 'Name', isChecked: true },
        { field: 'priority_as_keyword', name: 'Priority', isChecked: true },
      ]);
    });

    // Global field checked state goes to shared key
    expect(JSON.parse(localStorage.getItem(sharedStorageKey)!)).toEqual({
      priority_as_keyword: true,
    });
    // Full array (including global field) goes to table key to preserve column order
    const tableStored: Array<{ field: string }> = JSON.parse(
      localStorage.getItem(tableStorageKey)!
    );
    expect(tableStored).toEqual([
      { field: 'title', name: 'Name', isChecked: true },
      { field: 'priority_as_keyword', name: 'Priority', isChecked: true },
    ]);
  });

  it('does not write to the shared key when the update contains no global fields', () => {
    const { result } = renderHook(() => useCasesColumnsSelection(), {
      wrapper: (props) => <TestProviders {...props} license={license} />,
    });

    act(() => {
      result.current.setSelectedColumns([{ field: 'title', name: 'Name', isChecked: false }]);
    });

    // useCasesLocalStorage initializes the key with the default value ({}) on mount,
    // but no global field keys should have been written.
    const sharedStored = JSON.parse(localStorage.getItem(sharedStorageKey) || '{}');
    expect(Object.keys(sharedStored)).toHaveLength(0);
  });
});
