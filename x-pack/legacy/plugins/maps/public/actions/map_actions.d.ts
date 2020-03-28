/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { Filter, Query } from 'src/plugins/data/public';
import { AnyAction } from 'redux';
import { LAYER_TYPE } from '../../common/constants';
import { DataMeta, MapFilters } from '../../common/descriptor_types';

export type SyncContext = {
  startLoading(dataId: string, requestToken: symbol, meta: DataMeta): void;
  stopLoading(dataId: string, requestToken: symbol, data: unknown, meta: DataMeta): void;
  onLoadError(dataId: string, requestToken: symbol, errorMessage: string): void;
  updateSourceData(newData: unknown): void;
  isRequestStillActive(dataId: string, requestToken: symbol): boolean;
  registerCancelCallback(requestToken: symbol, callback: () => void): void;
  dataFilters: MapFilters;
};

export function updateSourceProp(
  layerId: string,
  propName: string,
  value: unknown,
  newLayerType?: LAYER_TYPE
): void;

export interface MapCenter {
  lat: number;
  lon: number;
  zoom: number;
}

export function setGotoWithCenter(config: MapCenter): AnyAction;

export function replaceLayerList(layerList: unknown[]): AnyAction;

export interface QueryGroup {
  filters: Filter[];
  query?: Query;
  timeFilters: unknown;
  refresh: unknown;
}

export function setQuery(query: QueryGroup): AnyAction;

export interface RefreshConfig {
  isPaused: boolean;
  interval: number;
}

export function setRefreshConfig(config: RefreshConfig): AnyAction;

export function disableScrollZoom(): AnyAction;

export function disableInteractive(): AnyAction;

export function disableTooltipControl(): AnyAction;

export function hideToolbarOverlay(): AnyAction;

export function hideLayerControl(): AnyAction;

export function hideViewControl(): AnyAction;

export function setHiddenLayers(hiddenLayerIds: string[]): AnyAction;

export function addLayerWithoutDataSync(layerDescriptor: unknown): AnyAction;
