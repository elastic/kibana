/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import querystring from 'querystring';
import { get } from 'lodash';
// @ts-ignore untyped local
import { getInitialState } from '../state/initial_state';
import { getWindow } from './get_window';
// @ts-ignore untyped local
import { historyProvider } from './history_provider';
// @ts-ignore untyped local
import { routerProvider } from './router_provider';

export enum AppStateKeys {
  FULLSCREEN = '__fullscreen',
  REFRESH_INTERVAL = '__refresh',
  AUTOPLAY_INTERVAL = '__autoplay',
}

export interface AppState {
  [AppStateKeys.FULLSCREEN]?: boolean;
  [AppStateKeys.REFRESH_INTERVAL]?: number;
  [AppStateKeys.AUTOPLAY_INTERVAL]?: number;
}

function getDefaultState(): AppState {
  const transientState = getInitialState('transient');
  const state: AppState = {};

  if (transientState.fullscreen) {
    state[AppStateKeys.FULLSCREEN] = true;
  }

  if (transientState.refresh.interval > 0) {
    state[AppStateKeys.REFRESH_INTERVAL] = transientState.refresh.interval / 1000;
  }

  if (transientState.autoplay.enabled) {
    state[AppStateKeys.AUTOPLAY_INTERVAL] = transientState.autoplay.interval / 1000;
  }

  return state;
}

export function getCurrentAppState(): AppState {
  const history = historyProvider(getWindow());
  const { search } = history.getLocation();
  const qs = !!search ? querystring.parse(search.replace(/^\?/, '')) : {};
  const appState = assignAppState({}, qs);

  return appState;
}

export function getAppState(key?: string): AppState {
  const appState = { ...getDefaultState(), ...getCurrentAppState() };
  return key ? get(appState, key) : appState;
}

export function assignAppState(obj: AppState & { [key: string]: any }, appState: AppState) {
  const fullscreen = appState[AppStateKeys.FULLSCREEN];
  const refreshKey = appState[AppStateKeys.REFRESH_INTERVAL];
  const autoplayKey = appState[AppStateKeys.AUTOPLAY_INTERVAL];

  if (fullscreen) {
    obj[AppStateKeys.FULLSCREEN] = true;
  } else {
    delete obj[AppStateKeys.FULLSCREEN];
  }

  if (refreshKey) {
    const refresh = Array.isArray(refreshKey) ? refreshKey[0] : refreshKey;
    obj[AppStateKeys.REFRESH_INTERVAL] = parseInt(refresh, 10);
  } else {
    delete obj[AppStateKeys.REFRESH_INTERVAL];
  }

  if (autoplayKey) {
    const autoplay = Array.isArray(autoplayKey) ? autoplayKey[0] : autoplayKey;
    obj[AppStateKeys.AUTOPLAY_INTERVAL] = parseInt(autoplay, 10);
  } else {
    delete obj[AppStateKeys.AUTOPLAY_INTERVAL];
  }

  return obj;
}

export function setFullscreen(payload: boolean) {
  const appState = getAppState();
  const appValue = appState[AppStateKeys.FULLSCREEN];

  if (payload === false && appValue) {
    delete appState[AppStateKeys.FULLSCREEN];
    routerProvider().updateAppState(appState);
  } else if (payload === true && !appValue) {
    appState[AppStateKeys.FULLSCREEN] = true;
    routerProvider().updateAppState(appState);
  }
}

export function setAutoplayInterval(payload: number) {
  const appState = getAppState();
  const appValue = appState[AppStateKeys.AUTOPLAY_INTERVAL];

  if (payload !== appValue) {
    if (payload === 0 && appValue) {
      delete appState[AppStateKeys.AUTOPLAY_INTERVAL];
      routerProvider().updateAppState(appState);
    } else if (payload) {
      appState[AppStateKeys.AUTOPLAY_INTERVAL] = payload;
      routerProvider().updateAppState(appState);
    }
  }
}

export function setRefreshInterval(payload: number) {
  const appState = getAppState();
  const appValue = appState[AppStateKeys.REFRESH_INTERVAL];

  if (payload !== appValue) {
    appState[AppStateKeys.REFRESH_INTERVAL] = payload;
    routerProvider().updateAppState(appState);
  }
}
