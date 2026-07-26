/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action } from 'redux-actions';
import { handleActions } from 'redux-actions';

import { addUploadErrorMessage } from '../actions/add_error_message';

export const uploadErrorMessage = handleActions<string, string>(
  {
    [String(addUploadErrorMessage)](_state: string, { payload }: Action<string>) {
      return payload;
    },
  },
  ''
);
