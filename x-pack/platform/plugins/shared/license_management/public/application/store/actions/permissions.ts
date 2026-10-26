/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from 'redux-actions';
import { getPermissions } from '../../lib/es';
import type { AppThunkAction } from '../types';

export const permissionsLoading = createAction<boolean>('LICENSE_MANAGEMENT_PERMISSIONS_LOADING');

export const permissionsSuccess = createAction<boolean>('LICENSE_MANAGEMENT_PERMISSIONS_SUCCESS');

export const permissionsError = createAction<unknown>('LICENSE_MANAGEMENT_PERMISSIONS_ERROR');

export const loadPermissions =
  (): AppThunkAction<Promise<void>> =>
  async (dispatch, getState, { http }) => {
    dispatch(permissionsLoading(true));
    try {
      const { hasPermission } = await getPermissions(http);
      dispatch(permissionsLoading(false));
      dispatch(permissionsSuccess(hasPermission));
    } catch (e) {
      dispatch(permissionsLoading(false));
      dispatch(permissionsError(e));
    }
  };
