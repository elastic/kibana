/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from '@kbn/rison';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import type { GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';
import type { Filter, Query } from '@kbn/es-query';
import { isFilterPinned } from '@kbn/es-query';
import { INITIAL_LAYERS_KEY, APP_ID } from '../../../common/constants';
import type { MapsAppLocatorDependencies, MapsAppLocatorParams } from './types';

export function getLocation(params: MapsAppLocatorParams, deps: MapsAppLocatorDependencies) {
  const { mapId, filters, query, refreshInterval, timeRange, initialLayers, hash } = params;
  const useHash = hash ?? deps.useHash;
  const appState: {
    query?: Query;
    filters?: Filter[];
    vis?: unknown;
  } = {};
  const queryState: GlobalQueryStateFromUrl = {};

  if (query) appState.query = query;
  if (filters && filters.length) appState.filters = filters?.filter((f) => !isFilterPinned(f));
  if (timeRange) queryState.time = timeRange;
  if (filters && filters.length) queryState.filters = filters?.filter((f) => isFilterPinned(f));
  if (refreshInterval) queryState.refreshInterval = refreshInterval;

  let path = `/map#/${mapId || ''}`;
  path = setStateToKbnUrl<GlobalQueryStateFromUrl>('_g', queryState, { useHash }, path);
  path = setStateToKbnUrl('_a', appState, { useHash }, path);

  if (initialLayers && initialLayers.length) {
    const risonEncodedInitialLayers = rison.encodeArray(initialLayers);
    path = `${path}&${INITIAL_LAYERS_KEY}=${encodeURIComponent(risonEncodedInitialLayers)}`;
  }

  return {
    app: APP_ID,
    path,
    state: params.dataViewSpec
      ? {
          dataViewSpec: params.dataViewSpec,
        }
      : {},
  };
}
