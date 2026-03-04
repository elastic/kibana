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

interface Props {
  hasConnectorTypeSelected: boolean;
  onBack: () => void;
  onCancel: () => void;
  isUsingInitialConnector: boolean;
  onTestConnector?: (connector: ActionConnector) => void;
  testConnector?: () => void;
  isSaving: boolean;
  disabled: boolean;
  onSubmit: () => Promise<void>;
  isTestable?: boolean;
}

const FlyoutFooterComponent: React.FC<Props> = ({
  hasConnectorTypeSelected,
  onCancel,
  onBack,
  isUsingInitialConnector,
  onTestConnector,
  testConnector,
  isSaving,
  disabled,
  onSubmit,
  isTestable,
}) => {
  return (
    <EuiFlyoutFooter data-test-subj="create-connector-flyout-footer">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          {hasConnectorTypeSelected && !isUsingInitialConnector ? (
            <EuiButtonEmpty onClick={onBack} data-test-subj="create-connector-flyout-back-btn">
              {i18n.translate(
                'xpack.triggersActionsUI.sections.actionConnectorAdd.backButtonLabel',
                {
                  defaultMessage: 'Back',
                }
              )}
            </EuiButtonEmpty>
          ) : (
            <EuiButtonEmpty data-test-subj="create-connector-flyout-close-btn" onClick={onCancel}>
              {i18n.translate(
                'xpack.triggersActionsUI.sections.actionConnectorAdd.closeButtonLabel',
                {
                  defaultMessage: 'Close',
                }
              )}
            </EuiButtonEmpty>
          )}
        </EuiFlexItem>
        {hasConnectorTypeSelected && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="spaceBetween">
              <>
                {isTestable && onTestConnector && (
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      color="primary"
                      data-test-subj="create-connector-flyout-save-test-btn"
                      type="submit"
                      isLoading={isSaving}
                      disabled={disabled}
                      onClick={onTestConnector !== null ? testConnector : undefined}
                    >
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.actionConnectorAdd.saveAndTestButtonLabel"
                        defaultMessage="Save & test"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    color="primary"
                    data-test-subj="create-connector-flyout-save-btn"
                    type="submit"
                    isLoading={isSaving}
                    disabled={disabled}
                    onClick={onSubmit}
                  >
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.actionConnectorAdd.saveButtonLabel"
                      defaultMessage="Save"
                    />
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem />
              </>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};

export const FlyoutFooter = memo(FlyoutFooterComponent);
