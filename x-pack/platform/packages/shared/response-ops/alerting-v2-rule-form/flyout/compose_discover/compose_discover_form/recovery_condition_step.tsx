/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { EuiFormRow, EuiHorizontalRule, EuiSpacer, EuiSuperSelect, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { recoveryStrategy } from '@kbn/alerting-v2-schemas';
import type {
  ComposeDiscoverAction,
  ComposeDiscoverState,
  CustomRecoveryRenderProps,
} from '../types';
import type { FormValues, RecoveryStrategy } from '../../../form/types';
import { RecoveryDelayField } from '../../../form/fields/recovery_delay_field';

const defaultRecoveryLabel = i18n.translate(
  'xpack.alertingV2.composeDiscover.recoveryCondition.defaultRecoveryDropDownOptionLabel',
  { defaultMessage: 'Default recovery' }
);

const defaultRecoveryDescription = i18n.translate(
  'xpack.alertingV2.composeDiscover.recoveryCondition.defaultRecoveryDescription',
  { defaultMessage: 'Recover automatically when the alert condition is no longer met.' }
);

const customRecoveryLabel = i18n.translate(
  'xpack.alertingV2.composeDiscover.recoveryCondition.customRecoveryDropDownOptionLabel',
  { defaultMessage: 'Custom recovery' }
);

const customRecoveryDescription = i18n.translate(
  'xpack.alertingV2.composeDiscover.recoveryCondition.customRecoveryDescription',
  { defaultMessage: 'Define a custom recovery condition.' }
);

const noRecoveryLabel = i18n.translate(
  'xpack.alertingV2.composeDiscover.recoveryCondition.noRecoveryDropDownOptionLabel',
  { defaultMessage: 'No recovery' }
);

const noRecoveryDescription = i18n.translate(
  'xpack.alertingV2.composeDiscover.recoveryCondition.noRecoveryDescription',
  {
    defaultMessage: 'Alerts will stay active even when the alert condition is no longer met.',
  }
);

export const RECOVERY_CONDITION_REQUIRES_BREACH_ERROR = i18n.translate(
  'xpack.alertingV2.composeDiscover.recoveryCondition.requiresAlertConditionError',
  {
    defaultMessage:
      'A custom recovery condition requires an alert condition. Without one, every row of the base query breaches and the alert could never recover.',
  }
);

const buildOption = (value: RecoveryStrategy, label: string, description: string) => ({
  value,
  inputDisplay: label,
  dropdownDisplay: (
    <>
      <strong>{label}</strong>
      <EuiText size="s" color="subdued">
        <p>{description}</p>
      </EuiText>
    </>
  ),
});

/** `query` is deliberately absent — the form has no editor for a full independent recovery query. */
const RECOVERY_TYPE_OPTIONS = [
  buildOption(recoveryStrategy.no_breach, defaultRecoveryLabel, defaultRecoveryDescription),
  buildOption(recoveryStrategy.condition, customRecoveryLabel, customRecoveryDescription),
  buildOption(recoveryStrategy.manual, noRecoveryLabel, noRecoveryDescription),
];

interface RecoveryTypeSelectorProps {
  strategy: RecoveryStrategy;
  error?: string;
  onRecoveryTypeChange: (strategy: RecoveryStrategy) => void;
}

const RecoveryTypeSelector: React.FC<RecoveryTypeSelectorProps> = ({
  strategy,
  error,
  onRecoveryTypeChange,
}) => (
  <EuiFormRow
    label={i18n.translate('xpack.alertingV2.composeDiscover.recoveryCondition.recoveryTypeLabel', {
      defaultMessage: 'Recovery',
    })}
    isInvalid={Boolean(error)}
    error={error}
    fullWidth
  >
    <EuiSuperSelect
      compressed
      options={RECOVERY_TYPE_OPTIONS}
      valueOfSelected={strategy}
      onChange={onRecoveryTypeChange}
      isInvalid={Boolean(error)}
      fullWidth
      data-test-subj="composeDiscoverRecoveryType"
    />
  </EuiFormRow>
);

interface RecoveryConditionStepProps {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  onRecoveryTypeChange: (strategy: RecoveryStrategy) => void;
  renderCustomRecovery?: (props: CustomRecoveryRenderProps) => React.ReactNode;
}

export function RecoveryConditionStep({
  state,
  dispatch,
  onRecoveryTypeChange,
  renderCustomRecovery,
}: RecoveryConditionStepProps) {
  const { control, getValues } = useFormContext<FormValues>();
  const {
    field: { value: recovery },
    fieldState: { error },
  } = useController<FormValues, 'recovery'>({
    name: 'recovery',
    control,
    rules: {
      validate: (value) =>
        value?.strategy !== recoveryStrategy.condition ||
        Boolean(getValues('query').breach.segment.trim()) ||
        RECOVERY_CONDITION_REQUIRES_BREACH_ERROR,
    },
  });

  const strategy = recovery?.strategy ?? recoveryStrategy.manual;
  const isCustom = strategy === recoveryStrategy.condition;

  return (
    <>
      <RecoveryTypeSelector
        strategy={strategy}
        error={error?.message}
        onRecoveryTypeChange={onRecoveryTypeChange}
      />

      {isCustom && renderCustomRecovery && (
        <>
          <EuiSpacer size="l" />
          <EuiHorizontalRule margin="none" />
          <EuiSpacer size="m" />
          {React.createElement(renderCustomRecovery, { state, dispatch })}
        </>
      )}

      {strategy !== recoveryStrategy.manual && (
        <>
          <EuiSpacer size="m" />
          <RecoveryDelayField />
        </>
      )}
    </>
  );
}
