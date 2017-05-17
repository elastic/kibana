import { GETTING_STARTED_OPT_OUT_FLAG } from './constants';

export function hasOptedOutOfGettingStarted() {
  return Boolean(window.localStorage.getItem(GETTING_STARTED_OPT_OUT_FLAG));
}

export function optOutOfGettingStarted() {
  window.localStorage.setItem(GETTING_STARTED_OPT_OUT_FLAG, true);
}

/**
 * This function is intended for unit testing
 */
export function undoOptOutOfGettingStarted() {
  window.localStorage.removeItem(GETTING_STARTED_OPT_OUT_FLAG);
}