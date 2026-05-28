/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { CasesColumnSelection } from '../types';

import { LOCAL_STORAGE_KEYS } from '../../../../../common/constants';
import type { CasesColumnsConfiguration } from '../../../all_cases/use_cases_columns_configuration';
import { useCasesColumnsConfiguration } from '../../../all_cases/use_cases_columns_configuration';
import { mergeSelectedColumnsWithConfiguration } from '../../../all_cases/utils/merge_selected_columns_with_configuration';
import { useCasesLocalStorage } from '../../../../common/use_cases_local_storage';

/** Fields always shown on each list item; excluded from the list view Fields popover. */
const LIST_ALWAYS_VISIBLE_FIELDS = new Set([
  'title',
  'assignees',
  'createdBy',
  'updatedAt',
  'status',
  'severity',
]);

const getListFieldsConfiguration = (
  casesColumnsConfig: CasesColumnsConfiguration
): CasesColumnsConfiguration =>
  Object.fromEntries(
    Object.entries(casesColumnsConfig).filter(([field]) => !LIST_ALWAYS_VISIBLE_FIELDS.has(field))
  ) as CasesColumnsConfiguration;

export function useListFieldsSelection() {
  const casesColumnsConfig = useCasesColumnsConfiguration();
  const listFieldsConfig = useMemo(
    () => getListFieldsConfiguration(casesColumnsConfig),
    [casesColumnsConfig]
  );

  const [selectedFields, setSelectedFields] = useCasesLocalStorage<CasesColumnSelection[]>(
    LOCAL_STORAGE_KEYS.casesListFields,
    []
  );

  const fields = selectedFields || [];
  const storedFieldKeys = new Set(fields.map(({ field }) => field));

  const mergedFields = mergeSelectedColumnsWithConfiguration({
    selectedColumns: fields,
    casesColumnsConfig: listFieldsConfig,
  });

  return {
    selectedFields: mergedFields.map((column) =>
      storedFieldKeys.has(column.field) ? column : { ...column, isChecked: false }
    ),
    setSelectedFields,
  };
}
