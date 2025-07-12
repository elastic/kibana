/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { CoreStart } from '@kbn/core/public';
import { StartDependencies } from '../plugin';

export let coreServices: CoreStart;
export let uiActionsEnhancedServices: StartDependencies['uiActionsEnhanced'];

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

export const setKibanaServices = (kibanaCore: CoreStart, plugins: StartDependencies) => {
  coreServices = kibanaCore;
  uiActionsEnhancedServices = plugins.uiActionsEnhanced;

  servicesReady$.next(true);
};
