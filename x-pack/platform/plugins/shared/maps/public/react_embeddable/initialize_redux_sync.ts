/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import { BehaviorSubject, debounceTime, filter, map, merge } from 'rxjs';
import fastIsEqual from 'fast-deep-equal';
import type { PublishingSubject, StateComparators } from '@kbn/presentation-publishing';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type { PaletteRegistry } from '@kbn/coloring';
import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import type { MapCenterAndZoom } from '../../common/descriptor_types';
import { APP_ID, getEditPath, RENDER_TIMEOUT } from '../../common/constants';
import type { MapStoreState } from '../reducers/store';
import { getIsLayerTOCOpen, getOpenTOCDetails } from '../selectors/ui_selectors';
import {
  getLayerList,
  getLayerListRaw,
  getMapBuffer,
  getMapCenter,
  getMapReady,
  getMapZoom,
  isMapLoading,
} from '../selectors/map_selectors';
import {
  setEmbeddableSearchContext,
  setExecutionContext,
  setMapSettings,
  setQuery,
  setReadOnly,
} from '../actions';
import type { MapByReferenceState, MapEmbeddableState } from '../../common';
import { getCharts, getExecutionContextService } from '../kibana_services';
import type { EventHandlers } from '../reducers/non_serializable_instances';
import {
  getInspectorAdapters,
  setChartsPaletteServiceGetColor,
  setEventHandlers,
} from '../reducers/non_serializable_instances';
import type { SavedMap } from '../routes';

function getMapCenterAndZoom(state: MapStoreState) {
  return {
    ...getMapCenter(state),
    zoom: getMapZoom(state),
  };
}

function getHiddenLayerIds(state: MapStoreState) {
  return getLayerListRaw(state)
    .filter((layer) => !layer.visible)
    .map((layer) => layer.id);
}

export const reduxSyncComparators: StateComparators<
  Pick<
    MapEmbeddableState,
    'hiddenLayers' | 'isLayerTOCOpen' | 'mapCenter' | 'mapBuffer' | 'openTOCDetails'
  >
> = {
  hiddenLayers: 'deepEquality',
  isLayerTOCOpen: 'referenceEquality',
  mapCenter: (a, b) => {
    if (!a || !b) {
      return a === b;
    }

    if (a.lat !== b.lat) return false;
    if (a.lon !== b.lon) return false;
    // Map may not restore reset zoom exactly
    return Math.abs(a.zoom - b.zoom) < 0.05;
  },
  mapBuffer: 'skip',
  openTOCDetails: 'deepEquality',
};

