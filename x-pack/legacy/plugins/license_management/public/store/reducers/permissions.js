/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';

import { permissionsSuccess, permissionsError, permissionsLoading } from '../actions/permissions';

export const permissions = handleActions({
  [permissionsLoading](state, { payload }) {
    return {
      loading: payload,
    };
  },
  [permissionsSuccess](state, { payload }) {
    return {
      hasPermission: payload,
    };
  },
  [permissionsError](state, { payload }) {
    return {
      error: payload,
    };
  },
}, {});
