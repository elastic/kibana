/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { useDispatch } from 'react-redux';
import { setAlertFlyoutVisible } from '../../../state/actions';

export const ToggleAlertFlyoutButton = () => {
  const dispatch = useDispatch();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  return (
    <EuiPopover
      button={
        <EuiButton iconType="arrowDown" iconSide="right" onClick={() => setIsOpen(!isOpen)}>
          Manage alerts
        </EuiButton>
      }
      closePopover={() => setIsOpen(false)}
      isOpen={isOpen}
      ownFocus
    >
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem
            key="create-alert"
            icon="plusInCircle"
            onClick={() => dispatch(setAlertFlyoutVisible(true))}
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
