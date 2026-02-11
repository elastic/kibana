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
import { getLayerList } from '../selectors/map_selectors';

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

  // TODO update projectRoutingOverrides$ on layer changes when inline editing is implemented
  const projectRoutingOverrides$ = new BehaviorSubject<ProjectRoutingOverrides>(
    await getProjectRoutingOverrides(getLayerList(store.getState()))
  );

  return {
    api: {
      projectRoutingOverrides$,
    },
  };
}
