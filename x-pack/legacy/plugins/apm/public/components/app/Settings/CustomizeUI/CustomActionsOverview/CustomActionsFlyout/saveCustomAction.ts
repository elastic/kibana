/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { NotificationsStart } from 'kibana/public';
import { CustomAction } from '../../../../../../../../../../plugins/apm/server/lib/settings/custom_action/custom_action_types';
import { APMClient } from '../../../../../../services/rest/createCallApmApi';

export const saveCustomAction = async ({
  callApmApi,
  customAction,
  toasts
}: {
  callApmApi: APMClient;
  customAction: CustomAction;
  toasts: NotificationsStart['toasts'];
}) => {
  if ('id' in customAction) {
    await callApmApi({
      pathname: '/api/apm/settings/custom-actions/{customActionId}',
      method: 'PUT',
      params: {
        path: { customActionId: customAction.id },
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
};
