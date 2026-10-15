/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { omit } from 'lodash';

import type { CasesColumnSelection } from '../types';

import { LOCAL_STORAGE_KEYS } from '../../../../../common/constants';
import type { CasesColumnsConfiguration } from '../../../all_cases/use_cases_columns_configuration';
import { useCasesColumnsConfiguration } from '../../../all_cases/use_cases_columns_configuration';
import {
  getColumnBaseKey,
  mergeSelectedColumnsWithConfiguration,
} from '../../../all_cases/utils/merge_selected_columns_with_configuration';
import { useCasesLocalStorage } from '../../../../common/use_cases_local_storage';
import { LIST_ALWAYS_VISIBLE_FIELDS } from '../constants';
import { useGlobalInlineFields } from '../../../all_cases/hooks/use_global_inline_fields';
import { getExtendedFieldColumnKey } from '../../../all_cases/extended_field_columns';
import { useCasesConfig } from '../../../../common/lib/kibana';

const getListFieldsConfiguration = (
  casesColumnsConfig: CasesColumnsConfiguration
): CasesColumnsConfiguration => omit(casesColumnsConfig, LIST_ALWAYS_VISIBLE_FIELDS);

export function useListFieldsSelection() {
  const casesColumnsConfig = useCasesColumnsConfiguration();
  const listFieldsConfig = useMemo(
    () => getListFieldsConfiguration(casesColumnsConfig),
    [casesColumnsConfig]
  );

  const { templatesEnabled } = useCasesConfig();
  const { globalInlineFields } = useGlobalInlineFields({ enabled: templatesEnabled });

  const globalFieldKeys = useMemo(
    () => new Set(globalInlineFields.map(getExtendedFieldColumnKey)),
    [globalInlineFields]
  );

  const [storedListFields, setStoredListFields] = useCasesLocalStorage<CasesColumnSelection[]>(
    LOCAL_STORAGE_KEYS.casesListFields,
    []
  );

  const [storedGlobalFieldChecked, setStoredGlobalFieldChecked] = useCasesLocalStorage<
    Record<string, boolean>
  >(LOCAL_STORAGE_KEYS.casesGlobalFieldColumns, {});

  const mergedFields = useMemo(() => {
    const fields = storedListFields || [];
    const storedBaseKeys = new Set(fields.map(({ field }) => getColumnBaseKey(field)));

    const merged = mergeSelectedColumnsWithConfiguration({
      selectedColumns: fields,
      casesColumnsConfig: listFieldsConfig,
    });

    return merged.map((column) => {
      // Global fields: use shared checked state if stored; otherwise fall back to the
      // value already in the stored list array (upgrade compat) or the config default.
      // This keeps the selection in sync with the table view (Bug 19099).
      if (globalFieldKeys.has(column.field)) {
        return {
          ...column,
          isChecked:
            column.field in storedGlobalFieldChecked
              ? storedGlobalFieldChecked[column.field]
              : column.isChecked,
        };
      }
      // Non-global fields: keep stored state; default newly added fields to unchecked.
      return storedBaseKeys.has(getColumnBaseKey(column.field))
        ? column
        : { ...column, isChecked: false };
    });
  }, [storedListFields, listFieldsConfig, globalFieldKeys, storedGlobalFieldChecked]);

  const setSelectedFields = useCallback(
    (newFields: CasesColumnSelection[]) => {
      const globalUpdates: Record<string, boolean> = {};

      for (const col of newFields) {
        if (globalFieldKeys.has(col.field)) {
          globalUpdates[col.field] = col.isChecked;
        }
      }

      // Persist the full array (including global fields) so field order is preserved.
      // Global field checked state is additionally written to the shared key so the
      // table view picks up the same value.
      setStoredListFields(newFields);
      if (Object.keys(globalUpdates).length > 0) {
        setStoredGlobalFieldChecked((prev) => ({ ...prev, ...globalUpdates }));
      }
    },
    [globalFieldKeys, setStoredListFields, setStoredGlobalFieldChecked]
  );

  return {
    selectedFields: mergedFields,
    setSelectedFields,
  };
}
