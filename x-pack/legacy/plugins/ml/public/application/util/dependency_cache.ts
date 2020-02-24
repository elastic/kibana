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
import { IndexPatternsContract, DataPublicPluginStart } from 'src/plugins/data/public';
import {
  DocLinksStart,
  ToastsStart,
  OverlayStart,
  ChromeRecentlyAccessed,
  IBasePath,
} from 'kibana/public';

export interface DependencyCache {
  timefilter: TimefilterSetup | null;
  config: IUiSettingsClient | null;
  indexPatterns: IndexPatternsContract | null;
  chrome: ChromeStart | null;
  docLinks: DocLinksStart | null;
  toastNotifications: ToastsStart | null;
  overlays: OverlayStart | null;
  recentlyAccessed: ChromeRecentlyAccessed | null;
  fieldFormats: DataPublicPluginStart['fieldFormats'] | null;
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

export function setDependencyCache(deps: Partial<DependencyCache>) {
  cache.timefilter = deps.timefilter || null;
  cache.config = deps.config || null;
  cache.chrome = deps.chrome || null;
  cache.indexPatterns = deps.indexPatterns || null;
  cache.docLinks = deps.docLinks || null;
  cache.toastNotifications = deps.toastNotifications || null;
  cache.overlays = deps.overlays || null;
  cache.recentlyAccessed = deps.recentlyAccessed || null;
  cache.fieldFormats = deps.fieldFormats || null;
  cache.autocomplete = deps.autocomplete || null;
  cache.basePath = deps.basePath || null;
  cache.savedObjectsClient = deps.savedObjectsClient || null;
  cache.XSRF = deps.XSRF || null;
  cache.APP_URL = deps.APP_URL || null;
  cache.application = deps.application || null;
  cache.http = deps.http || null;
}

export function getTimefilter() {
  if (cache.timefilter === null) {
    throw new Error("timefilter hasn't been initialized");
  }
  return cache.timefilter.timefilter;
}
export function getTimeHistory() {
  if (cache.timefilter === null) {
    throw new Error("timefilter hasn't been initialized");
  }
  return cache.timefilter.history;
}

export function getDocLinks() {
  if (cache.docLinks === null) {
    throw new Error("docLinks hasn't been initialized");
  }
  return cache.docLinks;
}

export function getToastNotifications() {
  if (cache.toastNotifications === null) {
    throw new Error("toast notifications haven't been initialized");
  }
  return cache.toastNotifications;
}

export function getOverlays() {
  if (cache.overlays === null) {
    throw new Error("overlays haven't been initialized");
  }
  return cache.overlays;
}

export function getUiSettings() {
  if (cache.config === null) {
    throw new Error("uiSettings hasn't been initialized");
  }
  return cache.config;
}

export function getRecentlyAccessed() {
  if (cache.recentlyAccessed === null) {
    throw new Error("recentlyAccessed hasn't been initialized");
  }
  return cache.recentlyAccessed;
}

export function getFieldFormats() {
  if (cache.fieldFormats === null) {
    throw new Error("fieldFormats hasn't been initialized");
  }
  return cache.fieldFormats;
}

export function getAutocomplete() {
  if (cache.autocomplete === null) {
    throw new Error("autocomplete hasn't been initialized");
  }
  return cache.autocomplete;
}

export function getChrome() {
  if (cache.chrome === null) {
    throw new Error("chrome hasn't been initialized");
  }
  return cache.chrome;
}

export function getBasePath() {
  if (cache.basePath === null) {
    throw new Error("basePath hasn't been initialized");
  }
  return cache.basePath;
}

export function getSavedObjectsClient() {
  if (cache.savedObjectsClient === null) {
    throw new Error("savedObjectsClient hasn't been initialized");
  }
  return cache.savedObjectsClient;
}

export function getXSRF() {
  if (cache.XSRF === null) {
    throw new Error("xsrf hasn't been initialized");
  }
  return cache.XSRF;
}

export function getAppUrl() {
  if (cache.APP_URL === null) {
    throw new Error("app url hasn't been initialized");
  }
  return cache.APP_URL;
}

export function getApplication() {
  if (cache.application === null) {
    throw new Error("application hasn't been initialized");
  }
  return cache.application;
}

export function getHttp() {
  if (cache.http === null) {
    throw new Error("http hasn't been initialized");
  }
  return cache.http;
}

export function clearCache() {
  console.log('clearing dependency cache'); // eslint-disable-line no-console
  Object.keys(cache).forEach(k => {
    cache[k as keyof DependencyCache] = null;
  });
}
