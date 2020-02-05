/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { toastNotifications } from 'ui/notify';

import { TransformListRow, refreshTransformList$, REFRESH_TRANSFORM_LIST_STATE } from '../common';

import { useApi } from './use_api';
import { TransformEndpointRequest, TransformEndpointResult } from './use_api_types';

export const useStartTransforms = () => {
  const api = useApi();

  return async (transforms: TransformListRow[]) => {
    const transformsInfo: TransformEndpointRequest[] = transforms.map(tf => ({
      id: tf.config.id,
      state: tf.stats.state,
    }));
    const results: TransformEndpointResult = await api.startTransforms(transformsInfo);

    for (const transformId in results) {
      // hasOwnProperty check to ensure only properties on object itself, and not its prototypes
      if (results.hasOwnProperty(transformId)) {
        if (results[transformId].success === true) {
          toastNotifications.addSuccess(
            i18n.translate('xpack.transform.transformList.startTransformSuccessMessage', {
              defaultMessage: 'Request to start transform {transformId} acknowledged.',
              values: { transformId },
            })
          );
        } else {
          toastNotifications.addDanger(
            i18n.translate('xpack.transform.transformList.startTransformErrorMessage', {
              defaultMessage: 'An error occurred starting the transform {transformId}',
              values: { transformId },
            })
          );
        }
      }
    }

    refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.REFRESH);
  };
};
