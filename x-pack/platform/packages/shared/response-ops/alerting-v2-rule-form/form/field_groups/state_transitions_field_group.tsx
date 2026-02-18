/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiText, EuiSpacer } from '@elastic/eui';
import type { RuleFormServices } from '../rule_form';
import { FieldGroup } from './field_group';
import { RecoveryPolicyField } from '../fields/recovery_policy_field';

interface StateTransitionsFieldGroupProps {
  services: RuleFormServices;
}

export const StateTransitionsFieldGroup: React.FC<StateTransitionsFieldGroupProps> = ({
  services,
}) => {
  return (
    <FieldGroup
      title={i18n.translate('xpack.alertingV2.ruleForm.stateTransitions', {
        defaultMessage: 'State transitions',
      })}
    >
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.alertingV2.ruleForm.stateTransitionsDescription', {
          defaultMessage:
            'Configure how alerts recover from an active state. Choose between automatic recovery when conditions are no longer met, or define a custom recovery query.',
        })}
      </EuiText>
      <EuiSpacer size="m" />
      <RecoveryPolicyField services={services} />
    </FieldGroup>
  );
};
