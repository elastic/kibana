/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { RuleFormServices } from '@kbn/alerting-v2-rule-form';

const servicesReady$ = new BehaviorSubject<RuleFormServices | undefined>(undefined);

export const untilPluginStartServicesReady = (): Promise<RuleFormServices> => {
  if (servicesReady$.value) return Promise.resolve(servicesReady$.value);
  return new Promise<RuleFormServices>((resolve) => {
    const sub = servicesReady$.subscribe((deps) => {
      if (deps) {
        sub.unsubscribe();
        resolve(deps);
      }
    });
  });
};

export const setKibanaServices = (services: RuleFormServices) => {
  servicesReady$.next(services);
};
