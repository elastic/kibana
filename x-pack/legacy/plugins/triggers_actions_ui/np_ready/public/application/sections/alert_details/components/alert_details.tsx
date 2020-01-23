/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { EuiLoadingSpinner } from '@elastic/eui';
import { Alert } from '../../../../types';
import { useAppDependencies } from '../../../app_context';
import { loadAlert } from '../../../lib/alert_api';

interface AlertDetailsProps {
  alert: Alert;
}

interface AlertDetailsRouteProps {
  alertId: string;
}

export const AlertDetails: React.FunctionComponent<AlertDetailsProps> = ({ alert }) => {
  return <div>{alert.id}</div>;
};

export const AlertDetailsRoute: React.FunctionComponent<RouteComponentProps<
  AlertDetailsRouteProps
>> = ({
  match: {
    params: { alertId },
  },
}) => {
  const { http, toastNotifications } = useAppDependencies();

  const [alert, setAlert] = useState<Alert | null>(null);

  useEffect(() => {
    async function getAlert() {
      try {
        setAlert(await loadAlert(http, alertId));
      } catch (e) {
        toastNotifications.addDanger({
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.alertsList.unableToLoadAlertsMessage',
            {
              defaultMessage: 'Unable to load alert',
            }
          ),
        });
      }
    }
    getAlert();
  }, [alertId, http, toastNotifications]);

  return alert ? (
    <AlertDetails alert={alert} />
  ) : (
    <div
      style={{
        textAlign: 'center',
        margin: '4em 0em',
      }}
    >
      <EuiLoadingSpinner size="l" />
    </div>
  );
};
