/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { type Control, type UseFormSetError, type UseFormClearErrors } from 'react-hook-form';
import type { ISearchGeneric } from '@kbn/search-types';
import type { FormValues } from '../types';
import { useQueryGroupingValidation } from './use_query_grouping_validation';

interface UseNoDataQueryValidationProps {
  control: Control<FormValues>;
  setError: UseFormSetError<FormValues>;
  clearErrors: UseFormClearErrors<FormValues>;
  search: ISearchGeneric;
  /**
   * The query to validate. Validation is required BOTH in draft mode
   * before the query is saved to form state, and in read-only mode,
   * so we need the query as a parameter instead of reading it from form state.
   */
  query: string;
}

/**
 * Hook that validates the no data query contains all the columns
 * specified in the grouping.fields field.
 *
 * When alerts are grouped by certain columns (e.g., host.name, service.name),
 * the no data query must also return those columns so the system can properly
 * identify which alert instances should trigger the no data behavior.
 */
export const useNoDataQueryValidation = ({
  control,
  setError,
  clearErrors,
  search,
  query,
}: UseNoDataQueryValidationProps) => {
  const getErrorMessage = useCallback(
    (missingColumns: string[]) =>
      i18n.translate('xpack.alertingV2.ruleForm.noDataQueryMissingColumnsError', {
        defaultMessage:
          'No data query is missing columns used for grouping: {columns}. The no data query must include these columns to properly identify which alerts should be affected.',
        values: { columns: missingColumns.join(', ') },
      }),
    []
  );

  const result = useQueryGroupingValidation({
    control,
    setError,
    clearErrors,
    search,
    query,
    fieldPath: 'noData.query',
    getErrorMessage,
  });

  return {
    ...result,
    noDataColumns: result.queryColumns,
  };
};
