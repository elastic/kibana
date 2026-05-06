/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useWatch, type Control } from 'react-hook-form';
import type { ISearchGeneric } from '@kbn/search-types';
import type { FormValues } from '../types';
import { useQueryColumns } from './use_query_columns';

interface UseQueryGroupingValidationProps {
  /** Form control to watch grouping.fields */
  control: Control<FormValues>;
  /** Search service for fetching query columns */
  search: ISearchGeneric;
  /** The ES|QL query to validate */
  query: string;
  /** Callback to build a domain-specific error message from missing column names */
  getErrorMessage: (missingColumns: string[]) => string;
}

/**
 * Generic hook that validates whether a given ES|QL query includes all the
 * fields specified in `grouping.fields`.
 *
 * This is important because queries used for recovery (and potentially no-data)
 * must include all grouping fields so the system can correctly identify which
 * alert instances are affected.
 *
 * The hook:
 * 1. Watches `grouping.fields` from the form context
 * 2. Fetches column metadata from the provided query via `useQueryColumns`
 * 3. Compares columns against grouping fields to find any that are missing
 * 4. Returns the missing columns and a formatted validation error message
 */
export const useQueryGroupingValidation = ({
  control,
  search,
  query,
  getErrorMessage,
}: UseQueryGroupingValidationProps) => {
  const groupingFields = useWatch({ control, name: 'grouping.fields' });

  const {
    data: queryColumns,
    isLoading,
    error: queryError,
  } = useQueryColumns({
    query: query || '',
    search,
  });

  const { missingColumns, validationError } = useMemo(() => {
    if (!query || queryColumns.length === 0 || isLoading || queryError) {
      return { missingColumns: [] as string[], validationError: undefined };
    }

    if (!groupingFields || groupingFields.length === 0) {
      return { missingColumns: [] as string[], validationError: undefined };
    }

    const columnNames = new Set(queryColumns.map((col) => col.name));
    const missing = groupingFields.filter((field) => !columnNames.has(field));

    if (missing.length > 0) {
      return { missingColumns: missing, validationError: getErrorMessage(missing) };
    }

    return { missingColumns: [] as string[], validationError: undefined };
  }, [groupingFields, query, queryColumns, isLoading, queryError, getErrorMessage]);

  return {
    /** Grouping field names not found in the query's output columns */
    missingColumns,
    /** Whether the query columns are currently being fetched */
    isValidating: isLoading,
    /** All columns returned by the query */
    queryColumns,
    /** Error from the query column fetch (e.g. syntax error) */
    queryError,
    /** Formatted validation error message, or undefined if valid */
    validationError,
  };
};
