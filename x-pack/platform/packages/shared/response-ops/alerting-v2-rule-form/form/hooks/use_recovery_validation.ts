/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useFormContext, useWatch } from 'react-hook-form';
import { validateEsqlQuery } from '@kbn/alerting-v2-schemas';
import type { ISearchGeneric } from '@kbn/search-types';
import type { FormValues } from '../types';
import { useRecoveryQueryGroupingValidation } from './use_recovery_query_grouping_validation';

interface UseRecoveryValidationProps {
  /** Search service for fetching query columns */
  search: ISearchGeneric;
}

const QUERIES_MATCH_ERROR = i18n.translate(
  'xpack.alertingV2.ruleForm.recoveryQuerySameAsEvaluation',
  {
    defaultMessage:
      'Recovery query must differ from the evaluation query. The same query would never recover.',
  }
);

/**
 * Consolidated recovery validation hook.
 *
 * Encapsulates ALL recovery validation logic in one place:
 * - ES|QL syntax validation for recovery queries
 * - Grouping field validation (all group-by fields present in recovery query)
 * - "Must differ from evaluation" validation
 *
 * The condition field is intentionally ignored — both evaluation and recovery
 * queries are validated using only their base query values.
 */
export const useRecoveryValidation = ({ search }: UseRecoveryValidationProps) => {
  const { control } = useFormContext<FormValues>();

  // Watch all relevant fields
  const evaluationBaseQuery = useWatch({ control, name: 'evaluation.query.base' });
  const recoveryBaseQuery = useWatch({ control, name: 'recoveryPolicy.query.base' });

  const recoveryMatchesEvaluation = useMemo(() => {
    if (!recoveryBaseQuery || !evaluationBaseQuery) return false;
    return recoveryBaseQuery.trim().toLowerCase() === evaluationBaseQuery.trim().toLowerCase();
  }, [recoveryBaseQuery, evaluationBaseQuery]);

  const { validationError: groupingValidationError } = useRecoveryQueryGroupingValidation({
    control,
    search,
    query: recoveryBaseQuery ?? '',
  });

  // --- Validation rules ---

  const fullBaseQueryRules = useMemo(
    () => ({
      required: i18n.translate('xpack.alertingV2.ruleForm.recoveryQueryRequired', {
        defaultMessage: 'Recovery query is required when using a custom recovery condition.',
      }),
      validate: (value: string | null | undefined) => {
        if (!value) return true;

        // ES|QL syntax validation
        const syntaxError = validateEsqlQuery(value);
        if (syntaxError) return syntaxError;

        // Grouping fields validation
        if (groupingValidationError) return groupingValidationError;

        // Must differ from evaluation query
        if (recoveryMatchesEvaluation) return QUERIES_MATCH_ERROR;

        return true;
      },
    }),
    [groupingValidationError, recoveryMatchesEvaluation]
  );

  return {
    evaluationBaseQuery,
    recoveryBaseQuery,
    recoveryMatchesEvaluation,
    groupingValidationError,
    fullBaseQueryRules,
  };
};
