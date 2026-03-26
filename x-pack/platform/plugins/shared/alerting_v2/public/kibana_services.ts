/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { Container } from 'inversify';
import type { RuleFormServices } from '@kbn/alerting-v2-rule-form';

const servicesReady$ = new BehaviorSubject<RuleFormServices | undefined>(undefined);
const containerReady$ = new BehaviorSubject<Container | undefined>(undefined);

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

export const untilContainerReady = (): Promise<Container> => {
  if (containerReady$.value) return Promise.resolve(containerReady$.value);
  return new Promise<Container>((resolve) => {
    const sub = containerReady$.subscribe((container) => {
      if (container) {
        sub.unsubscribe();
        resolve(container);
      }
    });
  });
};

export const setKibanaServices = (services: RuleFormServices) => {
  servicesReady$.next(services);
};

export const setContainer = (container: Container) => {
  containerReady$.next(container);
};
