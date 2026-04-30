/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from 'redux-actions';
import { canStartTrial, startTrial } from '../../lib/es';
import type { AppThunkAction } from '../types';

export const trialStatusLoaded = createAction<boolean>('LICENSE_MANAGEMENT_TRIAL_STATUS_LOADED');

export const loadTrialStatus =
  (): AppThunkAction<Promise<void>> =>
  async (dispatch, getState, { http }) => {
    const trialOK = await canStartTrial(http);
    dispatch(trialStatusLoaded(trialOK));
  };

export const startLicenseTrial =
  (): AppThunkAction<Promise<void>> =>
  async (dispatch, getState, { licensing, toasts, http }) => {
    const { trial_was_started, error_message } = await startTrial(http);
    if (trial_was_started) {
      await licensing.refresh();
      window.location.reload();
    } else {
      toasts.addDanger(error_message);
    }
  };
