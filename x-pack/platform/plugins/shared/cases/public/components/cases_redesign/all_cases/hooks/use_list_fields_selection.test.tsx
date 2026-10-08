/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';

import { TestProviders } from '../../../../common/mock';
import { LOCAL_STORAGE_KEYS } from '../../../../../common/constants';
import { useListFieldsSelection } from './use_list_fields_selection';
import { useCasesColumnsConfiguration } from '../../../all_cases/use_cases_columns_configuration';
import { useCasesConfig } from '../../../../common/lib/kibana';
import { useGlobalInlineFields } from '../../../all_cases/hooks/use_global_inline_fields';

jest.mock('../../../all_cases/use_cases_columns_configuration');
jest.mock('../../../../common/lib/kibana', () => ({
  ...jest.requireActual('../../../../common/lib/kibana'),
  useCasesConfig: jest.fn(),
}));
jest.mock('../../../all_cases/hooks/use_global_inline_fields', () => ({
  ...jest.requireActual('../../../all_cases/hooks/use_global_inline_fields'),
  useGlobalInlineFields: jest.fn(),
}));

const useCasesColumnsConfigurationMock = useCasesColumnsConfiguration as jest.Mock;
const useCasesConfigMock = useCasesConfig as jest.Mock;
const useGlobalInlineFieldsMock = useGlobalInlineFields as jest.Mock;

const localStorageKey = `securitySolution.${LOCAL_STORAGE_KEYS.casesListFields}`;

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
  createdBy: {
    field: 'createdBy',
    name: 'Reporter',
    canDisplay: true,
  },
  updatedAt: {
    field: 'updatedAt',
    name: 'Last updated',
    canDisplay: true,
  },
  status: {
    field: 'status',
    name: 'Status',
    canDisplay: true,
  },
  severity: {
    field: 'severity',
    name: 'Severity',
    canDisplay: true,
  },
  tags: {
    field: 'tags',
    name: 'Tags',
    canDisplay: true,
  },
  category: {
    field: 'category',
    name: 'Category',
    canDisplay: true,
    isCheckedDefault: true,
  },
};

describe('useListFieldsSelection', () => {
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

  it('returns fields with isChecked false by default', () => {
    const { result } = renderHook(() => useListFieldsSelection(), {
      wrapper: (props) => <TestProviders {...props} license={license} />,
    });

    expect(result.current.selectedFields).toEqual([
      { field: 'tags', name: 'Tags', isChecked: false },
      { field: 'category', name: 'Category', isChecked: false },
    ]);
  });

  it('filters out always-visible list fields from the selection', () => {
    const { result } = renderHook(() => useListFieldsSelection(), {
      wrapper: (props) => <TestProviders {...props} license={license} />,
    });

    const fields = result.current.selectedFields.map(({ field }) => field);

    expect(fields).not.toContain('title');
    expect(fields).not.toContain('assignees');
    expect(fields).not.toContain('createdBy');
    expect(fields).not.toContain('updatedAt');
    expect(fields).not.toContain('status');
    expect(fields).not.toContain('severity');
  });

  it('persists selections to localStorage', () => {
    const selectedFields = [{ field: 'tags', name: 'Tags', isChecked: true }];

    const { result } = renderHook(() => useListFieldsSelection(), {
      wrapper: (props) => <TestProviders {...props} license={license} />,
    });

    act(() => {
      result.current.setSelectedFields(selectedFields);
    });

    expect(JSON.parse(localStorage.getItem(localStorageKey)!)).toEqual(selectedFields);
  });

  it('merges stored selections from localStorage', () => {
    const storedFields = [{ field: 'tags', name: 'Tags', isChecked: true }];

    localStorage.setItem(localStorageKey, JSON.stringify(storedFields));

    const { result } = renderHook(() => useListFieldsSelection(), {
      wrapper: (props) => <TestProviders {...props} license={license} />,
    });

    expect(result.current.selectedFields).toEqual([
      { field: 'tags', name: 'Tags', isChecked: true },
      { field: 'category', name: 'Category', isChecked: false },
    ]);
  });
});

