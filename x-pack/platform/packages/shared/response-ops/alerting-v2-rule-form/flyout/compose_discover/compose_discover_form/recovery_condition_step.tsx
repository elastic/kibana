/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useWatch } from 'react-hook-form';
import {
  EuiFormRow,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ComposeDiscoverAction, ComposeDiscoverState, RecoveryType } from '../types';
import type { RuleBuilderRecoveryProps } from '../rule_builder/types';
import type { ComposeFormValues } from '../compose_form_types';
import { ensureComposedQuery } from '../sandbox_query_utils';
import { EsqlQuerySummarySection } from './esql_query_summary_section';
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
  const query = useWatch<ComposeFormValues, 'query'>({ name: 'query' });
  const composedQuery = query ? ensureComposedQuery(query) : undefined;
  const baseQuery = composedQuery?.base ?? '';
  const recoveryBlock = composedQuery?.recovery?.segment ?? '';

  const isBuilderMode = Boolean(renderBuilderRecovery);
  const hasValidRecoveryBlock = Boolean(recoveryBlock.trim());

  const notDefinedLabel = i18n.translate(
    'xpack.alertingV2.composeDiscover.recoveryCondition.notDefined',
    { defaultMessage: 'Not defined' }
  );

  const openRecoveryEditor = () =>
    dispatch({ type: 'OPEN_CHILD_FOR_STEP', step: state.step, isAlert: true });

  const editRecoveryLabel = i18n.translate(
    'xpack.alertingV2.composeDiscover.recoveryCondition.editRecoveryButtonLabel',
    { defaultMessage: 'Edit recovery query' }
  );

  const recoverySectionTitle = i18n.translate(
    'xpack.alertingV2.composeDiscover.recoveryCondition.recoveryQuerySectionTitle',
    { defaultMessage: 'Recovery condition' }
  );

  const recoverySectionDescription = hasValidRecoveryBlock
    ? i18n.translate(
        'xpack.alertingV2.composeDiscover.recoveryCondition.recoveryConditionDefined',
        { defaultMessage: 'Custom recovery condition defined' }
      )
    : i18n.translate(
        'xpack.alertingV2.composeDiscover.recoveryCondition.startRecoveryDescription',
        { defaultMessage: 'Open the editor to define your recovery condition' }
      );

  return (
    <>
      <RecoveryTypeSelector
        recoveryType={state.recoveryType}
        onRecoveryTypeChange={onRecoveryTypeChange}
      />

      {state.recoveryType === 'custom' && (
        <>
          <EuiSpacer size="m" />

          {isBuilderMode ? (
            renderBuilderRecovery!({
              state,
              dispatch,
            })
          ) : (
            <EsqlQuerySummarySection
              title={recoverySectionTitle}
              description={recoverySectionDescription}
              isEmpty={!hasValidRecoveryBlock && !baseQuery.trim()}
              emptyAction={{
                label: editRecoveryLabel,
                onClick: openRecoveryEditor,
                testSubj: 'composeDiscoverEditRecovery',
                disabled: state.childOpen,
              }}
              blocks={[
                {
                  id: 'base',
                  label: i18n.translate(
                    'xpack.alertingV2.composeDiscover.recoveryCondition.baseQueryLabel',
                    { defaultMessage: 'Base query' }
                  ),
                  query: baseQuery,
                  emptyMessage: notDefinedLabel,
                },
                {
                  id: 'recovery',
                  label: i18n.translate(
                    'xpack.alertingV2.composeDiscover.recoveryCondition.recoveryConditionLabel',
                    { defaultMessage: 'Recovery condition' }
                  ),
                  query: recoveryBlock,
                  emptyMessage: notDefinedLabel,
                },
              ]}
              editButtonLabel={editRecoveryLabel}
              onEdit={openRecoveryEditor}
              editDisabled={state.childOpen}
              editTestSubj="composeDiscoverEditRecovery"
            />
          )}
        </>
      )}

      <EuiSpacer size="m" />
      <RecoveryDelayField />
    </>
  );
}
