/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action } from 'redux-actions';
import { handleActions } from 'redux-actions';

import { startBasicLicenseStatus, cancelStartBasicLicense } from '../actions/start_basic';
import type { StartBasicStatusState } from '../types';

export const startBasicStatus = handleActions<StartBasicStatusState, StartBasicStatusState>(
  {
    [String(startBasicLicenseStatus)](
      state: StartBasicStatusState,
      { payload }: Action<StartBasicStatusState>
    ) {
      return payload;
    },
    [String(cancelStartBasicLicense)]() {
      return {};
    },
  },
  {}
);
