/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useWatch } from 'react-hook-form';
import { EuiFormRow, EuiHorizontalRule, EuiSpacer, EuiSuperSelect, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  ComposeDiscoverAction,
  ComposeDiscoverState,
  CustomRecoveryRenderProps,
  RecoveryType,
} from '../types';
import type { FormValues } from '../../../form/types';
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
  {
    defaultMessage:
      'Define a custom recovery condition. An alert condition is required in your query.',
  }
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

const RECOVERY_TYPE_OPTIONS: Array<{
  value: RecoveryType;
  inputDisplay: string;
  dropdownDisplay: React.ReactNode;
}> = [
  {
    value: 'default',
    inputDisplay: defaultRecoveryLabel,
    dropdownDisplay: (
      <>
        <strong>{defaultRecoveryLabel}</strong>
        <EuiText size="s" color="subdued">
          <p>{defaultRecoveryDescription}</p>
        </EuiText>
      </>
    ),
  },
  {
    value: 'custom',
    inputDisplay: customRecoveryLabel,
    dropdownDisplay: (
      <>
        <strong>{customRecoveryLabel}</strong>
        <EuiText size="s" color="subdued">
          <p>{customRecoveryDescription}</p>
        </EuiText>
      </>
    ),
  },
  {
    value: 'none',
    inputDisplay: noRecoveryLabel,
    dropdownDisplay: (
      <>
        <strong>{noRecoveryLabel}</strong>
        <EuiText size="s" color="subdued">
          <p>{noRecoveryDescription}</p>
        </EuiText>
      </>
    ),
  },
];

interface RecoveryTypeSelectorProps {
  recoveryType: RecoveryType;
  onRecoveryTypeChange: (type: RecoveryType) => void;
  customDisabled?: boolean;
}

const RecoveryTypeSelector: React.FC<RecoveryTypeSelectorProps> = ({
  recoveryType,
  onRecoveryTypeChange,
  customDisabled = false,
}) => {
  const options = customDisabled
    ? RECOVERY_TYPE_OPTIONS.map((opt) =>
        opt.value === 'custom' ? { ...opt, disabled: true } : opt
      )
    : RECOVERY_TYPE_OPTIONS;

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.alertingV2.composeDiscover.recoveryCondition.recoveryTypeLabel',
        {
          defaultMessage: 'Recovery',
        }
      )}
      fullWidth
    >
      <EuiSuperSelect
        compressed
        options={options}
        valueOfSelected={recoveryType}
        onChange={(val) => onRecoveryTypeChange(val as RecoveryType)}
        fullWidth
        data-test-subj="composeDiscoverRecoveryType"
      />
    </EuiFormRow>
  );
};

interface RecoveryConditionStepProps {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  onRecoveryTypeChange: (type: RecoveryType) => void;
  renderCustomRecovery?: (props: CustomRecoveryRenderProps) => React.ReactNode;
}

export function RecoveryConditionStep({
  state,
  dispatch,
  onRecoveryTypeChange,
  renderCustomRecovery,
}: RecoveryConditionStepProps) {
  const query = useWatch<FormValues, 'query'>({ name: 'query' });
  const isQueryStandalone = query.format === 'standalone';

  return (
    <>
      <RecoveryTypeSelector
        recoveryType={state.recoveryType}
        onRecoveryTypeChange={onRecoveryTypeChange}
        customDisabled={isQueryStandalone}
      />

      {state.recoveryType === 'custom' && renderCustomRecovery && (
        <>
          <EuiSpacer size="l" />
          <EuiHorizontalRule margin="none" />
          <EuiSpacer size="m" />
          {/*
           * Mount as an element (not a plain function call) so hook-using
           * recovery content keeps its own fiber when Custom recovery toggles.
           */}
          {React.createElement(renderCustomRecovery, { state, dispatch })}
        </>
      )}

      <EuiSpacer size="m" />
      <RecoveryDelayField />
    </>
  );
}
