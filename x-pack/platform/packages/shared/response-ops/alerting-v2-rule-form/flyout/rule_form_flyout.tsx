/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
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
import { RULE_FORM_ID } from '../form/constants';
import { HeaderActionPortalProvider } from './flyout_header_portal_context';

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
 *
 * Exposes a portal target in the header via FlyoutHeaderPortalContext so
 * descendants can render actions (e.g. a GUI/YAML toggle) next to the title.
 */
export const RuleFormFlyout = ({
  push = true,
  onClose,
  isLoading = false,
  children,
}: RuleFormFlyoutProps) => {
  const [headerActionEl, setHeaderActionEl] = useState<HTMLDivElement | null>(null);
  const headerActionCallbackRef = useCallback((node: HTMLDivElement | null) => {
    setHeaderActionEl(node);
  }, []);

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
      size="l"
      maxWidth={600}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m" id={FLYOUT_TITLE_ID}>
              <h2>
                <FormattedMessage
                  id="xpack.alertingV2.ruleForm.flyoutTitle"
                  defaultMessage="Create Alert Rule"
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <div ref={headerActionCallbackRef} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <HeaderActionPortalProvider value={headerActionEl}>{children}</HeaderActionPortalProvider>
      </EuiFlyoutBody>
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
