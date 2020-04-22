/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { CLIENT_ALERT_TYPES } from '../../../../common/constants';
import { ToggleFlyoutTranslations } from './translations';

interface Props {
  setAlertFlyoutVisible: (value: boolean | string) => void;
}

export const ToggleAlertFlyoutButtonComponent = ({ setAlertFlyoutVisible }: Props) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const kibana = useKibana();

  return (
    <EuiPopover
      button={
        <EuiButtonEmpty
          aria-label={ToggleFlyoutTranslations.toggleButtonAriaLabel}
          data-test-subj="xpack.uptime.alertsPopover.toggleButton"
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setIsOpen(!isOpen)}
        >
          <FormattedMessage
            id="xpack.uptime.alerts.toggleAlertFlyoutButtonText"
            defaultMessage="Alerts"
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
            aria-label={ToggleFlyoutTranslations.toggleMonitorStatusAriaLabel}
            data-test-subj="xpack.uptime.toggleAlertFlyout"
            key="create-alert"
            icon="bell"
            onClick={() => {
              setAlertFlyoutVisible(CLIENT_ALERT_TYPES.MONITOR_STATUS);
              setIsOpen(false);
            }}
          >
            <FormattedMessage
              id="xpack.uptime.toggleAlertButton.content"
              defaultMessage="Create Monitor Status alert"
            />
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            aria-label={ToggleFlyoutTranslations.toggleTlsAriaLabel}
            data-test-subj="xpack.uptime.toggleTlsAlertFlyout"
            key="create-tls-alert"
            icon="bell"
            onClick={() => {
              setAlertFlyoutVisible(CLIENT_ALERT_TYPES.TLS);
              setIsOpen(false);
            }}
          >
            <FormattedMessage
              id="xpack.uptime.toggleTlsAlertButton.content"
              defaultMessage="Create TLS alert"
            />
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            aria-label={ToggleFlyoutTranslations.navigateToAlertingUIAriaLabel}
            data-test-subj="xpack.uptime.navigateToAlertingUi"
            icon="tableOfContents"
            key="navigate-to-alerting"
            href={kibana.services?.application?.getUrlForApp(
              'kibana#/management/kibana/triggersActions/alerts'
            )}
          >
            <FormattedMessage
              id="xpack.uptime.navigateToAlertingButton.content"
              defaultMessage="Manage alerts"
            />
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};
