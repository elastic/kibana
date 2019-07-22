/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum AppStateKeys {
  FULLSCREEN = '__fullscreen',
  REFRESH_INTERVAL = '__refreshInterval',
  AUTOPLAY_INTERVAL = '__autoplayInterval',
}

export interface AppState {
  [AppStateKeys.FULLSCREEN]?: boolean;
  [AppStateKeys.REFRESH_INTERVAL]?: string;
  [AppStateKeys.AUTOPLAY_INTERVAL]?: string;
}
