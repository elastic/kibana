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
  RULE_FLYOUT_FOOTER_CANCEL_TEXT,
  RULE_FLYOUT_FOOTER_SAVE_TEXT,
  RULE_PAGE_FOOTER_SHOW_REQUEST_TEXT,
} from '../translations';

export interface RuleFlyoutEditFooterProps {
  isSaving: boolean;
  hasErrors: boolean;
  onCancel: () => void;
  onSave: () => void;
  onShowRequest: () => void;
}
export const RuleFlyoutEditFooter = ({
  onCancel,
  onSave,
  onShowRequest,
  hasErrors,
  isSaving,
}: RuleFlyoutEditFooterProps) => {
  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty data-test-subj="ruleFlyoutFooterCancelButton" onClick={onCancel}>
            {RULE_FLYOUT_FOOTER_CANCEL_TEXT}
          </EuiButtonEmpty>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="m">
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

            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                data-test-subj="ruleFlyoutFooterSaveButton"
                type="submit"
                isDisabled={isSaving || hasErrors}
                isLoading={isSaving}
                onClick={onSave}
              >
                {RULE_FLYOUT_FOOTER_SAVE_TEXT}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};
