/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action } from 'redux-actions';
import { handleActions } from 'redux-actions';

import { trialStatusLoaded } from '../actions/start_trial';
import type { TrialStatusState } from '../types';

export const trialStatus = handleActions<TrialStatusState, boolean>(
  {
    [String(trialStatusLoaded)](state: TrialStatusState, { payload }: Action<boolean>) {
      return {
        canStartTrial: payload,
      };
    },
  },
  {}
);
