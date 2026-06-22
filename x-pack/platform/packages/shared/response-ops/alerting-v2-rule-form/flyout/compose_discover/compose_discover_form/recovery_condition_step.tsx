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
import { FormattedMessage } from '@kbn/i18n-react';
import type { ComposeDiscoverAction, ComposeDiscoverState, RecoveryType } from '../types';
import type { RuleBuilderRecoveryProps } from '../rule_builder/types';
import type { FormValues } from '../../../form/types';
import { QuerySummary } from '../query_summary';
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
];

interface RecoveryTypeSelectorProps {
  recoveryType: RecoveryType;
  onRecoveryTypeChange: (type: RecoveryType) => void;
}

const RecoveryTypeSelector: React.FC<RecoveryTypeSelectorProps> = ({
  recoveryType,
  onRecoveryTypeChange,
}) => (
  <EuiFormRow
    label={i18n.translate('xpack.alertingV2.composeDiscover.recoveryCondition.recoveryTypeLabel', {
      defaultMessage: 'Recovery',
    })}
    fullWidth
  >
    <EuiSuperSelect
      compressed
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
  renderBuilderRecovery?: (props: RuleBuilderRecoveryProps) => React.ReactNode;
}

export function RecoveryConditionStep({
  state,
  dispatch,
  onRecoveryTypeChange,
  renderBuilderRecovery,
}: RecoveryConditionStepProps) {
  const query = useWatch<FormValues, 'query'>({ name: 'query' });
  const baseQuery = query?.format === 'composed' ? query.base : '';
  const recoveryBlock = query?.format === 'composed' ? query.recovery?.segment ?? '' : '';

  const isBuilderMode = Boolean(renderBuilderRecovery);
  const hasValidRecoveryBlock = Boolean(recoveryBlock.trim());

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

          {isBuilderMode ? (
            renderBuilderRecovery!({
              state,
              dispatch,
            })
          ) : (
            <>
              <EuiText size="xs" color="subdued">
                <strong>
                  <FormattedMessage
                    id="xpack.alertingV2.composeDiscover.recoveryCondition.baseQueryLabel"
                    defaultMessage="Base query"
                  />
                </strong>
              </EuiText>
              <EuiSpacer size="xs" />
              <QuerySummary
                query={baseQuery}
                emptyMessage={i18n.translate(
                  'xpack.alertingV2.composeDiscover.recoveryCondition.noBaseQueryDefined',
                  { defaultMessage: 'No base query defined' }
                )}
              />
              <EuiSpacer size="m" />
              <EuiText size="xs" color="subdued">
                <strong>
                  <FormattedMessage
                    id="xpack.alertingV2.composeDiscover.recoveryCondition.recoveryConditionLabel"
                    defaultMessage="Recovery condition"
                  />
                </strong>
              </EuiText>
              <EuiSpacer size="xs" />
              <QuerySummary
                query={recoveryBlock}
                emptyMessage={i18n.translate(
                  'xpack.alertingV2.composeDiscover.recoveryCondition.noRecoveryConditionDefined',
                  { defaultMessage: 'No recovery condition defined' }
                )}
              />
              <EuiSpacer size="s" />
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    iconType="editorCodeBlock"
                    isDisabled={state.childOpen}
                    onClick={() =>
                      dispatch({ type: 'OPEN_CHILD_FOR_STEP', step: state.step, isAlert: true })
                    }
                    data-test-subj="composeDiscoverEditRecovery"
                  >
                    <FormattedMessage
                      id="xpack.alertingV2.composeDiscover.recoveryCondition.editRecoveryButtonLabel"
                      defaultMessage="Edit recovery query"
                    />
                  </EuiButton>
                </EuiFlexItem>
                {hasValidRecoveryBlock && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="success">
                      <FormattedMessage
                        id="xpack.alertingV2.composeDiscover.recoveryCondition.customConditionSetBadgeLabel"
                        defaultMessage="Custom condition set"
                      />
                    </EuiBadge>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </>
          )}
        </>
      )}

      <EuiSpacer size="m" />
      <RecoveryDelayField />
    </>
  );
}
