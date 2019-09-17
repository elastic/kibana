/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { toastNotifications } from 'ui/notify';
import { ml } from '../../../../../../../ml/public/services/ml_api_service';
import {
  DataFrameTransformListRow,
  refreshTransformList$,
  REFRESH_TRANSFORM_LIST_STATE,
} from '../../../../common';
import {
  DataFrameTransformEndpointRequest,
  DataFrameTransformEndpointResult,
} from '../../components/transform_list/common';

import { mlMessageBarService } from '../../../../../../../ml/public/components/messagebar/messagebar_service';

export const deleteTransforms = async (dataFrames: DataFrameTransformListRow[]) => {
  const dataFramesInfo: DataFrameTransformEndpointRequest[] = dataFrames.map(df => ({
    id: df.config.id,
    state: df.stats.state,
  }));
  const results: DataFrameTransformEndpointResult = await ml.dataFrame.deleteDataFrameTransforms(
    dataFramesInfo
  );

  for (const transformId in results) {
    // hasOwnProperty check to ensure only properties on object itself, and not its prototypes
    if (results.hasOwnProperty(transformId)) {
      if (results[transformId].success === true) {
        toastNotifications.addSuccess(
          i18n.translate('xpack.ml.dataframe.transformList.deleteTransformSuccessMessage', {
            defaultMessage: 'Request to delete transform {transformId} acknowledged.',
            values: { transformId },
          })
        );
      } else {
        toastNotifications.addDanger(
          i18n.translate('xpack.ml.dataframe.transformList.deleteTransformErrorMessage', {
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
