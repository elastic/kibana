/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useMemo, useState } from 'react';
import {
  useWatch,
  type Control,
  type UseFormSetError,
  type UseFormClearErrors,
  type FieldPath,
} from 'react-hook-form';
import type { ISearchGeneric } from '@kbn/search-types';
import type { FormValues } from '../types';
import { useQueryColumns, type QueryColumn } from './use_query_columns';

interface UseQueryGroupingValidationProps {
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
  /**
   * The form field path to set errors on (e.g., 'recoveryPolicy.query' or 'noData.query')
   */
  fieldPath: FieldPath<FormValues>;
  /**
   * Function to generate the error message when columns are missing
   */
  getErrorMessage: (missingColumns: string[]) => string;
}

/**
 * Generic hook that validates a query contains all the columns
 * specified in the grouping.fields field.
 *
 * When alerts are grouped by certain columns (e.g., host.name, service.name),
 * queries that affect alert state must also return those columns so the system
 * can properly identify which alert instances should be affected.
 */
export const useQueryGroupingValidation = ({
  control,
  setError,
  clearErrors,
  search,
  query,
  fieldPath,
  getErrorMessage,
}: UseQueryGroupingValidationProps) => {
  const groupingFields = useWatch({ control, name: 'grouping.fields' });
  const [validationError, setValidationError] = useState<string | undefined>(undefined);

  // Use refs to access current values in callbacks without stale closures
  const groupingFieldsRef = useRef(groupingFields);
  groupingFieldsRef.current = groupingFields;
  const setErrorRef = useRef(setError);
  setErrorRef.current = setError;
  const clearErrorsRef = useRef(clearErrors);
  clearErrorsRef.current = clearErrors;
  const getErrorMessageRef = useRef(getErrorMessage);
  getErrorMessageRef.current = getErrorMessage;

  // Validation function that can be called from onSuccess or when groupingFields changes
  const validateColumns = useCallback(
    (columns: QueryColumn[]) => {
      const currentGroupingFields = groupingFieldsRef.current;

      // Skip validation if there are no grouping columns
      if (!currentGroupingFields || currentGroupingFields.length === 0) {
        clearErrorsRef.current(fieldPath);
        setValidationError(undefined);
        return [];
      }

      // Build set of column names for efficient lookup
      const columnNames = new Set(columns.map((col) => col.name));
      const missing = currentGroupingFields.filter((col) => !columnNames.has(col));

      if (missing.length > 0) {
        const errorMessage = getErrorMessageRef.current(missing);
        setErrorRef.current(fieldPath, {
          type: 'validate',
          message: errorMessage,
        });
        setValidationError(errorMessage);
      } else {
        clearErrorsRef.current(fieldPath);
        setValidationError(undefined);
      }

      return missing;
    },
    [fieldPath]
  );

  // Get columns from the query, validate on success
  const {
    data: queryColumns,
    isLoading,
    error: queryError,
  } = useQueryColumns({
    query: query || '',
    search,
    onSuccess: validateColumns,
  });

  // Re-validate when groupingFields changes (columns already fetched)
  const missingColumns = useMemo(() => {
    if (!query || queryColumns.length === 0 || isLoading || queryError) {
      return [];
    }
    return validateColumns(queryColumns);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupingFields, query, queryColumns, isLoading, queryError, validateColumns]);

  return {
    missingColumns,
    isValidating: isLoading,
    queryColumns,
    queryError,
    /** The validation error message, if any */
    validationError,
  };
};
