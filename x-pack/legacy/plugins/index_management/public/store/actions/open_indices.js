/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { i18n } from '@kbn/i18n';
import { openIndices as request } from '../../services';
import { clearRowStatus, reloadIndices } from '../actions';
import { toastNotifications } from 'ui/notify';

export const openIndicesStart = createAction('INDEX_MANAGEMENT_OPEN_INDICES_START');

export const openIndices = ({ indexNames }) => async dispatch => {
  dispatch(openIndicesStart({ indexNames }));
  try {
    await request(indexNames);
  } catch (error) {
    toastNotifications.addDanger(error.data.message);
    return dispatch(clearRowStatus({ indexNames }));
  }
  dispatch(reloadIndices(indexNames));
  toastNotifications.addSuccess(
    i18n.translate('xpack.idxMgmt.openIndicesAction.successfullyOpenedIndicesMessage', {
      defaultMessage: 'Successfully opened: [{indexNames}]',
      values: { indexNames: indexNames.join(', ') },
    })
  );
};
