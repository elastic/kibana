/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loadIndexData as request } from '../../services';
import { createAction } from 'redux-actions';
import { toastNotifications } from 'ui/notify';

export const loadIndexDataSuccess = createAction('INDEX_MANAGEMENT_LOAD_INDEX_DATA_SUCCESS');

export const loadIndexData = ({ indexName, dataType }) => async dispatch => {
  let data;
  try {
    data = await request(dataType, indexName);
  } catch (error) {
    return toastNotifications.addDanger(error.data.message);
  }
  dispatch(loadIndexDataSuccess({ data, indexName }));
};
