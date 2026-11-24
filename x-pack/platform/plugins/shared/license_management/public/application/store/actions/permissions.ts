/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPermissions } from '../../lib/es';
import { permissionsError, permissionsLoading, permissionsSuccess } from '../reducers/permissions';
import type { AppThunkAction } from '../types';

const extractErrorMessage = (err: unknown): string | undefined => {
  if (typeof err !== 'object' || err === null || !('data' in err)) {
    return undefined;
  }
  const { data } = err;
  if (typeof data !== 'object' || data === null || !('message' in data)) {
    return undefined;
  }
  const { message } = data;
  return typeof message === 'string' ? message : undefined;
};

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
      dispatch(permissionsError({ message: extractErrorMessage(e) }));
    }
  };
