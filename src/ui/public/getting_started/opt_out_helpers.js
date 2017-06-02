import uiChrome from 'ui/chrome';
import { GETTING_STARTED_OPT_OUT_FLAG } from './constants';

export function hasOptedOutOfGettingStarted() {
  return window.localStorage.getItem(GETTING_STARTED_OPT_OUT_FLAG) || false;
}

export function optOutOfGettingStarted() {
  window.localStorage.setItem(GETTING_STARTED_OPT_OUT_FLAG, true);
  uiChrome.setVisible(true);
}