describe('useListFieldsSelection — global field sync (Bug 19099)', () => {
  const license = licensingMock.createLicense({ license: { type: 'platinum' } });
  const sharedStorageKey = `securitySolution.${LOCAL_STORAGE_KEYS.casesGlobalFieldColumns}`;
  const listStorageKey = `securitySolution.${LOCAL_STORAGE_KEYS.casesListFields}`;

  const mockGlobalField = { name: 'priority', type: 'keyword', control: 'INPUT_TEXT' };

  const globalColumnsConfig = {
    // Always-visible fields excluded from list selection
    title: { field: 'title', name: 'Name', canDisplay: true, isCheckedDefault: true },
    assignees: { field: 'assignees', name: 'Assignees', canDisplay: true, isCheckedDefault: true },
    createdBy: { field: 'createdBy', name: 'Reporter', canDisplay: true, isCheckedDefault: true },
    updatedAt: {
      field: 'updatedAt',
      name: 'Last updated',
      canDisplay: true,
      isCheckedDefault: true,
    },
    status: { field: 'status', name: 'Status', canDisplay: true, isCheckedDefault: true },
    severity: { field: 'severity', name: 'Severity', canDisplay: true, isCheckedDefault: true },
    // Non-global optional field
    tags: { field: 'tags', name: 'Tags', canDisplay: true, isCheckedDefault: false },
    // Global field
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

    const { result } = renderHook(() => useListFieldsSelection(), {
      wrapper: (props) => <TestProviders {...props} license={license} />,
    });

    const globalField = result.current.selectedFields.find(
      (f) => f.field === 'priority_as_keyword'
    );
    expect(globalField?.isChecked).toBe(true);
  });

  it('defaults global field to unchecked when the shared key and the list key are both absent', () => {
    const { result } = renderHook(() => useListFieldsSelection(), {
      wrapper: (props) => <TestProviders {...props} license={license} />,
    });

    const globalField = result.current.selectedFields.find(
      (f) => f.field === 'priority_as_keyword'
    );
    expect(globalField?.isChecked).toBe(false);
  });

  it('preserves existing list-view selection for a global field when the shared key is absent (upgrade compat)', () => {
    // Simulate a user who had the global field checked in the list view before the shared key existed
    localStorage.setItem(
      listStorageKey,
      JSON.stringify([{ field: 'priority_as_keyword', name: 'Priority', isChecked: true }])
    );

    const { result } = renderHook(() => useListFieldsSelection(), {
      wrapper: (props) => <TestProviders {...props} license={license} />,
    });

    const globalField = result.current.selectedFields.find(
      (f) => f.field === 'priority_as_keyword'
    );
    expect(globalField?.isChecked).toBe(true);
  });

  it('writes global field checked state to the shared key and full array to the list key', () => {
    const { result } = renderHook(() => useListFieldsSelection(), {
      wrapper: (props) => <TestProviders {...props} license={license} />,
    });

    act(() => {
      result.current.setSelectedFields([
        { field: 'tags', name: 'Tags', isChecked: true },
        { field: 'priority_as_keyword', name: 'Priority', isChecked: true },
      ]);
    });

    // Global field checked state goes to shared key (for cross-view sync)
    expect(JSON.parse(localStorage.getItem(sharedStorageKey)!)).toEqual({
      priority_as_keyword: true,
    });
    // Full array (including global field) goes to list key to preserve field order
    const listStored: Array<{ field: string }> = JSON.parse(localStorage.getItem(listStorageKey)!);
    expect(listStored).toEqual([
      { field: 'tags', name: 'Tags', isChecked: true },
      { field: 'priority_as_keyword', name: 'Priority', isChecked: true },
    ]);
  });

  it('non-global field selections in one view do not appear in the other view storage key', () => {
    const { result } = renderHook(() => useListFieldsSelection(), {
      wrapper: (props) => <TestProviders {...props} license={license} />,
    });

    act(() => {
      result.current.setSelectedFields([{ field: 'tags', name: 'Tags', isChecked: true }]);
    });

    // useCasesLocalStorage initializes the key with the default value ({}) on mount,
    // but no global field keys should have been written.
    const sharedStored = JSON.parse(localStorage.getItem(sharedStorageKey) || '{}');
    expect(Object.keys(sharedStored)).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem(listStorageKey)!)).toEqual([
      { field: 'tags', name: 'Tags', isChecked: true },
    ]);
  });
});
