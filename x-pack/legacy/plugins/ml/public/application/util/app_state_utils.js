/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep, isEqual } from 'lodash';

import { distinctUntilChanged } from 'rxjs/operators';

function hasEqualKeys(a, b) {
  return isEqual(Object.keys(a).sort(), Object.keys(b).sort());
}

export function initializeAppState(AppState, stateName, defaultState) {
  const appState = new AppState();
  appState.fetch();

  // Store the state to the AppState so that it's
  // restored on page refresh.
  if (appState[stateName] === undefined) {
    appState[stateName] = cloneDeep(defaultState);
    appState.save();
  }

  // if defaultState isn't defined or if defaultState matches the current value
  // stored in the URL in appState then return appState as is.
  if (defaultState === undefined || appState[stateName] === defaultState) {
    return appState;
  }

  // If defaultState is defined, check if the keys of the defaultState
  // match the one from appState, if not, fall back to the defaultState.
  // If we didn't do this, the structure of an out-of-date appState
  // might break some follow up code. Note that this will not catch any
  // deeper nested inconsistencies. this does two checks:
  // - if defaultState is an object, check if current appState has the same keys.
  // - if it's not an object, check if defaultState and current appState are of the same type.
  if (
    (typeof defaultState === 'object' && !hasEqualKeys(defaultState, appState[stateName])) ||
    typeof defaultState !== typeof appState[stateName]
  ) {
    appState[stateName] = cloneDeep(defaultState);
    appState.save();
  }

  return appState;
}

// Some components like the show-chart-checkbox or severity/interval-dropdowns
// emit their state change to an observable. This utility function can be used
// to persist these state changes to AppState and save the state to the url.
// distinctUntilChanged() makes sure the callback is only triggered upon changes
// of the state and filters consecutive triggers of the same value.
export function subscribeAppStateToObservable(AppState, appStateName, o$, callback) {
  const appState = initializeAppState(AppState, appStateName, o$.getValue());

  o$.next(appState[appStateName]);

  const subscription = o$.pipe(distinctUntilChanged()).subscribe(payload => {
    appState.fetch();
    appState[appStateName] = payload;
    appState.save();
    if (typeof callback === 'function') {
      callback(payload);
    }
  });

  return subscription;
}
