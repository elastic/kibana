/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { difference } from 'lodash';
import type { CasesColumnSelection } from '../types';
import type { CasesColumnsConfiguration } from '../use_cases_columns_configuration';

export const mergeSelectedColumnsWithConfiguration = ({
  selectedColumns,
  casesColumnsConfig,
}: {
  selectedColumns: CasesColumnSelection[];
  casesColumnsConfig: CasesColumnsConfiguration;
}): CasesColumnSelection[] => {
  const result = selectedColumns.reduce((accumulator, { field, isChecked }) => {
    if (
      field in casesColumnsConfig &&
      casesColumnsConfig[field].field !== '' &&
      casesColumnsConfig[field].canDisplay
    ) {
      accumulator.push({
        field: casesColumnsConfig[field].field,
        name: casesColumnsConfig[field].name,
        isChecked,
      });
    }
    return accumulator;
  }, [] as CasesColumnSelection[]);

  // This will include any new customFields and/or changes to the case attributes
  const missingColumns = difference(
    Object.keys(casesColumnsConfig),
    selectedColumns.map(({ field }) => field)
  );

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
