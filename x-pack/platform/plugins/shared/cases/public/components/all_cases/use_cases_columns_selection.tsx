/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { CasesColumnSelection } from './types';

import { LOCAL_STORAGE_KEYS } from '../../../common/constants';
import { useCasesColumnsConfiguration } from './use_cases_columns_configuration';
import { mergeSelectedColumnsWithConfiguration } from './utils/merge_selected_columns_with_configuration';
import { useCasesLocalStorage } from '../../common/use_cases_local_storage';
import { useGlobalInlineFields } from './hooks/use_global_inline_fields';
import { getExtendedFieldColumnKey } from './extended_field_columns';
import { useCasesConfig } from '../../common/lib/kibana';

export function useCasesColumnsSelection() {
  const casesColumnsConfig = useCasesColumnsConfiguration();
  const { templatesEnabled } = useCasesConfig();
  const { globalInlineFields } = useGlobalInlineFields({ enabled: templatesEnabled });

  const globalFieldKeys = useMemo(
    () => new Set(globalInlineFields.map(getExtendedFieldColumnKey)),
    [globalInlineFields]
  );

  const [storedTableColumns, setStoredTableColumns] = useCasesLocalStorage<CasesColumnSelection[]>(
    LOCAL_STORAGE_KEYS.casesTableColumns,
    []
  );

  const [storedGlobalFieldChecked, setStoredGlobalFieldChecked] = useCasesLocalStorage<
    Record<string, boolean>
  >(LOCAL_STORAGE_KEYS.casesGlobalFieldColumns, {});

  const merged = mergeSelectedColumnsWithConfiguration({
    selectedColumns: storedTableColumns || [],
    casesColumnsConfig,
  });

  // Override global field checked state with shared storage so both list and table views
  // reflect the same user selection regardless of which view they changed it in.
  const selectedColumns = merged.map((col) =>
    globalFieldKeys.has(col.field) && col.field in storedGlobalFieldChecked
      ? { ...col, isChecked: storedGlobalFieldChecked[col.field] }
      : col
  );

  const setSelectedColumns = useCallback(
    (newColumns: CasesColumnSelection[]) => {
      const globalUpdates: Record<string, boolean> = {};

      for (const col of newColumns) {
        if (globalFieldKeys.has(col.field)) {
          globalUpdates[col.field] = col.isChecked;
        }
      }

      // Persist the full array (including global fields) so column order is preserved.
      // Global field checked state is additionally written to the shared key so the
      // list view picks up the same value.
      setStoredTableColumns(newColumns);
      if (Object.keys(globalUpdates).length > 0) {
        setStoredGlobalFieldChecked((prev) => ({ ...prev, ...globalUpdates }));
      }
    },
    [globalFieldKeys, setStoredTableColumns, setStoredGlobalFieldChecked]
  );

  return {
    selectedColumns,
    setSelectedColumns,
  };
}
