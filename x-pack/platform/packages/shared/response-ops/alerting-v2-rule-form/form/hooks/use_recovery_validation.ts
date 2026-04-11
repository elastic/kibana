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
import { assembleFullQuery } from '../utils/assemble_full_query';
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
 * - Grouping field validation (all group-by fields present in assembled recovery query)
 * - "Must differ from evaluation" validation
 * - "At least one of base or condition" validation (split mode)
 *
 * Returns validation rule objects that can be passed directly to form field `Controller` rules,
 * display errors, and computed state.
 *
 * **Split mode** (evaluation has a WHERE condition): The user edits a recovery WHERE clause
 * and optionally overrides the base query. Validation ensures at least one of base or condition
 * is defined, the assembled recovery query differs from evaluation, and grouping fields are present.
 *
 * **Non-split mode** (no evaluation condition): The user provides a full recovery ES|QL query.
 * Validation ensures ES|QL syntax is valid, query differs from evaluation, and grouping
 * fields are present.
 */
export const useRecoveryValidation = ({ search }: UseRecoveryValidationProps) => {
  const { control } = useFormContext<FormValues>();

  // Watch all relevant fields
  const evaluationBaseQuery = useWatch({ control, name: 'evaluation.query.base' });
  const evaluationCondition = useWatch({ control, name: 'evaluation.query.condition' });
  const recoveryBaseQuery = useWatch({ control, name: 'recoveryPolicy.query.base' });
  const recoveryCondition = useWatch({ control, name: 'recoveryPolicy.query.condition' });

  const hasEvaluationCondition = Boolean(evaluationCondition?.trim());

  const effectiveBaseQuery = useMemo(() => {
    if (hasEvaluationCondition) {
      return recoveryBaseQuery?.trim() ? recoveryBaseQuery : evaluationBaseQuery || '';
    }
    return '';
  }, [hasEvaluationCondition, recoveryBaseQuery, evaluationBaseQuery]);

  // Assemble full queries from base + condition
  const assembledEvaluationQuery = useMemo(
    () => assembleFullQuery(evaluationBaseQuery, evaluationCondition),
    [evaluationBaseQuery, evaluationCondition]
  );

  const assembledRecoveryQuery = useMemo(
    () =>
      assembleFullQuery(
        hasEvaluationCondition ? effectiveBaseQuery : recoveryBaseQuery, // use effective base query if evaluation has a condition, otherwise use recovery base query
        hasEvaluationCondition ? recoveryCondition : undefined // use recovery condition if evaluation has a condition, otherwise use undefined
      ),
    [hasEvaluationCondition, effectiveBaseQuery, recoveryBaseQuery, recoveryCondition]
  );

  const recoveryMatchesEvaluation = useMemo(() => {
    if (!assembledRecoveryQuery || !assembledEvaluationQuery) return false;
    return (
      assembledRecoveryQuery.trim().toLowerCase() === assembledEvaluationQuery.trim().toLowerCase()
    );
  }, [assembledRecoveryQuery, assembledEvaluationQuery]);

  // Validate grouping fields are present in the assembled recovery query
  const { validationError: groupingValidationError } = useRecoveryQueryGroupingValidation({
    control,
    search,
    query: assembledRecoveryQuery,
  });

  // --- Validation rules ---

  // Non-split mode: full recovery base query rules (required + syntax + grouping + differs)
  const fullBaseQueryRules = useMemo(
    () => ({
      required: i18n.translate('xpack.alertingV2.ruleForm.recoveryQueryRequired', {
        defaultMessage: 'Recovery query is required when using a custom recovery condition.',
      }),
      validate: (value: string | undefined) => {
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

  // Split mode: optional recovery base query rules (syntax only)
  const splitBaseQueryRules = useMemo(
    () => ({
      validate: (value: string | undefined) => {
        if (!value) return true;
        const syntaxError = validateEsqlQuery(value);
        if (syntaxError) return syntaxError;
        return true;
      },
    }),
    []
  );

  // Split mode: recovery condition rules (at least one + differs + grouping)
  const conditionRules = useMemo(
    () => ({
      validate: (value: string | undefined) => {
        const hasCondition = Boolean(value?.trim());
        const hasBase = Boolean(recoveryBaseQuery?.trim());

        // At least one of base or condition must be specified
        if (!hasBase && !hasCondition) {
          return i18n.translate('xpack.alertingV2.ruleForm.recoveryQueryOrConditionRequired', {
            defaultMessage: 'Either a recovery base query or recovery condition must be specified.',
          });
        }

        // Assembled recovery query must differ from evaluation
        if (recoveryMatchesEvaluation) return QUERIES_MATCH_ERROR;

        // Grouping fields validation
        if (groupingValidationError) return groupingValidationError;

        return true;
      },
    }),
    [recoveryBaseQuery, recoveryMatchesEvaluation, groupingValidationError]
  );

  return {
    // Computed state
    hasEvaluationCondition,
    effectiveBaseQuery,
    assembledEvaluationQuery,
    assembledRecoveryQuery,
    recoveryMatchesEvaluation,

    // Watched values
    evaluationBaseQuery,
    evaluationCondition,
    recoveryBaseQuery,
    recoveryCondition,

    // Grouping validation
    groupingValidationError,

    // Validation rules (for Controller `rules` prop)
    fullBaseQueryRules,
    splitBaseQueryRules,
    conditionRules,
  };
};