export function initializeReduxSync({
  savedMap,
  state,
  syncColors$,
  uuid,
}: {
  savedMap: SavedMap;
  state: MapEmbeddableState;
  syncColors$?: PublishingSubject<boolean | undefined>;
  uuid: string;
}) {
  const store = savedMap.getStore();

  // initializing comparitor publishing subjects to state instead of store state values
  // because store is not settled until map is rendered and mapReady is true
  const hiddenLayers$ = new BehaviorSubject<string[]>(
    state.hiddenLayers ?? getHiddenLayerIds(store.getState())
  );
  const isLayerTOCOpen$ = new BehaviorSubject<boolean>(
    state.isLayerTOCOpen ?? getIsLayerTOCOpen(store.getState())
  );
  const mapCenterAndZoom$ = new BehaviorSubject<MapCenterAndZoom>(
    state.mapCenter ?? getMapCenterAndZoom(store.getState())
  );
  const openTOCDetails$ = new BehaviorSubject<string[]>(
    state.openTOCDetails ?? getOpenTOCDetails(store.getState())
  );
  const dataLoading$ = new BehaviorSubject<boolean | undefined>(undefined);

  const unsubscribeFromStore = store.subscribe(() => {
    if (!getMapReady(store.getState())) {
      return;
    }
    const nextHiddenLayers = getHiddenLayerIds(store.getState());
    if (!fastIsEqual(hiddenLayers$.value, nextHiddenLayers)) {
      hiddenLayers$.next(nextHiddenLayers);
    }

    const nextIsLayerTOCOpen = getIsLayerTOCOpen(store.getState());
    if (isLayerTOCOpen$.value !== nextIsLayerTOCOpen) {
      isLayerTOCOpen$.next(nextIsLayerTOCOpen);
    }

    const nextMapCenterAndZoom = getMapCenterAndZoom(store.getState());
    if (!fastIsEqual(mapCenterAndZoom$.value, nextMapCenterAndZoom)) {
      mapCenterAndZoom$.next(nextMapCenterAndZoom);
    }

    const nextOpenTOCDetails = getOpenTOCDetails(store.getState());
    if (!fastIsEqual(openTOCDetails$.value, nextOpenTOCDetails)) {
      openTOCDetails$.next(nextOpenTOCDetails);
    }

    const nextIsMapLoading = isMapLoading(store.getState());
    if (nextIsMapLoading !== dataLoading$.value) {
      dataLoading$.next(nextIsMapLoading);
    }
  });

  store.dispatch(setReadOnly(true));
  store.dispatch(
    setMapSettings({
      keydownScrollZoom: true,
      showTimesliderToggleButton: false,
    })
  );
  store.dispatch(
    setExecutionContext(getExecutionContext(uuid, (state as MapByReferenceState).savedObjectId))
  );

  const filters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
  const query$ = new BehaviorSubject<AggregateQuery | Query | undefined>(undefined);
  const { filters, query } = savedMap.getAttributes();
  if (filters) {
    filters$.next(filters);
  }
  if (query) {
    query$.next(query);
  }
  store.dispatch(
    setEmbeddableSearchContext({
      filters: filters ?? [],
      query,
    })
  );

  let syncColorsSubscription: Subscription | undefined;
  let syncColorsSymbol: symbol | undefined;
  if (syncColors$) {
    syncColorsSubscription = syncColors$.subscribe(async (syncColors: boolean | undefined) => {
      const currentSyncColorsSymbol = Symbol();
      syncColorsSymbol = currentSyncColorsSymbol;
      const chartsPaletteServiceGetColor = syncColors
        ? await getChartsPaletteServiceGetColor()
        : null;
      if (syncColorsSymbol === currentSyncColorsSymbol) {
        store.dispatch(setChartsPaletteServiceGetColor(chartsPaletteServiceGetColor));
      }
    });
  }

  return {
    cleanup: () => {
      if (syncColorsSubscription) syncColorsSubscription.unsubscribe();
      unsubscribeFromStore();
    },
    api: {
      dataLoading$,
      filters$,
      getInspectorAdapters: () => {
        return getInspectorAdapters(store.getState());
      },
      getLayerList: () => {
        return getLayerList(store.getState());
      },
      onRenderComplete$: dataLoading$.pipe(
        filter((isDataLoading) => typeof isDataLoading === 'boolean' && !isDataLoading),
        debounceTime(RENDER_TIMEOUT),
        map(() => {
          // Observable notifies subscriber when rendering is complete
          // Return void to not expose internal implemenation details of observabale
          return;
        })
      ),
      query$,
      reload: () => {
        store.dispatch<any>(
          setQuery({
            forceRefresh: true,
          })
        );
      },
      setEventHandlers: (eventHandlers: EventHandlers) => {
        store.dispatch(setEventHandlers(eventHandlers));
      },
    },
    anyStateChange$: merge(hiddenLayers$, isLayerTOCOpen$, mapCenterAndZoom$, openTOCDetails$).pipe(
      map(() => undefined)
    ),
    getLatestState: () => {
      return {
        hiddenLayers: hiddenLayers$.value,
        isLayerTOCOpen: isLayerTOCOpen$.value,
        mapBuffer: getMapBuffer(store.getState()),
        mapCenter: mapCenterAndZoom$.value,
        openTOCDetails: openTOCDetails$.value,
      };
    },
  };
}

function getExecutionContext(uuid: string, savedObjectId: string | undefined) {
  const parentContext = getExecutionContextService().get();
  const mapContext: KibanaExecutionContext = {
    type: APP_ID,
    name: APP_ID,
    id: uuid,
    url: getEditPath(savedObjectId),
  };

  return parentContext
    ? {
        ...parentContext,
        child: mapContext,
      }
    : mapContext;
}

async function getChartsPaletteServiceGetColor(): Promise<((value: string) => string) | null> {
  const chartsService = getCharts();
  const paletteRegistry: PaletteRegistry | null = chartsService
    ? await chartsService.palettes.getPalettes()
    : null;
  if (!paletteRegistry) {
    return null;
  }

  const paletteDefinition = paletteRegistry.get('default');
  const chartConfiguration = { syncColors: true };
  return (value: string) => {
    const series = [{ name: value, rankAtDepth: 0, totalSeriesAtDepth: 1 }];
    const color = paletteDefinition.getCategoricalColor(series, chartConfiguration);
    return color ? color : '#3d3d3d';
  };
}
