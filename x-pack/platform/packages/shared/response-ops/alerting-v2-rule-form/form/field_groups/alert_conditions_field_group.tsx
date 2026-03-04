/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFormContext, useWatch } from 'react-hook-form';
import type { FormValues } from '../types';
import { FieldGroup } from './field_group';
import { RecoveryTypeField } from '../fields/recovery_type_field';
import { RecoveryBaseQueryOnlyField } from '../fields/recovery_base_query_only_field';
import { RecoveryBaseAndConditionField } from '../fields/recovery_base_and_condition_field';

/**
 * Alert conditions field group for configuring recovery policy.
 *
 * Displays:
 * - A dropdown to select recovery type (no_breach vs. custom query)
 * - When `query` type is selected:
 *   - If an evaluation condition (WHERE clause) exists:
 *     uses RecoveryBaseAndConditionField (split mode with WHERE clause editor)
 *   - If no evaluation condition exists:
 *     uses RecoveryBaseQueryOnlyField (full ES|QL editor with "not same as eval" validation)
 */
export const AlertConditionsFieldGroup: React.FC = () => {
  const { control } = useFormContext<FormValues>();
  const recoveryType = useWatch({ control, name: 'recoveryPolicy.type' });
  const evaluationCondition = useWatch({ control, name: 'evaluation.query.condition' });

  const hasEvaluationCondition = Boolean(evaluationCondition?.trim());

  return (
    <FieldGroup
      title={i18n.translate('xpack.alertingV2.ruleForm.alertConditions', {
        defaultMessage: 'Alert conditions',
      })}
    >
      <RecoveryTypeField />
      {recoveryType === 'query' && (
        <>
          <EuiSpacer size="m" />
          {hasEvaluationCondition ? (
            <RecoveryBaseAndConditionField />
          ) : (
            <RecoveryBaseQueryOnlyField />
          )}
        </>
      )}
    </FieldGroup>
  );
};
