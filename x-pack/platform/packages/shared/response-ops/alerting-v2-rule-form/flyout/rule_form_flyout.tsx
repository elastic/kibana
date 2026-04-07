/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef } from 'react';
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
 * In push mode, EUI disables its built-in focus trap so both the flyout
 * and the page remain interactive. A lightweight `onFocusCapture` handler
 * on the content wrapper redirects keyboard-initiated focus (Tab / Enter)
 * back to the source element, while click-initiated focus passes through
 * unaffected. Autocomplete on unfocused editors is separately suppressed
 * by the `sharedEsqlSuggestionProvider` focus-check in `esql_editor.tsx`.
 */
export const RuleFormFlyout = ({
  push = true,
  onClose,
  isLoading = false,
  children,
}: RuleFormFlyoutProps) => {
  const clickedRef = useRef(false);

  const onFocusCapture = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      if (!push || clickedRef.current) return;
      const from = e.relatedTarget as HTMLElement | null;
      if (from && !e.currentTarget.contains(from)) {
        (e.target as HTMLElement).blur();
        from.focus({ preventScroll: true });
      }
    },
    [push]
  );

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
      <div
        style={{ display: 'contents' }}
        onPointerDown={() => {
          clickedRef.current = true;
        }}
        onPointerUp={() => {
          clickedRef.current = false;
        }}
        onFocusCapture={onFocusCapture}
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
              <EuiButton
                fill
                isLoading={isLoading}
                form={RULE_FORM_ID}
                type="submit"
                data-test-subj="ruleV2FlyoutSaveButton"
              >
                <FormattedMessage
                  id="xpack.alertingV2.ruleForm.createRuleButtonLabel"
                  defaultMessage="Create rule"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </div>
    </EuiFlyout>
  );
};
