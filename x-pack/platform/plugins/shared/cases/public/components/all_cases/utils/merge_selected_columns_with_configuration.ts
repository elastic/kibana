/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { difference } from 'lodash';
import type { CasesColumnSelection } from '../types';
import type { CasesColumnsConfiguration } from '../use_cases_columns_configuration';

// Extended-field columns are keyed `<name>_as_<type>` under templates v2, whereas the same
// migrated field is keyed by its bare legacy key when the flag is off. Stripping the suffix
// yields a flag-independent "base" so a stored selection matches the current config across a
// flag flip (and revert) instead of being dropped. Bounded to known v2 field types so bare
// legacy keys (uuids, no `_as_`) are never mangled.
const EXTENDED_FIELD_SUFFIX = /_as_(?:boolean|integer|keyword|long|double|date)$/;

export const getColumnBaseKey = (field: string): string => field.replace(EXTENDED_FIELD_SUFFIX, '');

export const mergeSelectedColumnsWithConfiguration = ({
  selectedColumns,
  casesColumnsConfig,
}: {
  selectedColumns: CasesColumnSelection[];
  casesColumnsConfig: CasesColumnsConfiguration;
}): CasesColumnSelection[] => {
  // Maps each config column's base key to its current (possibly suffixed) key, so a stored
  // selection under the other flag's key still resolves to the active column.
  const baseKeyToConfigKey = new Map<string, string>();
  for (const configKey of Object.keys(casesColumnsConfig)) {
    baseKeyToConfigKey.set(getColumnBaseKey(configKey), configKey);
  }

  const resolveConfigKey = (field: string): string | undefined =>
    field in casesColumnsConfig ? field : baseKeyToConfigKey.get(getColumnBaseKey(field));

  const consumedConfigKeys = new Set<string>();
  const result = selectedColumns.reduce((accumulator, { field, isChecked }) => {
    const configKey = resolveConfigKey(field);
    if (
      configKey != null &&
      !consumedConfigKeys.has(configKey) &&
      casesColumnsConfig[configKey].field !== '' &&
      casesColumnsConfig[configKey].canDisplay
    ) {
      consumedConfigKeys.add(configKey);
      accumulator.push({
        field: casesColumnsConfig[configKey].field,
        name: casesColumnsConfig[configKey].name,
        isChecked,
      });
    }
    return accumulator;
  }, [] as CasesColumnSelection[]);

  // This will include any new customFields and/or changes to the case attributes
  const missingColumns = difference(Object.keys(casesColumnsConfig), [...consumedConfigKeys]);

  missingColumns.forEach((field) => {
    // can be an empty string
    if (casesColumnsConfig[field].field && casesColumnsConfig[field].canDisplay) {
      result.push({
        field: casesColumnsConfig[field].field,
        name: casesColumnsConfig[field].name,
        isChecked: casesColumnsConfig[field].isCheckedDefault,
      });
    }
  });

  return result;
};
