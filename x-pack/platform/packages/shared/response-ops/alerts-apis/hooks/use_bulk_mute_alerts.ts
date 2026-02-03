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
import type { ServerError } from '../types';
import { bulkMuteAlerts, type BulkMuteAlertsRule } from '../apis/bulk_mute_alerts';

const ERROR_TITLE = i18n.translate('alertsApis.bulkMuteAlerts.error', {
  defaultMessage: 'Error muting alerts',
});

export interface UseBulkMuteAlertsParams {
  http: HttpStart;
  notifications: NotificationsStart;
  onSuccess?: () => void;
}

export interface BulkMuteAlertsParams {
  rules: BulkMuteAlertsRule[];
}

export const getKey = mutationKeys.bulkMuteAlerts;

export const useBulkMuteAlerts = ({
  http,
  notifications: { toasts },
  onSuccess,
}: UseBulkMuteAlertsParams) => {
  return useMutation(({ rules }: BulkMuteAlertsParams) => bulkMuteAlerts({ http, rules }), {
    mutationKey: getKey(),
    context: AlertsQueryContext,
    onSuccess(_data, variables) {
      const alertCount = variables.rules.reduce(
        (sum, rule) => sum + rule.alert_instance_ids.length,
        0
      );
      const ruleCount = variables.rules.length;
      toasts.addSuccess(
        i18n.translate('xpack.responseOpsAlertsApis.alertsTable.alertsMuted', {
          defaultMessage:
            'Muted {alertCount} {alertCount, plural, one {alert instance} other {alert instances}} for {ruleCount} {ruleCount, plural, one {rule} other {rules}}',
          values: { alertCount, ruleCount },
        })
      );
      onSuccess?.();
    },
    onError: (error: ServerError) => {
      if (error.name !== 'AbortError') {
        toasts.addError(error.body && error.body.message ? new Error(error.body.message) : error, {
          title: ERROR_TITLE,
        });
      }
    },
  });
};
