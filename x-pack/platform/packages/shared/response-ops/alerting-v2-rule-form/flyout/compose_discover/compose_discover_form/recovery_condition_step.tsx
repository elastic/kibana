/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useWatch } from 'react-hook-form';
import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ComposeDiscoverAction, ComposeDiscoverState, RecoveryType } from '../types';
import type { ComposeFormValues } from '../compose_form_types';
import { QuerySummary } from '../query_summary';
import { RecoveryDelayField } from '../../../form/fields/recovery_delay_field';

const defaultRecoveryLabel = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.composeDiscover.recoveryType.defaultRecovery.dropDownOptionLabel',
  {
    defaultMessage: 'Default recovery',
  }
);

const defaultRecoveryDescription = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.composeDiscover.recoveryType.defaultRecovery.description',
  {
    defaultMessage: 'Recover automatically when the alert condition is no longer met.',
  }
);

const customRecoveryLabel = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.composeDiscover.recoveryType.customRecovery.dropDownOptionLabel',
  {
    defaultMessage: 'Custom recovery',
  }
);

const customRecoveryDescription = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.composeDiscover.recoveryType.customRecovery.description',
  {
    defaultMessage: 'Define a custom recovery condition.',
  }
);

const noRecoveryLabel = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.composeDiscover.recoveryType.noRecovery.dropDownOptionLabel',
  {
    defaultMessage: 'No recovery',
  }
);

const noRecoveryDescription = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.composeDiscover.recoveryType.noRecovery.description',
  {
    defaultMessage: 'Do not recover alerts automatically.',
  }
);

const noRecoveryComingSoonBadgeLabel = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.composeDiscover.recoveryType.noRecovery.comingSoonBadgeLabel',
  {
    defaultMessage: 'Coming soon',
  }
);

const RECOVERY_TYPE_OPTIONS: Array<{
  value: RecoveryType;
  inputDisplay: string;
  dropdownDisplay: React.ReactNode;
  disabled?: boolean;
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
    disabled: true,
    inputDisplay: noRecoveryLabel,
    dropdownDisplay: (
      <>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
          <EuiFlexItem grow={false}>
            <strong>{noRecoveryLabel}</strong>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{noRecoveryComingSoonBadgeLabel}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
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
}

const RecoveryTypeSelector: React.FC<RecoveryTypeSelectorProps> = ({
  recoveryType,
  onRecoveryTypeChange,
}) => (
  <EuiFormRow label="Recovery" fullWidth>
    <EuiSuperSelect
      options={RECOVERY_TYPE_OPTIONS}
      valueOfSelected={recoveryType}
      onChange={(val) => onRecoveryTypeChange(val as RecoveryType)}
      fullWidth
      data-test-subj="composeDiscoverRecoveryType"
    />
  </EuiFormRow>
);

interface RecoveryConditionStepProps {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  onRecoveryTypeChange: (type: RecoveryType) => void;
}

export function RecoveryConditionStep({
  state,
  dispatch,
  onRecoveryTypeChange,
}: RecoveryConditionStepProps) {
  const query = useWatch<ComposeFormValues, 'query'>({ name: 'query' });
  const baseQuery = query?.format === 'composed' ? query.base : '';
  const recoveryBlock = query?.format === 'composed' ? query.blocks.recover ?? '' : '';

  return (
    <>
      <RecoveryTypeSelector
        recoveryType={state.recoveryType}
        onRecoveryTypeChange={onRecoveryTypeChange}
      />

      {state.recoveryType === 'custom' && (
        <>
          <EuiSpacer size="l" />
          <EuiHorizontalRule margin="none" />
          <EuiSpacer size="m" />
          <EuiText size="xs" color="subdued">
            <strong>Base query</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <QuerySummary query={baseQuery} label="base query" />
          <EuiSpacer size="m" />
          <EuiText size="xs" color="subdued">
            <strong>Recovery condition</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <QuerySummary query={recoveryBlock} label="recovery condition" />
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                iconType="editorCodeBlock"
                isDisabled={state.childOpen}
                onClick={() => dispatch({ type: 'OPEN_CHILD_FOR_STEP', step: state.step })}
                data-test-subj="composeDiscoverEditRecovery"
              >
                Edit recovery query
              </EuiButton>
            </EuiFlexItem>
            {recoveryBlock && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="success">Custom condition set</EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </>
      )}

      <EuiSpacer size="m" />
      <RecoveryDelayField />
    </>
  );
}
