/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { canStartTrial, startTrial } from '../../lib/es';

export const trialStatusLoaded = createAction(
  'LICENSE_MANAGEMENT_TRIAL_STATUS_LOADED'
);

export const loadTrialStatus = () => async (dispatch, getState, { http }) => {
  const trialOK = await canStartTrial(http);
  dispatch(trialStatusLoaded(trialOK));
};

export const startLicenseTrial = () => async (
  dispatch,
  getState,
  { legacy: { refreshXpack }, toasts, http }
) => {
  /*eslint camelcase: 0*/
  const { trial_was_started, error_message } = await startTrial(http);
  if (trial_was_started) {
    await refreshXpack();
    // reload necessary to get left nav to refresh with proper links
    window.location.reload();
  } else {
    return toasts.addDanger(error_message);
  }
};
