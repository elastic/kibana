/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiFlyoutFooter, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useWatch } from 'react-hook-form';
import type { ComposeDiscoverAction, ComposeDiscoverState, StepDefinition } from './types';
import { isAlertConditionStepId, isBuilderConditionStepId } from './types';
import type { FormValues } from '../../form/types';
import { isCommittedQueryValid } from './validation/committed_query_validation';

const CREATE_RULE_BUTTON_LABEL = i18n.translate(
  'xpack.alertingV2.composeDiscover.flyout.createButtonLabel',
  { defaultMessage: 'Create rule' }
);

const SAVE_RULE_BUTTON_LABEL = i18n.translate(
  'xpack.alertingV2.composeDiscover.flyout.saveButtonLabel',
  { defaultMessage: 'Save rule' }
);

const BACK_BUTTON_LABEL = i18n.translate(
  'xpack.alertingV2.composeDiscover.flyout.backButtonLabel',
  { defaultMessage: 'Back' }
);

const NEXT_BUTTON_LABEL = i18n.translate(
  'xpack.alertingV2.composeDiscover.flyout.nextButtonLabel',
  { defaultMessage: 'Next' }
);

const NEXT_DISABLED_TOOLTIP = i18n.translate(
  'xpack.alertingV2.composeDiscover.flyout.nextDisabledTooltip',
  { defaultMessage: 'Define a query in the editor before continuing' }
);

const VALIDATION_ERRORS_NEXT_TOOLTIP = i18n.translate(
  'xpack.alertingV2.composeDiscover.flyout.validationErrorsNextTooltip',
  { defaultMessage: 'Resolve ES|QL control placeholders before continuing' }
);

const TIME_FIELD_UNRESOLVED_NEXT_TOOLTIP = i18n.translate(
  'xpack.alertingV2.composeDiscover.flyout.timeFieldUnresolvedNextTooltip',
  { defaultMessage: 'Select a time field before continuing' }
);

export interface ComposeDiscoverFooterProps {
  uiState: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  currentStep: StepDefinition | undefined;
  isLastStep: boolean;
  isCreate: boolean;
  hasValidationErrors: boolean;
  yamlHasErrors: boolean;
  isBuilderMode: boolean;
  isBuilderStepValid: boolean;
  isSaving: boolean;
  onNext: () => void;
  onFinalSubmit: () => void;
  onYamlSave: () => void;
}

export const ComposeDiscoverFooter = ({
  uiState,
  dispatch,
  currentStep,
  isLastStep,
  isCreate,
  hasValidationErrors,
  yamlHasErrors,
  isBuilderMode,
  isBuilderStepValid,
  isSaving,
  onNext,
  onFinalSubmit,
  onYamlSave,
}: ComposeDiscoverFooterProps): React.ReactElement => {
  const watchedQuery = useWatch<FormValues, 'query'>({ name: 'query' });
  const watchedTimeField = useWatch<FormValues, 'timeField'>({ name: 'timeField' });

  const isBuilderStep = currentStep ? isBuilderConditionStepId(currentStep.id) : false;
  const isConditionStep = currentStep ? isAlertConditionStepId(currentStep.id) : false;

  /*
   * The Alert Condition form step exposes the time-field select. When the source
   * index has no resolvable date field, resolution clears the
   * value, so an empty `timeField` means the rule can't run its lookback window —
   * block Next until one is selected.
   */
  const timeFieldUnresolved = currentStep?.id === 'alertCondition' && !watchedTimeField;

  const invalidCommittedQuery =
    isConditionStep &&
    !isBuilderStep &&
    !isCommittedQueryValid(watchedQuery, uiState.queryCommitted);

  const nextDisabled =
    (!isBuilderMode && uiState.childOpen) ||
    hasValidationErrors ||
    (isConditionStep && !isBuilderStep && !uiState.queryCommitted) ||
    (isBuilderStep && !isBuilderStepValid) ||
    invalidCommittedQuery ||
    timeFieldUnresolved;

  const getNextTooltip = (): string | undefined => {
    if (hasValidationErrors) return VALIDATION_ERRORS_NEXT_TOOLTIP;
    if (isConditionStep && !uiState.queryCommitted) return NEXT_DISABLED_TOOLTIP;
    if (invalidCommittedQuery) return NEXT_DISABLED_TOOLTIP;
    if (timeFieldUnresolved) return TIME_FIELD_UNRESOLVED_NEXT_TOOLTIP;
    return undefined;
  };

  const submitDisabled =
    hasValidationErrors || !isCommittedQueryValid(watchedQuery, uiState.queryCommitted);
  const submitLabel = isCreate ? CREATE_RULE_BUTTON_LABEL : SAVE_RULE_BUTTON_LABEL;

  if (uiState.yamlMode) {
    /*
     * Gate YAML Save on validity only, not the form-shape `submitDisabled`, so
     * non-representable rules (e.g. alert + standalone) stay savable — they never
     * produce a 'success' summary state.
     */
    const yamlSaveDisabled = hasValidationErrors || yamlHasErrors;
    const yamlSaveDisabledTooltip = yamlHasErrors
      ? i18n.translate('xpack.alertingV2.composeDiscover.flyout.yamlSaveDisabledTooltip', {
          defaultMessage: 'Fix the errors highlighted in the YAML editor, then save the rule.',
        })
      : undefined;
    return (
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiToolTip content={yamlSaveDisabledTooltip}>
              <EuiButton
                fill
                onClick={onYamlSave}
                isLoading={isSaving}
                isDisabled={yamlSaveDisabled}
                data-test-subj="composeDiscoverYamlSubmit"
              >
                {submitLabel}
              </EuiButton>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    );
  }

  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        {/* Back sits far-left; when absent (step 0) the empty item keeps Next flush-right. */}
        <EuiFlexItem grow={false}>
          {uiState.step > 0 && (
            <EuiButton
              color="text"
              iconType="arrowLeft"
              isDisabled={!isBuilderMode && uiState.childOpen}
              onClick={() => dispatch({ type: 'GO_BACK', isBuilderMode })}
              data-test-subj="composeDiscoverBack"
            >
              {BACK_BUTTON_LABEL}
            </EuiButton>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {isLastStep ? (
            <EuiButton
              fill
              isLoading={isSaving}
              isDisabled={submitDisabled}
              onClick={onFinalSubmit}
              data-test-subj="composeDiscoverSubmit"
            >
              {submitLabel}
            </EuiButton>
          ) : (
            <EuiToolTip content={getNextTooltip()}>
              <EuiButton
                color="text"
                iconType="arrowRight"
                iconSide="right"
                isDisabled={nextDisabled}
                onClick={onNext}
                data-test-subj="composeDiscoverNext"
              >
                {NEXT_BUTTON_LABEL}
              </EuiButton>
            </EuiToolTip>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};
