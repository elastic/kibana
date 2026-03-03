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
import { RecoveryQueryField } from '../fields/recovery_query_field';

/**
 * Alert conditions field group for configuring recovery policy.
 *
 * Displays:
 * - A dropdown to select recovery type (no_breach vs. custom query)
 * - When `query` type is selected, an ES|QL editor for the recovery query
 */
export const AlertConditionsFieldGroup: React.FC = () => {
  const { control } = useFormContext<FormValues>();
  const recoveryType = useWatch({ control, name: 'recoveryPolicy.type' });

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
          <RecoveryQueryField />
        </>
      )}
    </FieldGroup>
  );
};
