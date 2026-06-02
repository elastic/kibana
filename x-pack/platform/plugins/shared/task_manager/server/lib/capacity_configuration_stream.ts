/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { BehaviorSubject, Observable, Subscription, of } from 'rxjs';
import { distinctUntilChanged, startWith } from 'rxjs';
import type { TaskManagerConfig } from '../config';
import { createCapacityScan } from './create_managed_configuration';
import type { ErrorScanResult } from './create_managed_configuration';
import { DynamicCapacityController } from './dynamic_capacity_controller';

interface CapacityConfigurationStreamOpts {
  config: TaskManagerConfig;
  logger: Logger;
  startingCapacity: number;
  errorCheck$: Observable<ErrorScanResult>;
  postClaimUtilizationPct$: Observable<number>;
  projectionUtilizationPct$?: Observable<number>;
}

export function createCapacityConfigurationStream({
  config,
  logger,
  startingCapacity,
  errorCheck$,
  postClaimUtilizationPct$,
  projectionUtilizationPct$,
}: CapacityConfigurationStreamOpts): Observable<number> {
  const elasticsearchManagedCapacity$ =
    config.adjust_capacity_for_elasticsearch_errors === true
      ? errorCheck$.pipe(
          createCapacityScan(config, logger, startingCapacity),
          startWith(startingCapacity),
          distinctUntilChanged()
        )
      : of(startingCapacity);

  const isDynamicCapacityEnabled = config.capacity === 'auto';
  if (!isDynamicCapacityEnabled) {
    return elasticsearchManagedCapacity$;
  }

  const capacity$ = new BehaviorSubject<number>(startingCapacity);
  const controller = new DynamicCapacityController({ config, logger, startingCapacity });

  const evaluateAndEmit = () => {
    const { changed, capacity } = controller.evaluate(Date.now());
    if (changed) {
      capacity$.next(capacity);
    }
  };

  const subscriptions = new Subscription();
  subscriptions.add(
    postClaimUtilizationPct$.pipe(startWith(0)).subscribe((utilizationPct) => {
      controller.setPostClaimUtilizationPct(utilizationPct);
    })
  );
  subscriptions.add(
    (projectionUtilizationPct$ ?? postClaimUtilizationPct$)
      .pipe(startWith(0))
      .subscribe((utilizationPct) => {
        controller.setProjectionUtilizationPct(utilizationPct);
      })
  );
  subscriptions.add(
    elasticsearchManagedCapacity$.subscribe((capacity) => {
      controller.setEsManagedCapacity(capacity);
      evaluateAndEmit();
    })
  );

  const intervalId = setInterval(evaluateAndEmit, config.dynamic_capacity.scale_interval_ms);

  return new Observable<number>((subscriber) => {
    const capacitySubscription = capacity$.pipe(distinctUntilChanged()).subscribe(subscriber);
    return () => {
      capacitySubscription.unsubscribe();
      clearInterval(intervalId);
      subscriptions.unsubscribe();
      controller.destroy();
    };
  });
}
