/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { FormValues } from '../types';
import { assembleFullQuery } from '../utils/assemble_full_query';
import { usePreview } from './use_preview';
import type { PreviewResult } from './use_preview';

export type { PreviewResult as RecoveryPreviewResult } from './use_preview';

/**
 * Recovery preview hook.
 *
 * Watches the recovery policy form fields and assembles the recovery query
 * using the same logic as `useRecoveryValidation`:
 *
 * - **Split mode** (evaluation has a WHERE condition): The recovery query is
 *   `assembleFullQuery(effectiveBase, recoveryCondition)` where
 *   `effectiveBase` falls back to the evaluation base when no override is set,
 *   and `recoveryCondition` falls back to the evaluation condition when the
 *   user hasn't entered a custom condition yet.  This fallback mirrors the
 *   seeding logic in `RecoveryBaseAndConditionField` but applies synchronously
 *   so the preview never fires a base-only query before the seeding
 *   `useEffect` runs.
 *
 * - **Non-split mode** (no evaluation condition): The recovery query is the
 *   standalone `recoveryPolicy.query.base` value.
 *
 * Delegates to `usePreview` for ES|QL execution and result mapping.
 * Disabled when recovery type is not `'query'`.
 */
export const useRecoveryPreview = (): PreviewResult => {
  const { control } = useFormContext<FormValues>();

  const evaluationBase = useWatch({ control, name: 'evaluation.query.base' });
  const evaluationCondition = useWatch({ control, name: 'evaluation.query.condition' });
  const recoveryBase = useWatch({ control, name: 'recoveryPolicy.query.base' });
  const formRecoveryCondition = useWatch({ control, name: 'recoveryPolicy.query.condition' });
  const recoveryType = useWatch({ control, name: 'recoveryPolicy.type' });
  const timeField = useWatch({ control, name: 'timeField' });
  const lookback = useWatch({ control, name: 'schedule.lookback' });
  const groupingFields = useWatch({ control, name: 'grouping.fields' }) ?? [];

  const hasEvaluationCondition = Boolean(evaluationCondition?.trim());

  // In split mode, fall back to the evaluation condition when the recovery
  // condition hasn't been set yet.  This mirrors the seeding logic in
  // RecoveryBaseAndConditionField, but is applied synchronously so the
  // preview never fires a base-only query before the useEffect seed runs.
  const recoveryCondition = useMemo(() => {
    if (!hasEvaluationCondition) return undefined;
    return formRecoveryCondition?.trim() ? formRecoveryCondition : evaluationCondition;
  }, [hasEvaluationCondition, formRecoveryCondition, evaluationCondition]);

  // Mirror the effective base query logic from useRecoveryValidation
  const effectiveBase = useMemo(() => {
    if (hasEvaluationCondition) {
      return recoveryBase?.trim() ? recoveryBase : evaluationBase || '';
    }
    return '';
  }, [hasEvaluationCondition, recoveryBase, evaluationBase]);

  // Assemble the full recovery query
  const recoveryQuery = useMemo(() => {
    if (hasEvaluationCondition) {
      return assembleFullQuery(effectiveBase, recoveryCondition);
    }
    return recoveryBase?.trim() ?? '';
  }, [hasEvaluationCondition, effectiveBase, recoveryCondition, recoveryBase]);

  return usePreview({
    query: recoveryQuery,
    timeField,
    lookback,
    groupingFields,
    enabled: recoveryType === 'query',
  });
};
