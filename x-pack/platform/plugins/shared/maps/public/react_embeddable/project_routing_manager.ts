/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asyncForEach } from '@kbn/std';
import type { ProjectRoutingOverrides } from '@kbn/presentation-publishing';
import { BehaviorSubject, debounceTime, from, of, Subject, switchMap } from 'rxjs';
import type { Subscription } from 'rxjs';
import fastIsEqual from 'fast-deep-equal';
import type { ILayer } from '../classes/layers/layer';
import type { SavedMap } from '../routes';
import { getLayerList, getMapReady } from '../selectors/map_selectors';

async function getProjectRoutingOverrides(layers: ILayer[]) {
  const overrides: ProjectRoutingOverrides = [];
  await asyncForEach(layers, async (layer) => {
    const layerOverrides = await layer.getProjectRoutingOverrides?.();
    if (layerOverrides) {
      overrides.push(...layerOverrides);
    }
  });
  return overrides.length > 0 ? overrides : undefined;
}

export async function initializeProjectRoutingManager(savedMap: SavedMap) {
  const store = savedMap.getStore();
  const projectRoutingOverrides$ = new BehaviorSubject<ProjectRoutingOverrides>(undefined);
  const storeChanges$ = new Subject<void>();
  const unsubscribeFromStore = store.subscribe(() => {
    storeChanges$.next();
  });

  // Subscribe to store changes with debounce and switchMap to avoid race conditions
  const subscription: Subscription = storeChanges$
    .pipe(
      debounceTime(100),
      switchMap(() => {
        // Wait until the map is ready (this is when layers are loaded)
        if (!getMapReady(store.getState())) {
          return of(undefined);
        }

        const layers = getLayerList(store.getState());
        return from(getProjectRoutingOverrides(layers));
      })
    )
    .subscribe((overrides) => {
      if (!fastIsEqual(overrides, projectRoutingOverrides$.value)) {
        projectRoutingOverrides$.next(overrides);
      }
    });

  return {
    api: {
      projectRoutingOverrides$,
    },
    cleanup: () => {
      subscription.unsubscribe();
      unsubscribeFromStore();
    },
  };
}
