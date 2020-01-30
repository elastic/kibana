/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { TimefilterSetup } from 'src/plugins/data/public';
import { IUiSettingsClient, ChromeStart } from 'src/core/public';
import { IndexPatternsContract } from 'src/plugins/data/public';
import { PageDependencies } from '../routing/router';

interface DependencyCache {
  timefilter: TimefilterSetup | null;
  config: IUiSettingsClient | null;
  indexPatterns: IndexPatternsContract | null;
  chrome: ChromeStart | null;
}

const cache: DependencyCache = {
  timefilter: null,
  config: null,
  indexPatterns: null,
  chrome: null,
};

export function useDependencyCache(dep: PageDependencies) {
  useEffect(() => {
    cache.timefilter = dep.timefilter;
    cache.config = dep.config;
    cache.chrome = dep.chrome;
    cache.indexPatterns = dep.indexPatterns;
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
    cache.indexPatterns === null
  ) {
    throw new Error();
  }
  return {
    timefilter: cache.timefilter,
    config: cache.config,
    chrome: cache.chrome,
    indexPatterns: cache.indexPatterns,
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

export function clearCache() {
  console.log('clearing cache'); // eslint-disable-line no-console
  Object.keys(cache).forEach(k => {
    cache[k as keyof DependencyCache] = null;
  });
}
