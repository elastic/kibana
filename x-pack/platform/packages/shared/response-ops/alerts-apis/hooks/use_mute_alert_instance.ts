/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import { mutationKeys } from '../mutation_keys';
import type { ServerError, ToggleAlertParams } from '../types';
import { muteAlertInstance } from '../apis/mute_alert_instance';

const ERROR_TITLE = i18n.translate('alertsApis.muteAlert.error', {
  defaultMessage: 'Error muting alert',
});

export interface UseMuteAlertInstanceParams {
  http: HttpStart;
  notifications: NotificationsStart;
}

export const getKey = mutationKeys.muteAlertInstance;

export const useMuteAlertInstance = ({
  http,
  notifications: { toasts },
}: UseMuteAlertInstanceParams) => {
  return useMutation(
    ({ ruleId, alertInstanceId }: ToggleAlertParams) =>
      muteAlertInstance({ http, id: ruleId, instanceId: alertInstanceId }),
    {
      mutationKey: getKey(),
      context: AlertsQueryContext,
      onSuccess() {
        toasts.addSuccess(
          i18n.translate('xpack.responseOpsAlertsApis.alertsTable.alertMuted', {
            defaultMessage: 'Alert muted',
          })
        );
      },
      onError: (error: ServerError) => {
        if (error.name !== 'AbortError') {
          toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            {
              title: ERROR_TITLE,
            }
          );
        }
      },
    }
  );
};
