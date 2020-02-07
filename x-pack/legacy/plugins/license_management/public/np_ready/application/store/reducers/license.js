/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';

import { addLicense } from '../actions/add_license';

export const license = handleActions(
  {
    [addLicense](state, { payload }) {
      return payload;
    },
  },
  {}
);
