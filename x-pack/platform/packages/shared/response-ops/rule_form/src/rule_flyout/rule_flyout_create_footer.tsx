/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
} from '@elastic/eui';
import React from 'react';
import {
  RULE_FLYOUT_FOOTER_BACK_TEXT,
  RULE_FLYOUT_FOOTER_CANCEL_TEXT,
  RULE_FLYOUT_FOOTER_CREATE_TEXT,
  RULE_FLYOUT_FOOTER_NEXT_TEXT,
  RULE_PAGE_FOOTER_SHOW_REQUEST_TEXT,
} from '../translations';

export interface RuleFlyoutCreateFooterProps {
  isSaving: boolean;
  hasErrors: boolean;
  onCancel: () => void;
  onSave: () => void;
  onShowRequest: () => void;
  hasNextStep: boolean;
  hasPreviousStep: boolean;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
}
export const RuleFlyoutCreateFooter = ({
  onCancel,
  onSave,
  onShowRequest,
  hasErrors,
  isSaving,
  hasNextStep,
  hasPreviousStep,
  goToNextStep,
  goToPreviousStep,
}: RuleFlyoutCreateFooterProps) => {
  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          {hasPreviousStep ? (
            <EuiButtonEmpty
              data-test-subj="ruleFlyoutFooterPreviousStepButton"
              onClick={goToPreviousStep}
            >
              {RULE_FLYOUT_FOOTER_BACK_TEXT}
            </EuiButtonEmpty>
          ) : (
            <EuiButtonEmpty data-test-subj="ruleFlyoutFooterCancelButton" onClick={onCancel}>
              {RULE_FLYOUT_FOOTER_CANCEL_TEXT}
            </EuiButtonEmpty>
          )}
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="m">
            {!hasNextStep && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="primary"
                  data-test-subj="ruleFlyoutFooterShowRequestButton"
                  isDisabled={isSaving || hasErrors}
                  onClick={onShowRequest}
                >
                  {RULE_PAGE_FOOTER_SHOW_REQUEST_TEXT}
                </EuiButton>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              {hasNextStep ? (
                <EuiButton
                  fill
                  data-test-subj="ruleFlyoutFooterNextStepButton"
                  onClick={goToNextStep}
                >
                  {RULE_FLYOUT_FOOTER_NEXT_TEXT}
                </EuiButton>
              ) : (
                <EuiButton
                  fill
                  data-test-subj="ruleFlyoutFooterSaveButton"
                  type="submit"
                  isDisabled={isSaving || hasErrors}
                  isLoading={isSaving}
                  onClick={onSave}
                >
                  {RULE_FLYOUT_FOOTER_CREATE_TEXT}
                </EuiButton>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};
