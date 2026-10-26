/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation } from '@kbn/react-query';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import { mutationKeys } from '../constants';

const BULK_UPDATE_PATH = '/internal/rac/alerts/bulk_update';

export interface UseBulkUpdateWorkflowStatusParams {
  http: HttpStart;
  notifications: NotificationsStart;
}

export const useBulkUpdateWorkflowStatus = ({
  http,
  notifications: { toasts },
}: UseBulkUpdateWorkflowStatusParams) => {
  return useMutation<string, string, { ids: string[]; status: string; index: string }>(
    mutationKeys.bulkUpdateWorkflowStatus(),
    ({ ids, status, index }) => {
      try {
        const body = JSON.stringify({ ids, status, index });
        return http.post(BULK_UPDATE_PATH, { body });
      } catch (e) {
        throw new Error(`Unable to parse bulk update workflow status params: ${e}`);
      }
    },
    {
      context: AlertsQueryContext,
      onError: () => {
        toasts.addDanger(
          i18n.translate(
            'xpack.responseOpsAlertsTable.actions.bulkUpdateWorkflowStatus.errorMessage',
            { defaultMessage: 'Error updating alert status' }
          )
        );
      },
      onSuccess: (_, { status }) => {
        toasts.addSuccess(
          status === 'acknowledged'
            ? i18n.translate(
                'xpack.responseOpsAlertsTable.actions.bulkUpdateWorkflowStatus.acknowledged',
                { defaultMessage: 'Alert acknowledged' }
              )
            : i18n.translate(
                'xpack.responseOpsAlertsTable.actions.bulkUpdateWorkflowStatus.unacknowledged',
                { defaultMessage: 'Alert unacknowledged' }
              )
        );
      },
    }
  );
};
