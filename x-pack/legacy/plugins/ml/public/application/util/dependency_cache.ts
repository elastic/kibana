/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimefilterSetup } from 'src/plugins/data/public';
import {
  IUiSettingsClient,
  ChromeStart,
  SavedObjectsClientContract,
  ApplicationStart,
  HttpStart,
} from 'src/core/public';
import {
  IndexPatternsContract,
  FieldFormatsStart,
  DataPublicPluginStart,
} from 'src/plugins/data/public';
import {
  DocLinksStart,
  ToastsStart,
  OverlayStart,
  ChromeRecentlyAccessed,
  IBasePath,
} from 'kibana/public';

// export interface AppDependencies {
//   config: IUiSettingsClient;
//   indexPatterns: IndexPatternsContract;
//   timefilter: TimefilterSetup;
//   chrome: ChromeStart;
//   docLinks: DocLinksStart;
//   toastNotifications: ToastsStart;
//   overlays: OverlayStart;
//   recentlyAccessed: ChromeRecentlyAccessed;
//   fieldFormats: FieldFormatsStart;
//   autocomplete: DataPublicPluginStart['autocomplete'];
//   basePath: IBasePath;
//   savedObjectsClient: SavedObjectsClientContract;
//   XSRF: string;
//   APP_URL: string;
//   application: ApplicationStart;
//   http: HttpStart;
// }

export interface DependencyCache {
  timefilter: TimefilterSetup | null;
  config: IUiSettingsClient | null;
  indexPatterns: IndexPatternsContract | null;
  chrome: ChromeStart | null;
  docLinks: DocLinksStart | null;
  toastNotifications: ToastsStart | null;
  overlays: OverlayStart | null;
  recentlyAccessed: ChromeRecentlyAccessed | null;
  fieldFormats: FieldFormatsStart | null;
  autocomplete: DataPublicPluginStart['autocomplete'] | null;
  basePath: IBasePath | null;
  savedObjectsClient: SavedObjectsClientContract | null;
  XSRF: string | null;
  APP_URL: string | null;
  application: ApplicationStart | null;
  http: HttpStart | null;
}

const cache: DependencyCache = {
  timefilter: null,
  config: null,
  indexPatterns: null,
  chrome: null,
  docLinks: null,
  toastNotifications: null,
  overlays: null,
  recentlyAccessed: null,
  fieldFormats: null,
  autocomplete: null,
  basePath: null,
  savedObjectsClient: null,
  XSRF: null,
  APP_URL: null,
  application: null,
  http: null,
};

export function setDependencyCache(deps: DependencyCache) {
  cache.timefilter = deps.timefilter;
  cache.config = deps.config;
  cache.chrome = deps.chrome;
  cache.indexPatterns = deps.indexPatterns;
  cache.docLinks = deps.docLinks;
  cache.toastNotifications = deps.toastNotifications;
  cache.overlays = deps.overlays;
  cache.recentlyAccessed = deps.recentlyAccessed;
  cache.fieldFormats = deps.fieldFormats;
  cache.autocomplete = deps.autocomplete;
  cache.basePath = deps.basePath;
  cache.savedObjectsClient = deps.savedObjectsClient;
  cache.XSRF = deps.XSRF;
  cache.APP_URL = deps.APP_URL;
  cache.application = deps.application;
  cache.http = deps.http;
}

// this isn't used and might never be needed
export function getDependencyCache(): Readonly<DependencyCache> {
  if (
    cache.timefilter === null ||
    cache.config === null ||
    cache.chrome === null ||
    cache.indexPatterns === null ||
    cache.docLinks === null ||
    cache.toastNotifications === null ||
    cache.overlays === null ||
    cache.recentlyAccessed === null ||
    cache.fieldFormats === null ||
    cache.autocomplete === null ||
    cache.basePath === null ||
    cache.savedObjectsClient === null ||
    cache.XSRF === null ||
    cache.APP_URL === null ||
    cache.application === null ||
    cache.http === null
  ) {
    throw new Error();
  }
  return {
    timefilter: cache.timefilter,
    config: cache.config,
    chrome: cache.chrome,
    indexPatterns: cache.indexPatterns,
    docLinks: cache.docLinks,
    toastNotifications: cache.toastNotifications,
    overlays: cache.overlays,
    recentlyAccessed: cache.recentlyAccessed,
    fieldFormats: cache.fieldFormats,
    autocomplete: cache.autocomplete,
    basePath: cache.basePath,
    savedObjectsClient: cache.savedObjectsClient,
    XSRF: cache.XSRF,
    APP_URL: cache.APP_URL,
    application: cache.application,
    http: cache.http,
  };
}

export function getTimefilter() {
  if (cache.timefilter === null) {
    throw new Error();
  }
  return cache.timefilter.timefilter;
}
export function getTimeHistory() {
  if (cache.timefilter === null) {
    throw new Error();
  }
  return cache.timefilter.history;
}

export function getDocLinks() {
  if (cache.docLinks === null) {
    throw new Error();
  }
  return cache.docLinks;
}

export function getToastNotifications() {
  if (cache.toastNotifications === null) {
    throw new Error();
  }
  return cache.toastNotifications;
}

export function getOverlays() {
  if (cache.overlays === null) {
    throw new Error();
  }
  return cache.overlays;
}

export function getUiSettings() {
  if (cache.config === null) {
    throw new Error();
  }
  return cache.config;
}

export function getRecentlyAccessed() {
  if (cache.recentlyAccessed === null) {
    throw new Error();
  }
  return cache.recentlyAccessed;
}

export function getFieldFormats() {
  if (cache.fieldFormats === null) {
    throw new Error();
  }
  return cache.fieldFormats;
}

export function getAutocomplete() {
  if (cache.autocomplete === null) {
    throw new Error();
  }
  return cache.autocomplete;
}

export function getChrome() {
  if (cache.chrome === null) {
    throw new Error();
  }
  return cache.chrome;
}

export function getBasePath() {
  if (cache.basePath === null) {
    throw new Error();
  }
  return cache.basePath;
}

export function getSavedObjectsClient() {
  if (cache.savedObjectsClient === null) {
    throw new Error();
  }
  return cache.savedObjectsClient;
}

export function getXSRF() {
  if (cache.XSRF === null) {
    throw new Error();
  }
  return cache.XSRF;
}

export function getAppUrl() {
  if (cache.APP_URL === null) {
    throw new Error();
  }
  return cache.APP_URL;
}

export function getApplication() {
  if (cache.application === null) {
    throw new Error();
  }
  return cache.application;
}

export function getHttp() {
  if (cache.http === null) {
    throw new Error();
  }
  return cache.http;
}

export function clearCache() {
  console.log('clearing cache'); // eslint-disable-line no-console
  Object.keys(cache).forEach(k => {
    cache[k as keyof DependencyCache] = null;
  });
}
