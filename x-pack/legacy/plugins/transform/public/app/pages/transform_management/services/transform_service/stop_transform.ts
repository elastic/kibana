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

export const stopTransforms = async (transforms: TransformListRow[]) => {
  const transformsInfo: TransformEndpointRequest[] = transforms.map(df => ({
    id: df.config.id,
    state: df.stats.state,
  }));
  const results: TransformEndpointResult = await api.stopTransforms(transformsInfo);

  for (const transformId in results) {
    // hasOwnProperty check to ensure only properties on object itself, and not its prototypes
    if (results.hasOwnProperty(transformId)) {
      if (results[transformId].success === true) {
        toastNotifications.addSuccess(
          i18n.translate('xpack.transform.transformList.stopTransformSuccessMessage', {
            defaultMessage: 'Request to stop data frame transform {transformId} acknowledged.',
            values: { transformId },
          })
        );
      } else {
        toastNotifications.addDanger(
          i18n.translate('xpack.transform.transformList.stopTransformErrorMessage', {
            defaultMessage: 'An error occurred stopping the data frame transform {transformId}',
            values: { transformId },
          })
        );
        mlMessageBarService.notify.error(results[transformId].error);
      }
    }
  }

  refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.REFRESH);
};
