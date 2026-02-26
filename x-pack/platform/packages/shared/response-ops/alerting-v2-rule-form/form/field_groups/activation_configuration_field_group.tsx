/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { useFormContext } from 'react-hook-form';
import type { FormValues } from '../types';
import { FieldGroup } from './field_group';
import { ActivationCountField } from '../fields/activation_count_field';
import { ActivationTimeframeField } from '../fields/activation_timeframe_field';

export const ActivationConfigurationFieldGroup: React.FC = () => {
  const { watch } = useFormContext<FormValues>();
  const kind = watch('kind');

  if (kind !== 'alert') {
    return null;
  }

  return (
    <FieldGroup
      title={i18n.translate('xpack.alertingV2.ruleForm.activationConfig.title', {
        defaultMessage: 'Activation configuration',
      })}
    >
      <ActivationCountField />
      <ActivationTimeframeField />
    </FieldGroup>
  );
};
