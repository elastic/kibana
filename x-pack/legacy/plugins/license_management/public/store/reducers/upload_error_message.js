/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';

import { addUploadErrorMessage } from '../actions/add_error_message';

export const uploadErrorMessage = handleActions({
  [addUploadErrorMessage](state, { payload }) {
    return payload;
  }
}, '');
