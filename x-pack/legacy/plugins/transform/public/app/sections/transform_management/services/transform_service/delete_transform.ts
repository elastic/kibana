/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { toastNotifications } from 'ui/notify';
import { api } from '../../../../services/api_service';
import {
  TransformListRow,
  refreshTransformList$,
  REFRESH_TRANSFORM_LIST_STATE,
} from '../../../../common';
import {
  TransformEndpointRequest,
  TransformEndpointResult,
} from '../../components/transform_list/common';

import { mlMessageBarService } from '../../../../../../../ml/public/components/messagebar/messagebar_service';

export const deleteTransforms = async (transforms: TransformListRow[]) => {
  const transformsInfo: TransformEndpointRequest[] = transforms.map(tf => ({
    id: tf.config.id,
    state: tf.stats.state,
  }));
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
        mlMessageBarService.notify.error(results[transformId].error);
      }
    }
  }

  refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.REFRESH);
};
