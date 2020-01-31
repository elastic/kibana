/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { TimefilterSetup } from 'src/plugins/data/public';
import { IUiSettingsClient, ChromeStart } from 'src/core/public';
import { IndexPatternsContract } from 'src/plugins/data/public';
import { DocLinksStart, ToastsStart, OverlayStart } from 'kibana/public';
import { PageDependencies } from '../routing/router';

interface DependencyCache {
  timefilter: TimefilterSetup | null;
  config: IUiSettingsClient | null;
  indexPatterns: IndexPatternsContract | null;
  chrome: ChromeStart | null;
  docLinks: DocLinksStart | null;
  toastNotifications: ToastsStart | null;
  overlays: OverlayStart | null;
}

const cache: DependencyCache = {
  timefilter: null,
  config: null,
  indexPatterns: null,
  chrome: null,
  docLinks: null,
  toastNotifications: null,
  overlays: null,
};

export function useDependencyCache(dep: PageDependencies) {
  cache.timefilter = dep.timefilter;
  cache.config = dep.config;
  cache.chrome = dep.chrome;
  cache.indexPatterns = dep.indexPatterns;
  cache.docLinks = dep.docLinks;
  cache.toastNotifications = dep.toastNotifications;
  cache.overlays = dep.overlays;

  useEffect(() => {
    return () => {
      clearCache();
    };
  }, []);
}

export function getDependencyCache(): Readonly<PageDependencies> {
  if (
    cache.timefilter === null ||
    cache.config === null ||
    cache.chrome === null ||
    cache.indexPatterns === null ||
    cache.docLinks === null ||
    cache.toastNotifications === null ||
    cache.overlays === null
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

export function clearCache() {
  console.log('clearing cache'); // eslint-disable-line no-console
  Object.keys(cache).forEach(k => {
    cache[k as keyof DependencyCache] = null;
  });
}
