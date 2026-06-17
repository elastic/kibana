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
import { AlertDelayField } from '../fields/alert_delay_field';
import { RecoveryDelayField } from '../fields/recovery_delay_field';

/**
 * Alert conditions field group for configuring alert timing.
 *
 * Displays:
 * - Alert delay (pending state transition: immediate / breaches / duration)
 * - Recovery delay (recovering state transition: immediate / recoveries / duration)
 */
export const AlertConditionsFieldGroup = () => {
  const { control } = useFormContext<FormValues>();
  const kind = useWatch({ control, name: 'kind' });

  if (kind !== 'alert') {
    return null;
  }

  return (
    <FieldGroup
      title={i18n.translate('xpack.alertingV2.ruleForm.alertConditions', {
        defaultMessage: 'Alert conditions',
      })}
      defaultOpen
    >
      <AlertDelayField />
      <EuiSpacer size="m" />
      <RecoveryDelayField />
    </FieldGroup>
  );
};
