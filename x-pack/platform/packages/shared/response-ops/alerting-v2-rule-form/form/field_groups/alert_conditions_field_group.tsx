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
import { useRuleFormServices } from '../contexts';
import { useRecoveryValidation } from '../hooks/use_recovery_validation';
import { AlertDelayField } from '../fields/alert_delay_field';
import { RecoveryDelayField } from '../fields/recovery_delay_field';

/**
 * Alert conditions field group for configuring alert and recovery policies.
 *
 * Displays:
 * - Alert delay (pending state transition: immediate / breaches / duration)
 * - A dropdown to select recovery type (no_breach vs. custom query)
 * - When `query` type is selected:
 *     uses RecoveryBaseQueryOnlyField (full ES|QL editor with "not same as eval" validation)
 * - Recovery delay (recovering state transition: immediate / breaches / duration)
 */
export const AlertConditionsFieldGroup = () => {
  const { control } = useFormContext<FormValues>();
  const { data } = useRuleFormServices();
  const kind = useWatch({ control, name: 'kind' });
  const recoveryType = useWatch({ control, name: 'recoveryPolicy.type' });

  const recoveryValidation = useRecoveryValidation({
    search: data.search.search,
  });

  if (kind !== 'alert') {
    return null;
  }

  return (
    <FieldGroup
      title={i18n.translate('xpack.alertingV2.ruleForm.alertConditions', {
        defaultMessage: 'Alert conditions',
      })}
    >
      <AlertDelayField />
      <EuiSpacer size="m" />
      <RecoveryTypeField />
      {recoveryType === 'query' && (
        <>
          <EuiSpacer size="m" />
          <RecoveryBaseQueryOnlyField validation={recoveryValidation} />
        </>
      )}
      <EuiSpacer size="m" />
      <RecoveryDelayField />
    </FieldGroup>
  );
};
