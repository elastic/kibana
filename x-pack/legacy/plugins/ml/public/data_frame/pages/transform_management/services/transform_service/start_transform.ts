/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { toastNotifications } from 'ui/notify';
import { ml } from '../../../../../services/ml_api_service';

import { refreshTransformList$, REFRESH_TRANSFORM_LIST_STATE } from '../../../../common';

import {
  DataFrameTransformListRow,
  DataFrameTransformEndpointRequest,
  DataFrameTransformEndpointResult,
} from '../../components/transform_list/common';
// @ts-ignore no declaration file
import { mlMessageBarService } from '../../../../../../public/components/messagebar/messagebar_service';

export const startTransforms = async (dataFrames: DataFrameTransformListRow[]) => {
  const dataFramesInfo: DataFrameTransformEndpointRequest[] = dataFrames.map(df => ({
    id: df.config.id,
    state: df.stats.state,
  }));
  const results: DataFrameTransformEndpointResult = await ml.dataFrame.startDataFrameTransforms(
    dataFramesInfo
  );

  for (const transformId in results) {
    // hasOwnProperty check to ensure only properties on object itself, and not its prototypes
    if (results.hasOwnProperty(transformId)) {
      if (results[transformId].success === true) {
        toastNotifications.addSuccess(
          i18n.translate('xpack.ml.dataframe.transformList.startTransformSuccessMessage', {
            defaultMessage: 'Data frame transform {transformId} started successfully.',
            values: { transformId },
          })
        );
      } else {
        toastNotifications.addDanger(
          i18n.translate('xpack.ml.dataframe.transformList.startTransformErrorMessage', {
            defaultMessage: 'An error occurred starting the data frame transform {transformId}',
            values: { transformId },
          })
        );
        mlMessageBarService.notify.error(results[transformId].error);
      }
    }
  }

  refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.REFRESH);
};
