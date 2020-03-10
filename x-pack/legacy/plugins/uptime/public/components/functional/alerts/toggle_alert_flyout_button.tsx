/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

interface Props {
  setAlertFlyoutVisible: (value: boolean) => void;
}

export const ToggleAlertFlyoutButtonComponent = ({ setAlertFlyoutVisible }: Props) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  return (
    <EuiPopover
      button={
        <EuiButtonEmpty
          data-test-subj="xpack.uptime.alertsPopover.toggleButton"
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setIsOpen(!isOpen)}
        >
          <FormattedMessage
            id="xpack.uptime.alerts.toggleAlertFlyoutButtonText"
            defaultMessage="Manage alerts"
          />
        </EuiButtonEmpty>
      }
      closePopover={() => setIsOpen(false)}
      isOpen={isOpen}
      ownFocus
    >
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem
            data-test-subj="xpack.uptime.toggleAlertFlyout"
            key="create-alert"
            icon="plusInCircle"
            onClick={() => setAlertFlyoutVisible(true)}
          >
            <FormattedMessage
              id="xpack.uptime.toggleAlertButton.content"
              defaultMessage="Create alert"
            />
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};
