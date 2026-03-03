/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';

import type { CoreStart } from '@kbn/core/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { DashboardAgentPluginPublicStartDependencies } from './types';

export let core: CoreStart;
export let unifiedSearch: UnifiedSearchPublicPluginStart;

const servicesReady$ = new BehaviorSubject(false);
export const untilPluginStartServicesReady = () => {
  if (servicesReady$.value) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const subscription = servicesReady$.subscribe((isInitialized) => {
      if (isInitialized) {
        subscription.unsubscribe();
        resolve();
      }
    });
  });
};

export const setKibanaServices = (
  kibanaCore: CoreStart,
  plugins: DashboardAgentPluginPublicStartDependencies
) => {
  core = kibanaCore;
  unifiedSearch = plugins.unifiedSearch;
  servicesReady$.next(true);
};
