/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reloadIndices } from '../actions';
import { notificationService } from '../../services/notification';
import { getHttpClient } from '../../services/api';

export const performExtensionAction = ({
  requestMethod,
  indexNames,
  successMessage,
}) => async dispatch => {
  try {
    await requestMethod(indexNames, getHttpClient());
  } catch (error) {
    notificationService.showDangerToast(error.message);
    return;
  }
  dispatch(reloadIndices(indexNames));
  notificationService.showSuccessToast(successMessage);
};
