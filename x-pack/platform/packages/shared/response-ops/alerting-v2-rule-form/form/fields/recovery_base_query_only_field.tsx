/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useFormContext, useWatch } from 'react-hook-form';
import type { FormValues } from '../types';
import { RecoveryBaseQueryField } from './recovery_base_query_field';

/**
 * Recovery base query field for non-split mode (full ES|QL editor).
 *
 * Wraps `RecoveryBaseQueryField` and adds validation that the recovery query
 * must differ from the full evaluation query (base + condition combined).
 * Used when no evaluation condition (WHERE clause) exists, so the user
 * provides a complete ES|QL recovery query.
 */
export const RecoveryBaseQueryOnlyField: React.FC = () => {
  const { control } = useFormContext<FormValues>();
  const evaluationBase = useWatch({ control, name: 'evaluation.query.base' });
  const evaluationCondition = useWatch({ control, name: 'evaluation.query.condition' });

  // Assemble the full evaluation query for comparison with the recovery query.
  const fullEvaluationQuery = useMemo(() => {
    const base = evaluationBase?.trim() ?? '';
    const condition = evaluationCondition?.trim() ?? '';
    if (!base) return '';
    if (condition) return `${base} | ${condition}`;
    return base;
  }, [evaluationBase, evaluationCondition]);

  // Validate that the recovery query differs from the full evaluation query.
  const validateNotSameAsEvaluation = useCallback(
    (value: string | undefined) => {
      if (!value || !fullEvaluationQuery) return true;
      const normalizedRecovery = value.trim().toLowerCase();
      const normalizedEvaluation = fullEvaluationQuery.trim().toLowerCase();
      if (normalizedRecovery === normalizedEvaluation) {
        return i18n.translate('xpack.alertingV2.ruleForm.recoveryQuerySameAsEvaluation', {
          defaultMessage:
            'Recovery query must differ from the evaluation query. The same query would never recover.',
        });
      }
      return true;
    },
    [fullEvaluationQuery]
  );

  return <RecoveryBaseQueryField additionalValidation={validateNotSameAsEvaluation} />;
};
