/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { useFormContext, useWatch } from 'react-hook-form';
import type { FormValues } from '../types';
import { FieldGroup } from './field_group';
import { StateTransitionCountField } from '../fields/state_transition_count_field';
import { StateTransitionTimeframeField } from '../fields/state_transition_timeframe_field';

export const StateTransitionFieldGroup: React.FC = () => {
  const { control } = useFormContext<FormValues>();
  const kind = useWatch({ control, name: 'kind' });

  if (kind !== 'alert') {
    return null;
  }

  return (
    <FieldGroup
      title={i18n.translate('xpack.alertingV2.ruleForm.stateTransition.title', {
        defaultMessage: 'State transition',
      })}
    >
      <StateTransitionCountField />
      <StateTransitionTimeframeField />
    </FieldGroup>
  );
};
