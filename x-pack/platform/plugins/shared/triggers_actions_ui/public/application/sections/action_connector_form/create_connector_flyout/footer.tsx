/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFlyoutFooter, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  hasConnectorTypeSelected: boolean;
  onBack: () => void;
  onCancel: () => void;
}

const FlyoutFooterComponent: React.FC<Props> = ({ hasConnectorTypeSelected, onCancel, onBack }) => {
  return (
    <EuiFlyoutFooter data-test-subj="create-connector-flyout-footer">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          {hasConnectorTypeSelected ? (
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
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};

export const FlyoutFooter = memo(FlyoutFooterComponent);
