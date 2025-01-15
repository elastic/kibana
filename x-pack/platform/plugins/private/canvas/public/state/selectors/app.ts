/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { State } from '../../../types';

// page getters
export function canUserWrite(state: State): boolean {
  return get(state, 'transient.canUserWrite', true);
}

export function getFullscreen(state: State): boolean {
  return get(state, 'transient.fullscreen', false);
}

export function getZoomScale(state: State): number {
  return get(state, 'transient.zoomScale', 1);
}

export function getServerFunctions(state: State): State['app']['serverFunctions'] {
  return state.app.serverFunctions;
}

export function getAppReady(state: State): boolean {
  return state.app.ready;
}

export function getBasePath(state: State): State['app']['basePath'] {
  return state.app.basePath;
}

// return true only when the required parameters are in the state
export function isAppReady(state: State): boolean {
  const appReady = getAppReady(state);
  return appReady === true;
}
