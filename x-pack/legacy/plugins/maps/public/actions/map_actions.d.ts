/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { Filter, Query } from 'src/plugins/data/public';
import { AnyAction } from 'redux';
import { LAYER_TYPE } from '../../common/constants';
import { DataMeta, MapFilters } from '../../common/data_request_descriptor_types';

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
  lat: string;
  lon: string;
  zoom: unknown;
}

export function setGotoWithCenter(config: MapCenter): AnyAction;

export function replaceLayerList(layerList: unknown): AnyAction;

export interface QueryGroup {
  filters: Filter[];
  query?: Query;
  timeFilters: unknown;
  refresh: unknown;
}

export function setQuery(query: QueryGroup): AnyAction;

export interface RefreshConfig {
  isPaused: boolean;
  interval: unknown;
}

export function setRefreshConfig(config: RefreshConfig): AnyAction;

export function disableScrollZoom(): AnyAction;

export function disableInteractive(disable: boolean): AnyAction;

export function disableTooltipControl(disable: boolean): AnyAction;

export function hideToolbarOverlay(hide: boolean): AnyAction;

export function hideLayerControl(hide: boolean): AnyAction;

export function hideViewControl(hide: boolean): AnyAction;

export function setHiddenLayers(layer: unknown): AnyAction;

export function addLayerWithoutDataSync(layer: unknown): AnyAction;
