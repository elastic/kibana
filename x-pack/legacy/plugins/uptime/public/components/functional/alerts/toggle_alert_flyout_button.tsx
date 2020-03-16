/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';

interface Props {
  setAlertFlyoutVisible: (value: boolean) => void;
}

export const ToggleAlertFlyoutButtonComponent = ({ setAlertFlyoutVisible }: Props) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const kibana = useKibana();

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
            defaultMessage="Alerting"
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
      <EuiContextMenuItem
        data-test-subj="xpack.uptime.navigateToAlertingUi"
        icon="gear"
        key="navigate-to-alerting"
        href={kibana.services?.application?.getUrlForApp(
          'kibana#/management/kibana/triggersActions/alerts'
        )}
      >
        <FormattedMessage
          id="xpack.uptime.navigateToAlertingButton.content"
          defaultMessage="Manage alerts"
        />
      </EuiContextMenuItem>
    </EuiPopover>
  );
};
