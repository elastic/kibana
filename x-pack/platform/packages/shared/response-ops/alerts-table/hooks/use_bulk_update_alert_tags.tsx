/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation } from '@kbn/react-query';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/alerts-ui-shared/src/common/constants';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import { mutationKeys } from '../constants';

export interface UseBulkUpdateAlertTagsParams {
  http: HttpStart;
  notifications: NotificationsStart;
  onSuccess?: () => void;
  onError?: () => void;
}

export const useBulkUpdateAlertTags = ({
  http,
  notifications: { toasts },
  onSuccess,
  onError,
}: UseBulkUpdateAlertTagsParams) => {
  return useMutation<
    string,
    string,
    { index: string; alertIds: string[]; add?: string[]; remove?: string[] }
  >(
    mutationKeys.bulkUpdateAlertTags(),
    ({ index, alertIds, add, remove }) => {
      try {
        const body = JSON.stringify({
          index,
          alertIds,
          ...(add ? { add } : {}),
          ...(remove ? { remove } : {}),
        });
        return http.post(`${BASE_RAC_ALERTS_API_PATH}/tags`, { body });
      } catch (e) {
        throw new Error(`Unable to update tags: ${e.message}`);
      }
    },
    {
      context: AlertsQueryContext,
      onSuccess: (_, params) => {
        toasts.addSuccess(
          i18n.translate(
            'xpack.triggersActionsUI.rules.updateTagsConfirmationModal.successNotification.descriptionText',
            {
              defaultMessage: 'Updated tags for {uuidsCount, plural, one {alert} other {alerts}}',
              values: { uuidsCount: params.alertIds.length },
            }
          )
        );
        onSuccess?.();
      },
      onError: (_err, params) => {
        toasts.addDanger(
          i18n.translate(
            'xpack.triggersActionsUI.rules.updateTagsConfirmationModal.errorNotification.descriptionText',
            {
              defaultMessage:
                'Failed to update tags for {uuidsCount, plural, one {alert} other {alerts}}',
              values: { uuidsCount: params.alertIds.length },
            }
          )
        );
        onError?.();
      },
    }
  );
};
