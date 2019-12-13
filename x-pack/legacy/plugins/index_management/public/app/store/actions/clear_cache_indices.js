/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { i18n }  from '@kbn/i18n';

import { clearCacheIndices as request } from '../../services';
import { notificationService } from '../../services/notification';

import { clearRowStatus, reloadIndices } from '../actions';

export const clearCacheIndicesStart = createAction(
  'INDEX_MANAGEMENT_CLEAR_CACHE_INDICES_START'
);
export const clearCacheIndices = ({ indexNames }) => async (dispatch) => {
  dispatch(clearCacheIndicesStart({ indexNames }));
  try {
    await request(indexNames);
  } catch (error) {
    notificationService.showDangerToast(error.message);
    return dispatch(clearRowStatus({ indexNames }));
  }
  dispatch(reloadIndices(indexNames));
  notificationService.showSuccessToast(
    i18n.translate('xpack.idxMgmt.clearCacheIndicesAction.successMessage', {
      defaultMessage: 'Successfully cleared cache: [{indexNames}]',
      values: { indexNames: indexNames.join(', ') }
    })
  );
};
