/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';
import { NotificationsStart } from 'kibana/public';
import { APMClient } from '../../../../../../services/rest/createCallApmApi';
import { CustomAction } from './';

export const saveCustomAction = async ({
  callApmApi,
  customAction,
  toasts
}: {
  callApmApi: APMClient;
  customAction: CustomAction;
  toasts: NotificationsStart['toasts'];
}) => {
  const { label, url, filters } = customAction;
  const customActionBody = {
    label,
    url,
    filters: filters
      .filter(({ key, value }) => !isEmpty(key) && !isEmpty(value))
      .reduce((acc: Record<string, string>, { key, value }) => {
        acc[key] = value;
        return acc;
      }, {})
  };

  await callApmApi({
    pathname: '/api/apm/settings/custom-actions',
    method: 'POST',
    params: {
      body: customActionBody
    }
  });

  // TODO: caue change the toast messages
  toasts.addSuccess({
    title: i18n.translate(
      'xpack.apm.settings.customizeUI.customActions.succeeded.title',
      { defaultMessage: 'Created a new custom action!' }
    ),
    text: i18n.translate(
      'xpack.apm.settings.customizeUI.customActions.succeeded.text',
      {
        defaultMessage: 'We have succesfully created a custom action.'
      }
    )
  });
};
