/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useReducer, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiTitle,
  EuiFlyoutHeader,
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiFlyoutBody,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAlertsContext } from '../../context/alerts_context';
import { Alert, AlertAction, IErrorObject } from '../../../types';
import { AlertForm, validateBaseProperties } from './alert_form';
import { alertReducer } from './alert_reducer';
import { useAppDependencies } from '../../app_context';
import { createAlert } from '../../lib/alert_api';

export const AlertAdd = () => {
  const { http, toastNotifications, alertTypeRegistry, actionTypeRegistry } = useAppDependencies();
  const initialAlert = ({
    params: {},
    consumer: 'alerting',
    alertTypeId: null,
    schedule: {
      interval: '1m',
    },
    actions: [],
    tags: [],
  } as unknown) as Alert;

  const [{ alert }, dispatch] = useReducer(alertReducer, { alert: initialAlert });
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const setAlert = (value: any) => {
    dispatch({ command: { type: 'setAlert' }, payload: { key: 'alert', value } });
  };
  const setActionProperty = (key: string, value: any, index: number) => {
    dispatch({ command: { type: 'setAlertActionProperty' }, payload: { key, value, index } });
  };

  const { addFlyoutVisible, setAddFlyoutVisibility, reloadAlerts } = useAlertsContext();

  const closeFlyout = useCallback(() => {
    setAddFlyoutVisibility(false);
    setAlert(initialAlert);
    setServerError(null);
  }, [initialAlert, setAddFlyoutVisibility]);

  const [serverError, setServerError] = useState<{
    body: { message: string; error: string };
  } | null>(null);

  if (!addFlyoutVisible) {
    return null;
  }

  const alertType = alertTypeRegistry.get(alert.alertTypeId);
  const errors = {
    ...(alertType ? alertType.validate(alert).errors : []),
    ...validateBaseProperties(alert).errors,
  } as IErrorObject;
  const hasErrors = !!Object.keys(errors).find(errorKey => errors[errorKey].length >= 1);

  const actionsErrors = alert.actions.reduce((acc: any, alertAction: AlertAction) => {
    const actionType = actionTypeRegistry.get(alertAction.actionTypeId);
    if (!actionType) {
      return { ...acc };
    }
    const actionValidationErrors = actionType.validateParams(alertAction.params);
    return { ...acc, [alertAction.id]: actionValidationErrors };
  }, {});

  const hasActionErrors = !!Object.entries(actionsErrors)
    .map(([, actionErrors]) => actionErrors)
    .find((actionErrors: any) => {
      return !!Object.keys(actionErrors.errors).find(
        errorKey => actionErrors.errors[errorKey].length >= 1
      );
    });

  async function onSaveAlert(): Promise<any> {
    try {
      // remove actionTypeId for actions to valid save
      alert.actions.forEach((_alertAction: AlertAction, index: number) => {
        setActionProperty('actionTypeId', undefined, index);
      });

      const newAlert = await createAlert({ http, alert });
      toastNotifications.addSuccess(
        i18n.translate('xpack.triggersActionsUI.sections.alertForm.saveSuccessNotificationText', {
          defaultMessage: "Saved '{alertName}'",
          values: {
            alertName: newAlert.id,
          },
        })
      );
      return newAlert;
    } catch (error) {
      return {
        error,
      };
    }
  }

  return (
    <EuiFlyout onClose={closeFlyout} aria-labelledby="flyoutAlertAddTitle" size="m" maxWidth={620}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s" data-test-subj="addAlertFlyoutTitle">
          <h3 id="flyoutTitle">
            <FormattedMessage
              defaultMessage="Create Alert"
              id="xpack.triggersActionsUI.sections.alertAdd.flyoutTitle"
            />
          </h3>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <AlertForm alert={alert} dispatch={dispatch} errors={errors} serverError={serverError} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty data-test-subj="cancelSaveAlertButton" onClick={closeFlyout}>
              {i18n.translate('xpack.triggersActionsUI.sections.alertAdd.cancelButtonLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              color="secondary"
              data-test-subj="saveAlertButton"
              type="submit"
              iconType="check"
              isDisabled={hasErrors || hasActionErrors}
              isLoading={isSaving}
              onClick={async () => {
                setIsSaving(true);
                const savedAlert = await onSaveAlert();
                setIsSaving(false);
                if (savedAlert && savedAlert.error) {
                  return setServerError(savedAlert.error);
                }
                closeFlyout();
                reloadAlerts();
              }}
            >
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.alertAdd.saveButtonLabel"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
