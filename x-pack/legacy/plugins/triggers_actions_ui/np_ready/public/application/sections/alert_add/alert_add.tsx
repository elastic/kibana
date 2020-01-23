/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiTitle, EuiFlyoutHeader, EuiFlyout, EuiPortal } from '@elastic/eui';
import { useAlertsContext } from '../../context/alerts_context';
import { Alert } from '../../../types';
import { AlertForm } from './alert_form';

export const AlertAdd = () => {
  const initialAlert = ({
    params: {},
    consumer: 'alerting',
    alertTypeId: null,
    schedule: {
      interval: '1m',
    },
    actions: [],
    tags: [],
    muteAll: false,
    enabled: false,
    mutedInstanceIds: [],
  } as unknown) as Alert;

  const { addFlyoutVisible, setAddFlyoutVisibility } = useAlertsContext();

  const closeFlyout = useCallback(() => {
    setAddFlyoutVisibility(false);
  }, [setAddFlyoutVisibility]);

  if (!addFlyoutVisible) {
    return null;
  }

  return (
    <EuiPortal>
      <EuiFlyout
        ownFocus
        onClose={closeFlyout}
        aria-labelledby="flyoutAlertAddTitle"
        size="m"
        maxWidth={620}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h3 id="flyoutTitle">
              <FormattedMessage
                defaultMessage="Create Alert"
                id="xpack.triggersActionsUI.sections.alertAdd.flyoutTitle"
              />
            </h3>
          </EuiTitle>
        </EuiFlyoutHeader>
        <AlertForm initialAlert={initialAlert} setFlyoutVisibility={setAddFlyoutVisibility} />
      </EuiFlyout>
    </EuiPortal>
  );
};
