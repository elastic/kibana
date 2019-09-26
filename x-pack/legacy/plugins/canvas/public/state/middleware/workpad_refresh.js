/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetchAllRenderables } from '../actions/elements';
import { setRefreshInterval } from '../actions/workpad';
import { inFlightComplete } from '../actions/resolved_args';
import { getInFlight } from '../selectors/resolved_args';
import { setRefreshInterval as setAppStateRefreshInterval } from '../../lib/app_state';
import { createTimeInterval } from '../../lib/time_interval';

export const workpadRefresh = ({ dispatch, getState }) => next => {
  let refreshTimeout;
  let refreshInterval = 0;

  function updateWorkpad() {
    if (refreshInterval === 0) {
      return;
    }

    // check the request in flight status
    const inFlightActive = getInFlight(getState());
    if (inFlightActive) {
      // if requests are in-flight, start the refresh delay again
      startDelayedUpdate();
    } else {
      // update the elements on the workpad
      dispatch(fetchAllRenderables());
    }
  }

  function startDelayedUpdate() {
    clearTimeout(refreshTimeout); // cancel any pending update requests
    refreshTimeout = setTimeout(() => {
      updateWorkpad();
    }, refreshInterval);
  }

  return action => {
    next(action);

    // when in-flight requests are finished, update the workpad after a given delay
    if (action.type === inFlightComplete.toString() && refreshInterval > 0) {
      startDelayedUpdate();
    } // create new update request

    // This middleware creates or destroys an interval that will cause workpad elements to update
    if (action.type === setRefreshInterval.toString()) {
      // update the refresh interval
      refreshInterval = action.payload;

      setAppStateRefreshInterval(createTimeInterval(refreshInterval));

      // clear any pending timeout
      clearTimeout(refreshTimeout);

      // if interval is larger than 0, start the delayed update
      if (refreshInterval > 0) {
        startDelayedUpdate();
      }
    }
  };
};
