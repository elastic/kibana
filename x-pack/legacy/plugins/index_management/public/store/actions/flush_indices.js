/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { i18n } from '@kbn/i18n';
import { flushIndices as request } from '../../services';
import { clearRowStatus, reloadIndices } from '../actions';
import { toastNotifications } from 'ui/notify';

export const flushIndicesStart = createAction('INDEX_MANAGEMENT_FLUSH_INDICES_START');

export const flushIndices = ({ indexNames }) => async dispatch => {
  dispatch(flushIndicesStart({ indexNames }));
  try {
    await request(indexNames);
  } catch (error) {
    toastNotifications.addDanger(error.data.message);
    return dispatch(clearRowStatus({ indexNames }));
  }
  dispatch(reloadIndices(indexNames));
  toastNotifications.addSuccess(
    i18n.translate('xpack.idxMgmt.flushIndicesAction.successfullyFlushedIndicesMessage', {
      defaultMessage: 'Successfully flushed: [{indexNames}]',
      values: { indexNames: indexNames.join(', ') },
    })
  );
};
