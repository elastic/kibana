/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { toastNotifications } from 'ui/notify';
import { toMountPoint } from '../../../../../../../src/plugins/kibana_react/public';

import { TransformListRow, refreshTransformList$, REFRESH_TRANSFORM_LIST_STATE } from '../common';
import { ToastNotificationText } from '../components';

import { useApi } from './use_api';
import { TransformEndpointRequest, TransformEndpointResult } from './use_api_types';

export const useDeleteTransforms = () => {
  const api = useApi();

  return async (transforms: TransformListRow[]) => {
    const transformsInfo: TransformEndpointRequest[] = transforms.map(tf => ({
      id: tf.config.id,
      state: tf.stats.state,
    }));

    try {
      const results: TransformEndpointResult = await api.deleteTransforms(transformsInfo);
      for (const transformId in results) {
        // hasOwnProperty check to ensure only properties on object itself, and not its prototypes
        if (results.hasOwnProperty(transformId)) {
          if (results[transformId].success === true) {
            toastNotifications.addSuccess(
              i18n.translate('xpack.transform.transformList.deleteTransformSuccessMessage', {
                defaultMessage: 'Request to delete transform {transformId} acknowledged.',
                values: { transformId },
              })
            );
          } else {
            toastNotifications.addDanger(
              i18n.translate('xpack.transform.transformList.deleteTransformErrorMessage', {
                defaultMessage: 'An error occurred deleting the transform {transformId}',
                values: { transformId },
              })
            );
          }
        }
      }

      refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.REFRESH);
    } catch (e) {
      toastNotifications.addDanger({
        title: i18n.translate('xpack.transform.transformList.deleteTransformGenericErrorMessage', {
          defaultMessage: 'An error occurred calling the API endpoint to delete transforms.',
        }),
        text: toMountPoint(<ToastNotificationText text={e} />),
      });
    }
  };
};
