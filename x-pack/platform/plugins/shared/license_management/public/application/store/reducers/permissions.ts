/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleActions } from 'redux-actions';

import { permissionsSuccess, permissionsError, permissionsLoading } from '../actions/permissions';
import type { PermissionsState } from '../types';

export const permissions = handleActions<PermissionsState, unknown>(
  {
    [String(permissionsLoading)](_state, action) {
      return {
        loading: Boolean(action.payload),
      };
    },
    [String(permissionsSuccess)](_state, action) {
      return {
        hasPermission: Boolean(action.payload),
      };
    },
    [String(permissionsError)](_state, action) {
      return {
        error: action.payload,
      };
    },
  },
  {}
);
