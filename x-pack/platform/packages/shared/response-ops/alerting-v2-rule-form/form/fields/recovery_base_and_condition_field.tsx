/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { EuiSpacer, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFormContext } from 'react-hook-form';
import type { FormValues } from '../types';
import type { useRecoveryValidation } from '../hooks/use_recovery_validation';
import { WhereClauseEditor } from './where_clause_editor';
import { RecoveryBaseQueryField } from './recovery_base_query_field';

const BASE_QUERY_TOOLTIP = i18n.translate('xpack.alertingV2.ruleForm.recoveryBaseQueryTooltip', {
  defaultMessage:
    'Override the base query used for recovery. By default, the evaluation base query is used.',
});

interface RecoveryBaseAndConditionFieldProps {
  /** Validation state and rules from the consolidated useRecoveryValidation hook. */
  validation: ReturnType<typeof useRecoveryValidation>;
}

/**
 * Recovery condition field for split mode (WHERE clause editing).
 *
 * Displayed when the recovery type is `query` and an evaluation condition (WHERE clause) exists.
 * Provides:
 * - A collapsible "+ Add base recovery query" option to override the base query
 *   (rendered via RecoveryBaseQueryField)
 * - A WHERE clause editor for the recovery condition
 * - Seeds the recovery condition with the evaluation condition on mount when empty
 *
 * Validation logic is provided by the `useRecoveryValidation` hook via the
 * `validation` prop. Seeding and field management are handled locally.
 */
export const RecoveryBaseAndConditionField: React.FC<RecoveryBaseAndConditionFieldProps> = ({
  validation,
}) => {
  const { getValues, setValue } = useFormContext<FormValues>();
  const {
    recoveryBaseQuery,
    evaluationCondition,
    effectiveBaseQuery,
    conditionRules,
    splitBaseQueryRules,
  } = validation;

  // Seed the recovery condition with the evaluation condition on mount when empty
  const hasSeeded = useRef(false);
  useEffect(() => {
    if (hasSeeded.current) return;
    const currentCondition = getValues('recoveryPolicy.query.condition');
    if (!currentCondition && evaluationCondition?.trim()) {
      setValue('recoveryPolicy.query.condition', evaluationCondition);
      hasSeeded.current = true;
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

  return (
    <>
      {isBaseQueryVisible ? (
        <>
          <RecoveryBaseQueryField
            labelTooltip={BASE_QUERY_TOOLTIP}
            rules={splitBaseQueryRules}
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
        labelTooltip={i18n.translate('xpack.alertingV2.ruleForm.recoveryConditionTooltip', {
          defaultMessage:
            'A recovery condition defines when an active alert should be resolved. It is evaluated against the same base query used for evaluation, unless a custom recovery base query is specified.',
        })}
        helpText={i18n.translate('xpack.alertingV2.ruleForm.recoveryConditionHelpText', {
          defaultMessage:
            'Define a WHERE clause condition that determines when an alert should recover. Applied to the evaluation base query.',
        })}
        isOptional={isBaseQueryVisible}
        baseQuery={effectiveBaseQuery}
        dataTestSubj="recoveryConditionWhereClause"
        rules={conditionRules}
      />
    </>
  );
};
