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
  DATA_FRAME_TASK_STATE,
  DataFrameTransformListRow,
} from '../../components/transform_list/common';

export const startTransform = async (d: DataFrameTransformListRow) => {
  try {
    await ml.dataFrame.startDataFrameTransform(
      d.config.id,
      d.state.task_state === DATA_FRAME_TASK_STATE.FAILED
    );
    toastNotifications.addSuccess(
      i18n.translate('xpack.ml.dataframe.transformList.startTransformSuccessMessage', {
        defaultMessage: 'Data frame transform {transformId} started successfully.',
        values: { transformId: d.config.id },
      })
    );
  } catch (e) {
    toastNotifications.addDanger(
      i18n.translate('xpack.ml.dataframe.transformList.startTransformErrorMessage', {
        defaultMessage:
          'An error occurred starting the data frame transform {transformId}: {error}',
        values: { transformId: d.config.id, error: JSON.stringify(e) },
      })
    );
  }
  refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.REFRESH);
};
