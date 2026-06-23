/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useWatch } from 'react-hook-form';
import type { ComposeDiscoverAction, ComposeDiscoverState, StepDefinition } from './types';
import type { ComposeFormValues } from './compose_form_types';

const CREATE_RULE_BUTTON_LABEL = i18n.translate(
  'xpack.alertingV2.composeDiscover.flyout.createButtonLabel',
  { defaultMessage: 'Create rule' }
);

const SAVE_RULE_BUTTON_LABEL = i18n.translate(
  'xpack.alertingV2.composeDiscover.flyout.saveButtonLabel',
  { defaultMessage: 'Save rule' }
);

const CANCEL_BUTTON_LABEL = i18n.translate(
  'xpack.alertingV2.composeDiscover.flyout.cancelButtonLabel',
  { defaultMessage: 'Cancel' }
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

export interface ComposeDiscoverFooterProps {
  uiState: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  currentStep: StepDefinition | undefined;
  isLastStep: boolean;
  isCreate: boolean;
  hasValidationErrors: boolean;
  isSaving: boolean;
  onNext: () => void;
  onFinalSubmit: () => void;
  onYamlSave: () => void;
  onRequestClose: () => void;
  closeSourceRef: React.MutableRefObject<'button' | 'eui'>;
}

export const ComposeDiscoverFooter = ({
  uiState,
  dispatch,
  currentStep,
  isLastStep,
  isCreate,
  hasValidationErrors,
  isSaving,
  onNext,
  onFinalSubmit,
  onYamlSave,
  onRequestClose,
  closeSourceRef,
}: ComposeDiscoverFooterProps): React.ReactElement => {
  const isAlert = useWatch<ComposeFormValues, 'kind'>({ name: 'kind' }) === 'alert';
  const watchedQuery = useWatch<ComposeFormValues, 'query'>({ name: 'query' });

  const isConditionStep =
    currentStep?.id === 'alertCondition' || currentStep?.id === 'builderCondition';

  /*
   * A committed composed query with neither base nor alert condition — the
   * "Empty query" summary state. Next stays off until a query is entered.
   */
  const emptyComposedQuery =
    currentStep?.id === 'alertCondition' &&
    isAlert &&
    uiState.queryCommitted &&
    watchedQuery.format === 'composed' &&
    !watchedQuery.base.trim() &&
    !watchedQuery.breach.segment.trim();

  const nextDisabled =
    uiState.childOpen ||
    hasValidationErrors ||
    (isConditionStep && !uiState.queryCommitted) ||
    emptyComposedQuery;

  const getNextTooltip = (): string | undefined => {
    if (hasValidationErrors) return VALIDATION_ERRORS_NEXT_TOOLTIP;
    if (isConditionStep && !uiState.queryCommitted) return NEXT_DISABLED_TOOLTIP;
    if (emptyComposedQuery) return NEXT_DISABLED_TOOLTIP;
    return undefined;
  };

  const submitDisabled = hasValidationErrors;
  const submitLabel = isCreate ? CREATE_RULE_BUTTON_LABEL : SAVE_RULE_BUTTON_LABEL;

  if (uiState.yamlMode) {
    return (
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={onYamlSave}
              isLoading={isSaving}
              isDisabled={submitDisabled}
              data-test-subj="composeDiscoverYamlSubmit"
            >
              {submitLabel}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    );
  }

  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={() => {
              closeSourceRef.current = 'button';
              onRequestClose();
            }}
            data-test-subj="composeDiscoverCancel"
          >
            {CANCEL_BUTTON_LABEL}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" responsive={false}>
            {uiState.step > 0 && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="arrowLeft"
                  isDisabled={uiState.childOpen}
                  onClick={() => dispatch({ type: 'GO_BACK' })}
                  data-test-subj="composeDiscoverBack"
                >
                  {BACK_BUTTON_LABEL}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
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
                    fill
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
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};
