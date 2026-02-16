/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiButton,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';

export const RULE_FORM_ID = 'ruleV2Form';
const FLYOUT_TITLE_ID = 'ruleV2FormFlyoutTitle';

export interface RuleFormFlyoutProps {
  push?: boolean;
  onClose?: () => void;
  isLoading?: boolean;
  children: React.ReactNode;
}

/**
 * Base flyout wrapper - a pure presentation component.
 *
 * Use DynamicRuleFormFlyout or StandaloneRuleFormFlyout for pre-composed
 * flyouts that handle form submission and state management.
 */
export const RuleFormFlyout: React.FC<RuleFormFlyoutProps> = ({
  push = true,
  onClose,
  isLoading = false,
  children,
}) => {
  return (
    <EuiFlyout
      session="start"
      flyoutMenuProps={{
        title: 'Create Alert Rule',
        hideTitle: true,
      }}
      type={push ? 'push' : 'overlay'}
      onClose={onClose || (() => {})}
      aria-labelledby={FLYOUT_TITLE_ID}
      size="s"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m" id={FLYOUT_TITLE_ID}>
          <h2>
            <FormattedMessage
              id="xpack.alertingV2.ruleForm.flyoutTitle"
              defaultMessage="Create Alert Rule"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{children}</EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} isLoading={isLoading}>
              <FormattedMessage
                id="xpack.alertingV2.ruleForm.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill isLoading={isLoading} form={RULE_FORM_ID} type="submit">
              <FormattedMessage
                id="xpack.alertingV2.ruleForm.saveButtonLabel"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
