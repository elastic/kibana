/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { i18n } from '@kbn/i18n';
import { getIndexNamesForCurrentPage } from '../selectors';
import { reloadIndices as request } from '../../services';
import { loadIndices } from './load_indices';
import { toastNotifications } from 'ui/notify';

export const reloadIndicesSuccess = createAction('INDEX_MANAGEMENT_RELOAD_INDICES_SUCCESS');
export const reloadIndices = indexNames => async (dispatch, getState) => {
  let indices;
  indexNames = indexNames || getIndexNamesForCurrentPage(getState());
  try {
    indices = await request(indexNames);
  } catch (error) {
    // an index has been deleted
    // or the user does not have privileges for one of the indices on the current page,
    // reload the full list
    if (error.status === 404 || error.status === 403) {
      return dispatch(loadIndices());
    }
    return toastNotifications.addDanger(error.data.message);
  }
  if (indices && indices.length > 0) {
    return dispatch(reloadIndicesSuccess({ indices }));
  } else {
    return toastNotifications.addWarning(
      i18n.translate('xpack.idxMgmt.reloadIndicesAction.indicesPageRefreshFailureMessage', {
        defaultMessage: 'Failed to refresh current page of indices.',
      })
    );
  }
};
