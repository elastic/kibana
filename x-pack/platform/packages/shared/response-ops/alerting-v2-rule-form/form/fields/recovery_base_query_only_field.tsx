/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import type { FormValues } from '../types';
import type { useRecoveryValidation } from '../hooks/use_recovery_validation';
import { RecoveryBaseQueryField } from './recovery_base_query_field';

interface RecoveryBaseQueryOnlyFieldProps {
  /** Validation state and rules from the consolidated useRecoveryValidation hook. */
  validation: ReturnType<typeof useRecoveryValidation>;
}

/**
 * Recovery base query field for non-split mode (full ES|QL editor).
 *
 * Displayed when the recovery type is `query` and no evaluation condition (WHERE clause) exists.
 * Seeds the recovery query from the evaluation query on mount, and validates
 * ES|QL syntax, grouping fields, and that the recovery query differs from evaluation.
 *
 * Validation logic is provided by the `useRecoveryValidation` hook via the
 * `validation` prop. Seeding is handled locally on mount.
 */
export const RecoveryBaseQueryOnlyField: React.FC<RecoveryBaseQueryOnlyFieldProps> = ({
  validation,
}) => {
  const { fullBaseQueryRules, groupingValidationError } = validation;
  const { getValues, setValue } = useFormContext<FormValues>();

  const groupingErrors = useMemo(
    () => (groupingValidationError ? [new Error(groupingValidationError)] : undefined),
    [groupingValidationError]
  );

  const hasSeeded = useRef(false);

  // Seed the recovery base query with the evaluation query on mount when empty
  useEffect(() => {
    if (hasSeeded.current) return;
    hasSeeded.current = true;
    const currentRecoveryQuery = getValues('recoveryPolicy.query.base');
    if (!currentRecoveryQuery) {
      const evaluationQuery = getValues('evaluation.query.base');
      if (evaluationQuery) {
        setValue('recoveryPolicy.query.base', evaluationQuery);
      }
    }
  }, [getValues, setValue]);

  return <RecoveryBaseQueryField rules={fullBaseQueryRules} errors={groupingErrors} />;
};
