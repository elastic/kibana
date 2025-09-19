/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Store } from 'redux';
import type { MapState } from './map';
import type { MapUiState } from './ui';
import type { NonSerializableState } from './non_serializable_instances';

export interface MapStoreState {
  ui: MapUiState;
  map: MapState;
  nonSerializableInstances: NonSerializableState;
}

export type MapStore = Store<MapStoreState>;

export function createMapStore(): MapStore;

export const DEFAULT_MAP_STORE_STATE: MapStoreState;
