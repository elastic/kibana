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

export const deleteTransforms = async (dataFrames: DataFrameTransformListRow[]) => {
  const results = await Promise.all(
    dataFrames.map(async df => {
      const dfId = df.config.id;
      try {
        if (df.stats.state === DATA_FRAME_TRANSFORM_STATE.FAILED) {
          await ml.dataFrame.stopDataFrameTransform(dfId, true, true);
        }
        await ml.dataFrame.deleteDataFrameTransform(dfId);
        return { id: dfId, success: true };
      } catch (e) {
        return { id: dfId, success: false, error: JSON.stringify(e) };
      }
    })
  );

  results.forEach(result => {
    if (result.success === true) {
      toastNotifications.addSuccess(
        i18n.translate('xpack.ml.dataframe.transformList.deleteTransformSuccessMessage', {
          defaultMessage: 'Data frame transform {transformId} deleted successfully.',
          values: { transformId: result.id },
        })
      );
    } else {
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.dataframe.transformList.deleteTransformErrorMessage', {
          defaultMessage:
            'An error occurred deleting the data frame transform {transformId}: {error}',
          values: { transformId: result.id, error: result.error },
        })
      );
    }
  });
  refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.REFRESH);
};
