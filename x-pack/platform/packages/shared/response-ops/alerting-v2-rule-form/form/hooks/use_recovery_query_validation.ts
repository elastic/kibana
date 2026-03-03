/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { Control } from 'react-hook-form';
import type { ISearchGeneric } from '@kbn/search-types';
import type { FormValues } from '../types';
import { useQueryGroupingValidation } from './use_query_grouping_validation';

interface UseRecoveryQueryValidationProps {
  /** Form control to watch grouping.fields */
  control: Control<FormValues>;
  /** Search service for fetching query columns */
  search: ISearchGeneric;
  /** The recovery ES|QL query to validate */
  query: string;
}

/**
 * Validates that a recovery query includes all the fields specified in the
 * rule's group key (`grouping.fields`).
 *
 * When a rule uses grouping, recovery queries must include those same fields
 * so the system can correctly match recovered results to the correct alert
 * instances. This hook wraps `useQueryGroupingValidation` with
 * recovery-specific error messages.
 */
export const useRecoveryQueryValidation = ({
  control,
  search,
  query,
}: UseRecoveryQueryValidationProps) => {
  const getErrorMessage = useCallback(
    (missingColumns: string[]) =>
      i18n.translate('xpack.alertingV2.ruleForm.recoveryQueryMissingColumnsError', {
        defaultMessage:
          'Recovery query is missing columns used for grouping: {columns}. The recovery query must include these columns to properly identify which alerts should recover.',
        values: { columns: missingColumns.join(', ') },
      }),
    []
  );

  const result = useQueryGroupingValidation({
    control,
    search,
    query,
    getErrorMessage,
  });

  return {
    ...result,
    /** Alias for queryColumns with a recovery-specific name */
    recoveryColumns: result.queryColumns,
  };
};
