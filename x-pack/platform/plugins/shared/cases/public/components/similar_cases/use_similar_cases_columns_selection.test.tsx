/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { renderHook, act } from '@testing-library/react';

import { TestProviders } from '../../common/mock';
import { useSimilarCasesColumnsSelection } from './use_similar_cases_columns_selection';
import { useCasesColumnsConfiguration } from '../all_cases/hooks/use_cases_columns_configuration';
import { LOCAL_STORAGE_KEYS } from '../../../common/constants';

jest.mock('../all_cases/hooks/use_cases_columns_configuration');

const useCasesColumnsConfigurationMock = useCasesColumnsConfiguration as jest.Mock;

const localStorageKey = `securitySolution.${LOCAL_STORAGE_KEYS.similarCasesTableColumns}`;

const casesColumnsConfig = {
  title: { field: 'title', name: 'Name', canDisplay: true, isCheckedDefault: true },
  createdAt: { field: 'createdAt', name: 'Created on', canDisplay: true, isCheckedDefault: true },
  tags: { field: 'tags', name: 'Tags', canDisplay: true, isCheckedDefault: true },
  category: { field: 'category', name: 'Category', canDisplay: true, isCheckedDefault: true },
  status: { field: 'status', name: 'Status', canDisplay: true, isCheckedDefault: true },
  severity: { field: 'severity', name: 'Severity', canDisplay: true, isCheckedDefault: true },
  assignees: { field: 'assignees', name: 'Assignees', canDisplay: true, isCheckedDefault: true },
  totalComment: {
    field: 'totalComment',
    name: 'Comments',
    canDisplay: true,
    isCheckedDefault: true,
  },
};

describe('useSimilarCasesColumnsSelection', () => {
  const license = licensingMock.createLicense({ license: { type: 'platinum' } });

  beforeEach(() => {
    useCasesColumnsConfigurationMock.mockReturnValue(casesColumnsConfig);
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('applies Similar Cases defaults when localStorage is empty', () => {
    const { result } = renderHook(() => useSimilarCasesColumnsSelection(), {
      wrapper: (props) => <TestProviders {...props} license={license} />,
    });

    const { selectedColumns } = result.current;

    // Fields in SIMILAR_CASES_CHECKED_DEFAULTS are checked.
    expect(selectedColumns.find((c) => c.field === 'title')?.isChecked).toBe(true);
    expect(selectedColumns.find((c) => c.field === 'createdAt')?.isChecked).toBe(true);
    expect(selectedColumns.find((c) => c.field === 'tags')?.isChecked).toBe(true);
    expect(selectedColumns.find((c) => c.field === 'category')?.isChecked).toBe(true);
    expect(selectedColumns.find((c) => c.field === 'status')?.isChecked).toBe(true);
    expect(selectedColumns.find((c) => c.field === 'severity')?.isChecked).toBe(true);

    // Fields not in the defaults are unchecked even if the catalog marks them true.
    expect(selectedColumns.find((c) => c.field === 'assignees')?.isChecked).toBe(false);
    expect(selectedColumns.find((c) => c.field === 'totalComment')?.isChecked).toBe(false);
  });

  it('round-trips a stored column selection from localStorage', () => {
    const stored = [
      { field: 'title', name: 'Name', isChecked: false },
      { field: 'createdAt', name: 'Created on', isChecked: true },
    ];
    localStorage.setItem(localStorageKey, JSON.stringify(stored));

    const { result } = renderHook(() => useSimilarCasesColumnsSelection(), {
      wrapper: (props) => <TestProviders {...props} license={license} />,
    });

    // Stored value overrides default for title (false) and preserves createdAt (true).
    expect(result.current.selectedColumns.find((c) => c.field === 'title')?.isChecked).toBe(false);
    expect(result.current.selectedColumns.find((c) => c.field === 'createdAt')?.isChecked).toBe(
      true
    );
  });

  it('persists new column selection to localStorage', () => {
    const { result } = renderHook(() => useSimilarCasesColumnsSelection(), {
      wrapper: (props) => <TestProviders {...props} license={license} />,
    });

    act(() => {
      result.current.setSelectedColumns([
        { field: 'title', name: 'Name', isChecked: false },
        { field: 'createdAt', name: 'Created on', isChecked: true },
      ]);
    });

    const stored = JSON.parse(localStorage.getItem(localStorageKey) ?? '[]');
    expect(stored).toEqual([
      { field: 'title', name: 'Name', isChecked: false },
      { field: 'createdAt', name: 'Created on', isChecked: true },
    ]);
  });

  it('does not share state with the main Cases list localStorage key', () => {
    const mainListKey = `securitySolution.${LOCAL_STORAGE_KEYS.casesTableColumns}`;
    localStorage.setItem(
      mainListKey,
      JSON.stringify([{ field: 'title', name: 'Name', isChecked: false }])
    );

    const { result } = renderHook(() => useSimilarCasesColumnsSelection(), {
      wrapper: (props) => <TestProviders {...props} license={license} />,
    });

    // The Similar Cases hook reads its own key, so title should still be at its default (true).
    expect(result.current.selectedColumns.find((c) => c.field === 'title')?.isChecked).toBe(true);
  });

  it.each([
    ['an object', '{}'],
    ['an array of null', '[null]'],
    ['an array of invalid entries', '[{"field":1},"title"]'],
    ['a string', '"title"'],
  ])('falls back to defaults when localStorage holds %s', (_label, raw) => {
    localStorage.setItem(localStorageKey, raw);

    const { result } = renderHook(() => useSimilarCasesColumnsSelection(), {
      wrapper: (props) => <TestProviders {...props} license={license} />,
    });

    expect(result.current.selectedColumns.find((c) => c.field === 'title')?.isChecked).toBe(true);
    expect(result.current.selectedColumns.find((c) => c.field === 'assignees')?.isChecked).toBe(
      false
    );
  });

  it('ignores stored entries with an unknown field id', () => {
    localStorage.setItem(
      localStorageKey,
      JSON.stringify([
        { field: 'doesNotExist', name: 'Unknown', isChecked: true },
        { field: 'title', name: 'Name', isChecked: false },
      ])
    );

    const { result } = renderHook(() => useSimilarCasesColumnsSelection(), {
      wrapper: (props) => <TestProviders {...props} license={license} />,
    });

    const { selectedColumns } = result.current;
    expect(selectedColumns.some((c) => c.field === 'doesNotExist')).toBe(false);
    expect(selectedColumns.find((c) => c.field === 'title')?.isChecked).toBe(false);
  });
});
