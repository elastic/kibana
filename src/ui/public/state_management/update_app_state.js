import _ from 'lodash';

/**
 * Syncs values from pureState to appState, and then saves the appState so that changes are propagated.
 * Helps connect the angularized AppState with pure redux stores.
 *
 * @param appState {AppState} - An instance of AppState. Holds state and manages synchronization between the url,
 * angular and other apps.
 * @param pureState {Object} - a pure state tree (no functionality).
 */
export function updateAppState(appState, pureState) {
  for (const key in pureState) {
    if (pureState.hasOwnProperty(key)) {
      appState[key] = _.cloneDeep(pureState[key]);
    }
  }
  appState.save();
}
