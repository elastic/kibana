/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { i18n } from '@kbn/i18n';
import { closeIndices as request } from '../../services';
import { toastNotifications } from 'ui/notify';
import { clearRowStatus, reloadIndices } from '../actions';

export const closeIndicesStart = createAction('INDEX_MANAGEMENT_CLOSE_INDICES_START');
export const closeIndices = ({ indexNames }) => async dispatch => {
  dispatch(closeIndicesStart({ indexNames }));
  try {
    await request(indexNames);
  } catch (error) {
    toastNotifications.addDanger(error.data.message);
    return dispatch(clearRowStatus({ indexNames }));
  }
  dispatch(reloadIndices(indexNames));
  toastNotifications.addSuccess(
    i18n.translate('xpack.idxMgmt.closeIndicesAction.successfullyClosedIndicesMessage', {
      defaultMessage: 'Successfully closed: [{indexNames}]',
      values: { indexNames: indexNames.join(', ') },
    })
  );
};
