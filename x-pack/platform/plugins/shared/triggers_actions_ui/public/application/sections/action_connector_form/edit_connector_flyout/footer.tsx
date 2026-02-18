/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiButtonEmpty,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ActionConnector } from '../../../../types';
import { usesOAuthAuthorizationCode } from '../../../lib/check_oauth_auth_code';

interface Props {
  onClose: () => void;
  isSaving: boolean;
  isSaved: boolean;
  showButtons: boolean;
  disabled: boolean;
  onClickSave: () => void;
  connector: ActionConnector;
  onAuthorize?: () => void;
  isAuthorizing?: boolean;
  isAwaitingCallback?: boolean;
  onDisconnect?: () => void;
  isDisconnecting?: boolean;
}

const FlyoutFooterComponent: React.FC<Props> = ({
  onClose,
  isSaving,
  isSaved,
  showButtons,
  disabled,
  onClickSave,
  connector,
  onAuthorize,
  isAuthorizing,
  isAwaitingCallback,
  onDisconnect,
  isDisconnecting,
}) => {
  const isAuthorizeBusy = isAuthorizing || isAwaitingCallback;
  return (
    <EuiFlyoutFooter data-test-subj="edit-connector-flyout-footer">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onClose} data-test-subj="edit-connector-flyout-close-btn">
            {i18n.translate('xpack.triggersActionsUI.sections.editConnectorForm.closeButtonLabel', {
              defaultMessage: 'Close',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            {usesOAuthAuthorizationCode(connector) && onDisconnect && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="danger"
                  data-test-subj="edit-connector-flyout-disconnect-btn"
                  onClick={onDisconnect}
                  isLoading={isDisconnecting}
                  disabled={isAuthorizeBusy}
                >
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.editConnectorForm.disconnectButtonLabel"
                    defaultMessage="Disconnect"
                  />
                </EuiButton>
              </EuiFlexItem>
            )}
            {usesOAuthAuthorizationCode(connector) && onAuthorize && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="success"
                  data-test-subj="edit-connector-flyout-authorize-btn"
                  onClick={onAuthorize}
                  isLoading={isAuthorizeBusy}
                  disabled={isDisconnecting}
                  iconType={isAuthorizeBusy ? undefined : 'popout'}
                >
                  {isAwaitingCallback ? (
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.editConnectorForm.awaitingAuthorizationButtonLabel"
                      defaultMessage="Awaiting authorization..."
                    />
                  ) : isAuthorizing ? (
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.editConnectorForm.authorizingButtonLabel"
                      defaultMessage="Authorizing..."
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.editConnectorForm.authorizeButtonLabel"
                      defaultMessage="Authorize"
                    />
                  )}
                </EuiButton>
              </EuiFlexItem>
            )}
            {showButtons && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  iconType={isSaved ? 'check' : undefined}
                  color="primary"
                  data-test-subj="edit-connector-flyout-save-btn"
                  isLoading={isSaving}
                  onClick={onClickSave}
                  disabled={disabled}
                >
                  {isSaved ? (
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.editConnectorForm.saveButtonSavedLabel"
                      defaultMessage="Changes Saved"
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.editConnectorForm.saveButtonLabel"
                      defaultMessage="Save"
                    />
                  )}
                </EuiButton>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};

export const FlyoutFooter = memo(FlyoutFooterComponent);
