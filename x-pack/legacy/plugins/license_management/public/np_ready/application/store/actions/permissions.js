/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { getPermissions } from '../../lib/es';

export const permissionsLoading = createAction('LICENSE_MANAGEMENT_PERMISSIONS_LOADING');

export const permissionsSuccess = createAction('LICENSE_MANAGEMENT_PERMISSIONS_SUCCESS');

export const permissionsError = createAction('LICENSE_MANAGEMENT_PERMISSIONS_ERROR');

export const loadPermissions = () => async (dispatch, getState, { http }) => {
  dispatch(permissionsLoading(true));
  try {
    const permissions = await getPermissions(http);
    dispatch(permissionsLoading(false));
    dispatch(permissionsSuccess(permissions.hasPermission));
  } catch (e) {
    dispatch(permissionsLoading(false));
    dispatch(permissionsError(e));
  }
};
