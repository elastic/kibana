/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action } from 'redux-actions';
import { handleActions } from 'redux-actions';

import { uploadLicenseStatus } from '../actions/upload_license';
import type { UploadStatusState } from '../types';

export const uploadStatus = handleActions<UploadStatusState, UploadStatusState>(
  {
    [String(uploadLicenseStatus)](
      state: UploadStatusState,
      { payload }: Action<UploadStatusState>
    ) {
      return payload;
    },
  },
  {}
);
