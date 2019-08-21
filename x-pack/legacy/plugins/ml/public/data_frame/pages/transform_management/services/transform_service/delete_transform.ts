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
  DataFrameTransformEndpointData,
  DataFrameTransformEndpointResultData,
} from '../../components/transform_list/common';

export const deleteTransforms = async (dataFrames: DataFrameTransformListRow[]) => {
  const dataFramesInfo: DataFrameTransformEndpointData[] = dataFrames.map(df => ({
    id: df.config.id,
    state: df.stats.state,
  }));
  const { results } = await ml.dataFrame.deleteDataFrameTransforms(dataFramesInfo);

  results.forEach((result: DataFrameTransformEndpointResultData) => {
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
