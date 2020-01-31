/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { i18n } from '@kbn/i18n';
import { unfreezeIndices as request } from '../../services';
import { clearRowStatus, reloadIndices } from '../actions';
import { toastNotifications } from 'ui/notify';

export const unfreezeIndicesStart = createAction('INDEX_MANAGEMENT_UNFREEZE_INDICES_START');

export const unfreezeIndices = ({ indexNames }) => async dispatch => {
  dispatch(unfreezeIndicesStart({ indexNames }));
  try {
    await request(indexNames);
  } catch (error) {
    toastNotifications.addDanger(error.data.message);
    return dispatch(clearRowStatus({ indexNames }));
  }
  dispatch(reloadIndices(indexNames));
  toastNotifications.addSuccess(
    i18n.translate('xpack.idxMgmt.unfreezeIndicesAction.successfullyUnfrozeIndicesMessage', {
      defaultMessage: 'Successfully unfroze: [{indexNames}]',
      values: { indexNames: indexNames.join(', ') },
    })
  );
};
