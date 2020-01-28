/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { EuiLoadingSpinner } from '@elastic/eui';
import { Alert, AlertType, ActionType } from '../../../../types';
import { useAppDependencies } from '../../../app_context';
import { loadAlert, loadAlertTypes } from '../../../lib/alert_api';
import { loadActionTypes } from '../../../lib/action_api';
import { AlertDetailsWithApi as AlertDetails } from './alert_details';
import { throwIfAbsent, throwIfIsntContained } from '../../../lib/value_validators';

interface AlertDetailsRouteProps {
  alertId: string;
}

export const AlertDetailsRoute: React.FunctionComponent<RouteComponentProps<
  AlertDetailsRouteProps
>> = ({
  match: {
    params: { alertId },
  },
}) => {
  const { http, toastNotifications } = useAppDependencies();

  const [alert, setAlert] = useState<Alert | null>(null);
  const [alertType, setAlertType] = useState<AlertType | null>(null);
  const [actionTypes, setActionTypes] = useState<ActionType[] | null>(null);

  useEffect(() => {
    async function getAlertData() {
      try {
        const loadedAlert = await loadAlert({ http, alertId });
        setAlert(loadedAlert);

        const [loadedAlertType, loadedActionTypes] = await Promise.all([
          loadAlertTypes({ http })
            .then(types => types.find(type => type.id === loadedAlert.alertTypeId))
            .then(throwIfAbsent(`Invalid AlertType ${loadedAlert.alertTypeId}`)),
          loadActionTypes({ http }).then(
            throwIfIsntContained(
              new Set(loadedAlert.actions.map(action => action.actionTypeId)),
              (requiredActionType: string) => `Invalid Action Type: ${requiredActionType}`,
              (action: ActionType) => action.id
            )
          ),
        ]);
        setAlertType(loadedAlertType);
        setActionTypes(loadedActionTypes);
      } catch (e) {
        // TODO: We should log this error to the Kibana log via the backend - looking into how to do this

        toastNotifications.addDanger({
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.alertDetails.unableToLoadAlertMessage',
            {
              defaultMessage: 'Unable to load alert: {message}',
              values: {
                message: e.message,
              },
            }
          ),
        });
      }
    }
    getAlertData();
  }, [alertId, http, toastNotifications]);

  return alert && alertType && actionTypes ? (
    <AlertDetails alert={alert} alertType={alertType} actionTypes={actionTypes} />
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
