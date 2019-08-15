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
  DATA_FRAME_TRANSFORM_STATE,
  DataFrameTransformListRow,
} from '../../components/transform_list/common';

export const stopTransforms = async (dataFrames: DataFrameTransformListRow[]) => {
  const results = await Promise.all(
    dataFrames.map(async df => {
      const dfId = df.config.id;
      try {
        await ml.dataFrame.stopDataFrameTransform(
          dfId,
          df.stats.state === DATA_FRAME_TRANSFORM_STATE.FAILED,
          true
        );
        return { id: dfId, success: true };
      } catch (e) {
        return { id: dfId, success: false, error: JSON.stringify(e) };
      }
    })
  );

  results.forEach(result => {
    if (result.success === true) {
      toastNotifications.addSuccess(
        i18n.translate('xpack.ml.dataframe.transformList.stopTransformSuccessMessage', {
          defaultMessage: 'Data frame transform {transformId} stopped successfully.',
          values: { transformId: result.id },
        })
      );
    } else {
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.dataframe.transformList.stopTransformErrorMessage', {
          defaultMessage:
            'An error occurred stopping the data frame transform {transformId}: {error}',
          values: { transformId: result.id, error: result.error },
        })
      );
    }
  });
  refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.REFRESH);
};
