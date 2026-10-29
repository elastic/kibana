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

  const renderSelectionHook = () =>
    renderHook(() => useSimilarCasesColumnsSelection(), {
      wrapper: (props) => <TestProviders {...props} license={license} />,
    });

  it('applies Similar Cases defaults when localStorage is empty', () => {
    const { result } = renderSelectionHook();

    const { tableColumns } = result.current;

    // Fields in SIMILAR_CASES_CHECKED_DEFAULTS are checked.
    expect(tableColumns.find((c) => c.field === 'title')?.isChecked).toBe(true);
    expect(tableColumns.find((c) => c.field === 'createdAt')?.isChecked).toBe(true);
    expect(tableColumns.find((c) => c.field === 'tags')?.isChecked).toBe(true);
    expect(tableColumns.find((c) => c.field === 'category')?.isChecked).toBe(true);
    expect(tableColumns.find((c) => c.field === 'status')?.isChecked).toBe(true);
    expect(tableColumns.find((c) => c.field === 'severity')?.isChecked).toBe(true);

    // Fields not in the defaults are unchecked even if the catalog marks them true.
    expect(tableColumns.find((c) => c.field === 'assignees')?.isChecked).toBe(false);
    expect(tableColumns.find((c) => c.field === 'totalComment')?.isChecked).toBe(false);
  });

  it('round-trips a stored column selection from localStorage', () => {
    const stored = [
      { field: 'createdAt', name: 'Created on', isChecked: false },
      { field: 'tags', name: 'Tags', isChecked: true },
    ];
    localStorage.setItem(localStorageKey, JSON.stringify(stored));

    const { result } = renderSelectionHook();

    // Stored value overrides the default for createdAt (false) and preserves tags (true).
    expect(result.current.pickerColumns.find((c) => c.field === 'createdAt')?.isChecked).toBe(
      false
    );
    expect(result.current.pickerColumns.find((c) => c.field === 'tags')?.isChecked).toBe(true);
  });

  it('persists the new picker selection to localStorage, with the name column first', () => {
    const { result } = renderSelectionHook();

    act(() => {
      result.current.setPickerColumns([
        { field: 'createdAt', name: 'Created on', isChecked: true },
      ]);
    });

    const stored = JSON.parse(localStorage.getItem(localStorageKey) ?? '[]');
    expect(stored).toEqual([
      { field: 'title', name: 'Name', isChecked: true },
      { field: 'createdAt', name: 'Created on', isChecked: true },
    ]);
  });

  it('does not share state with the main Cases list localStorage key', () => {
    const mainListKey = `securitySolution.${LOCAL_STORAGE_KEYS.casesTableColumns}`;
    localStorage.setItem(
      mainListKey,
      JSON.stringify([{ field: 'createdAt', name: 'Created on', isChecked: false }])
    );

    const { result } = renderSelectionHook();

    // The Similar Cases hook reads its own key, so createdAt should still be at its default (true).
    expect(result.current.pickerColumns.find((c) => c.field === 'createdAt')?.isChecked).toBe(true);
  });

  describe('name column', () => {
    it('is not offered in the picker columns', () => {
      const { result } = renderSelectionHook();

      expect(result.current.pickerColumns.some((c) => c.field === 'title')).toBe(false);
    });

    it('is first and checked in the table columns', () => {
      const { result } = renderSelectionHook();

      expect(result.current.tableColumns[0]).toEqual({
        field: 'title',
        name: 'Name',
        isChecked: true,
      });
    });

    it('stays first and checked when the stored selection hides it or moves it', () => {
      localStorage.setItem(
        localStorageKey,
        JSON.stringify([
          { field: 'createdAt', name: 'Created on', isChecked: true },
          { field: 'title', name: 'Name', isChecked: false },
        ])
      );

      const { result } = renderSelectionHook();

      expect(result.current.tableColumns[0]).toEqual({
        field: 'title',
        name: 'Name',
        isChecked: true,
      });
      expect(result.current.tableColumns.filter((c) => c.field === 'title')).toHaveLength(1);
      expect(result.current.pickerColumns.some((c) => c.field === 'title')).toBe(false);
    });
  });

  it.each([
    ['an object', '{}'],
    ['an array of null', '[null]'],
    ['an array of invalid entries', '[{"field":1},"title"]'],
    ['a string', '"title"'],
  ])('falls back to defaults when localStorage holds %s', (_label, raw) => {
    localStorage.setItem(localStorageKey, raw);

    const { result } = renderSelectionHook();

    expect(result.current.tableColumns.find((c) => c.field === 'title')?.isChecked).toBe(true);
    expect(result.current.tableColumns.find((c) => c.field === 'assignees')?.isChecked).toBe(false);
  });

  it('ignores stored entries with an unknown field id', () => {
    localStorage.setItem(
      localStorageKey,
      JSON.stringify([
        { field: 'doesNotExist', name: 'Unknown', isChecked: true },
        { field: 'tags', name: 'Tags', isChecked: false },
      ])
    );

    const { result } = renderSelectionHook();

    const { tableColumns } = result.current;
    expect(tableColumns.some((c) => c.field === 'doesNotExist')).toBe(false);
    expect(tableColumns.find((c) => c.field === 'tags')?.isChecked).toBe(false);
  });
});
