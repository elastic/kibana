/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { EuiSpacer, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFormContext, useWatch } from 'react-hook-form';
import type { FormValues } from '../types';
import { WhereClauseEditor } from './where_clause_editor';
import { RecoveryBaseQueryField } from './recovery_base_query_field';
import { useRuleFormServices } from '../contexts';
import { useRecoveryQueryValidation } from '../hooks/use_recovery_query_validation';

const BASE_QUERY_TOOLTIP = i18n.translate('xpack.alertingV2.ruleForm.recoveryBaseQueryTooltip', {
  defaultMessage:
    'Override the base query used for recovery. By default, the evaluation base query is used.',
});

/**
 * Recovery condition field for split mode (WHERE clause editing).
 *
 * Displayed when the recovery type is `query` and an evaluation condition (WHERE clause) exists.
 * Provides:
 * - A collapsible "+ Add base recovery query" option to override the base query
 *   (rendered via RecoveryBaseQueryField with seeding/grouping validation disabled)
 * - A WHERE clause editor for the recovery condition
 * - Validation: at least one of base or condition must be specified,
 *   condition must differ from evaluation condition, and grouping fields must be present
 * - Seeds the recovery condition with the evaluation condition on mount when empty
 */
export const RecoveryBaseAndConditionField: React.FC = () => {
  const { control, getValues, setValue } = useFormContext<FormValues>();
  const { data } = useRuleFormServices();
  const evaluationBaseQuery = useWatch({ control, name: 'evaluation.query.base' });
  const evaluationCondition = useWatch({ control, name: 'evaluation.query.condition' });
  const recoveryBaseQuery = useWatch({ control, name: 'recoveryPolicy.query.base' });
  const recoveryCondition = useWatch({ control, name: 'recoveryPolicy.query.condition' });

  // Assemble the full recovery query (base + condition) for grouping validation.
  // The condition is stored as "WHERE <expr>", so we join with " | " to form valid ES|QL.
  const assembledRecoveryQuery = useMemo(() => {
    const effectiveBase = recoveryBaseQuery?.trim() ? recoveryBaseQuery : evaluationBaseQuery || '';
    if (!effectiveBase) return '';
    if (recoveryCondition?.trim()) {
      return `${effectiveBase} | ${recoveryCondition}`;
    }
    return effectiveBase;
  }, [recoveryBaseQuery, evaluationBaseQuery, recoveryCondition]);

  // Validate that the assembled recovery query includes all grouping fields
  const { validationError: groupingValidationError } = useRecoveryQueryValidation({
    control,
    search: data.search.search,
    query: assembledRecoveryQuery,
  });

  // Seed the recovery condition with the evaluation condition on mount when empty
  const hasSeededCondition = useRef(false);
  useEffect(() => {
    if (hasSeededCondition.current) return;
    const currentCondition = getValues('recoveryPolicy.query.condition');
    if (!currentCondition && evaluationCondition?.trim()) {
      setValue('recoveryPolicy.query.condition', evaluationCondition);
      hasSeededCondition.current = true;
    }
  }, [evaluationCondition, getValues, setValue]);

  // Track whether the custom recovery base query editor is visible
  const [isBaseQueryVisible, setIsBaseQueryVisible] = useState(() =>
    Boolean(recoveryBaseQuery?.trim())
  );

  // Show the editor if the recovery base query changes externally (e.g., form reset)
  useEffect(() => {
    if (recoveryBaseQuery?.trim() && !isBaseQueryVisible) {
      setIsBaseQueryVisible(true);
    }
  }, [recoveryBaseQuery, isBaseQueryVisible]);

  const handleAddBaseQuery = useCallback(() => {
    // Pre-fill the recovery base query with the evaluation base query
    const currentEvaluationBase = getValues('evaluation.query.base');
    if (currentEvaluationBase) {
      setValue('recoveryPolicy.query.base', currentEvaluationBase);
    }
    setIsBaseQueryVisible(true);
  }, [getValues, setValue]);

  const handleRemoveBaseQuery = useCallback(() => {
    setValue('recoveryPolicy.query.base', undefined);
    setIsBaseQueryVisible(false);
  }, [setValue]);

  // Validate that the recovery condition differs from the evaluation condition,
  // that at least one of base or condition is specified, and that grouping fields
  // are present in the assembled recovery query.
  const recoveryConditionRules = useMemo(
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

        if (value && evaluationCondition) {
          const normalizedRecovery = value.trim().toLowerCase();
          const normalizedEvaluation = evaluationCondition.trim().toLowerCase();
          if (normalizedRecovery === normalizedEvaluation) {
            return i18n.translate('xpack.alertingV2.ruleForm.recoveryConditionSameAsEvaluation', {
              defaultMessage:
                'Recovery condition must differ from the evaluation condition. The same condition would never recover.',
            });
          }
        }

        // Block submission if grouping fields are missing from the assembled query
        if (groupingValidationError) return groupingValidationError;

        return true;
      },
    }),
    [evaluationCondition, recoveryBaseQuery, groupingValidationError]
  );

  return (
    <>
      {isBaseQueryVisible ? (
        <>
          <RecoveryBaseQueryField
            labelTooltip={BASE_QUERY_TOOLTIP}
            required={false}
            seedFromEvaluation={false}
            validateGrouping={false}
            dataTestSubj="recoveryBaseQueryField"
          />
          <EuiButtonEmpty
            iconType="minusInCircle"
            onClick={handleRemoveBaseQuery}
            size="xs"
            data-test-subj="removeRecoveryBaseQueryButton"
            color="text"
          >
            {i18n.translate('xpack.alertingV2.ruleForm.removeRecoveryBaseQueryButton', {
              defaultMessage: 'Remove base recovery query',
            })}
          </EuiButtonEmpty>
          <EuiSpacer size="m" />
        </>
      ) : (
        <>
          <EuiButtonEmpty
            iconType="plusInCircle"
            onClick={handleAddBaseQuery}
            size="xs"
            data-test-subj="addRecoveryBaseQueryButton"
            color="text"
          >
            {i18n.translate('xpack.alertingV2.ruleForm.addRecoveryBaseQueryButton', {
              defaultMessage: 'Add base recovery query',
            })}
          </EuiButtonEmpty>
          <EuiSpacer size="s" />
        </>
      )}
      <WhereClauseEditor
        name="recoveryPolicy.query.condition"
        label={i18n.translate('xpack.alertingV2.ruleForm.recoveryConditionLabel', {
          defaultMessage: 'Recovery condition',
        })}
        helpText={i18n.translate('xpack.alertingV2.ruleForm.recoveryConditionHelpText', {
          defaultMessage:
            'Define a WHERE clause condition that determines when an alert should recover. Applied to the evaluation base query.',
        })}
        services={{ search: data.search.search }}
        baseQuery={recoveryBaseQuery?.trim() ? recoveryBaseQuery : evaluationBaseQuery || ''}
        dataTestSubj="recoveryConditionWhereClause"
        rules={recoveryConditionRules}
      />
    </>
  );
};
