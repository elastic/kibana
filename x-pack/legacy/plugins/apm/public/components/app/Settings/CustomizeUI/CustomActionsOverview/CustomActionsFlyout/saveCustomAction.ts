/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { NotificationsStart } from 'kibana/public';
import { CustomAction } from '../../../../../../../../../../plugins/apm/server/lib/settings/custom_action/custom_action_types';
import { APMClient } from '../../../../../../services/rest/createCallApmApi';

export async function saveCustomAction({
  id,
  label,
  url,
  filters,
  callApmApi,
  toasts
}: {
  id?: string;
  label: string;
  url: string;
  filters?: CustomAction['filters'];
  callApmApi: APMClient;
  toasts: NotificationsStart['toasts'];
}) {
  const customAction = {
    actionId: 'trace',
    label,
    url,
    filters
  };
  if (id) {
    await callApmApi({
      pathname: '/api/apm/settings/custom-actions/{id}',
      method: 'PUT',
      params: {
        path: { id },
        body: customAction
      }
    });
    toasts.addSuccess({
      iconType: 'check',
      title: i18n.translate(
        'xpack.apm.settings.customizeUI.customActions.update.successed',
        { defaultMessage: 'Changes saved!' }
      )
    });
  } else {
    await callApmApi({
      pathname: '/api/apm/settings/custom-actions',
      method: 'POST',
      params: {
        body: customAction
      }
    });
    toasts.addSuccess({
      iconType: 'check',
      title: i18n.translate(
        'xpack.apm.settings.customizeUI.customActions.create.successed',
        { defaultMessage: 'Created a new custom action!' }
      )
    });
  }
}
