/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asyncForEach } from '@kbn/std';
import type { ProjectRoutingOverrides } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
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

  // Initialize with undefined (no overrides yet, will update when store is ready)
  const projectRoutingOverrides$ = new BehaviorSubject<ProjectRoutingOverrides>(undefined);

  // Subscribe to store changes and update when layers are available
  const unsubscribeFromStore = store.subscribe(async () => {
    // Wait until the map is ready (this is when layers are loaded)
    if (!getMapReady(store.getState())) {
      return;
    }

    const layers = getLayerList(store.getState());
    const overrides = await getProjectRoutingOverrides(layers);

    // Update the subject with the new overrides (handles both initial load and layer changes)
    if (overrides !== projectRoutingOverrides$.value) {
      projectRoutingOverrides$.next(overrides);
    }
  });

  return {
    api: {
      projectRoutingOverrides$,
    },
    cleanup: () => {
      unsubscribeFromStore();
    },
  };
}
