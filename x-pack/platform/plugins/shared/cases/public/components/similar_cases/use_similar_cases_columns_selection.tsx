/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { CasesColumnSelection } from '../all_cases/types';
import { LOCAL_STORAGE_KEYS } from '../../../common/constants';
import { useCasesColumnsConfiguration } from '../all_cases/hooks/use_cases_columns_configuration';
import type { CasesColumnsConfiguration } from '../all_cases/hooks/use_cases_columns_configuration';
import { mergeSelectedColumnsWithConfiguration } from '../all_cases/utils/merge_selected_columns_with_configuration';
import { useCasesLocalStorage } from '../../common/use_cases_local_storage';

/** Fields checked by default in the Similar Cases table column picker. */
export const SIMILAR_CASES_CHECKED_DEFAULTS = new Set([
  'title',
  'createdAt',
  'tags',
  'category',
  'status',
  'severity',
]);

const isColumnSelection = (value: unknown): value is CasesColumnSelection =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as CasesColumnSelection).field === 'string' &&
  typeof (value as CasesColumnSelection).isChecked === 'boolean';

export interface UseSimilarCasesColumnsSelectionReturnValue {
  /** The columns the user can toggle in the column picker. The name column is not listed. */
  pickerColumns: CasesColumnSelection[];
  /** The columns to render: the pinned name column first, then the picker columns. */
  tableColumns: CasesColumnSelection[];
  setPickerColumns: (columns: CasesColumnSelection[]) => void;
}

export const useSimilarCasesColumnsSelection = (): UseSimilarCasesColumnsSelectionReturnValue => {
  const casesColumnsConfig = useCasesColumnsConfiguration(false);

  const [storedTableColumns, setStoredTableColumns] = useCasesLocalStorage<CasesColumnSelection[]>(
    LOCAL_STORAGE_KEYS.similarCasesTableColumns,
    []
  );

  // Override each catalog entry's isCheckedDefault to match the Similar Cases
  // default visible set. Custom fields and any standard fields not in the set
  // default to unchecked.
  const similarCasesColumnsConfig: CasesColumnsConfiguration = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(casesColumnsConfig).map(([key, value]) => [
          key,
          { ...value, isCheckedDefault: SIMILAR_CASES_CHECKED_DEFAULTS.has(key) },
        ])
      ),
    [casesColumnsConfig]
  );

  // The name column is always visible and first, so it is pinned here and not offered in the picker.
  const nameColumn: CasesColumnSelection = useMemo(
    () => ({
      field: casesColumnsConfig.title.field,
      name: casesColumnsConfig.title.name,
      isChecked: true,
    }),
    [casesColumnsConfig]
  );

  const pickerColumns = useMemo(
    () =>
      mergeSelectedColumnsWithConfiguration({
        // Stored JSON can have any shape; ignore anything that is not a valid selection list.
        selectedColumns: Array.isArray(storedTableColumns)
          ? storedTableColumns.filter(isColumnSelection)
          : [],
        casesColumnsConfig: similarCasesColumnsConfig,
      }).filter(({ field }) => field !== nameColumn.field),
    [storedTableColumns, similarCasesColumnsConfig, nameColumn]
  );

  const tableColumns = useMemo(() => [nameColumn, ...pickerColumns], [nameColumn, pickerColumns]);

  const setPickerColumns = useCallback(
    (newColumns: CasesColumnSelection[]) => {
      setStoredTableColumns([nameColumn, ...newColumns]);
    },
    [nameColumn, setStoredTableColumns]
  );

  return { pickerColumns, tableColumns, setPickerColumns };
};
