/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { BehaviorSubject, distinctUntilChanged, map, merge, skip } from 'rxjs';
import deepEqual from 'fast-deep-equal';
import { i18n } from '@kbn/i18n';
import type {
  DefaultEmbeddableApi,
  EmbeddablePublicDefinition,
} from '@kbn/embeddable-plugin/public';
import {
  fetch$,
  initializeStateApi,
  initializeTimeRangeManager,
  initializeTitleManager,
  timeRangeComparators,
  titleComparators,
  useBatchedPublishingSubjects,
  type HasTypeDisplayName,
  type PublishesDataLoading,
  type PublishesWritableTimeRange,
} from '@kbn/presentation-publishing';
import {
  CUSTOM_APP_EMBEDDABLE_TYPE,
  CUSTOM_APP_STATE_VERSION,
  type AppDocument,
} from '@kbn/custom-app-common';
import type { CustomAppEmbeddableState } from '../server';
import { NodeRenderer } from './components/node_renderer';
import { createDataLayer } from './data/data_layer';
import { DataLayerContext } from './data/data_layer_context';
import { createRunEsqlQuery } from './data/run_esql_query';
import { getServices } from './services';

export type CustomAppApi = DefaultEmbeddableApi<CustomAppEmbeddableState> &
  HasTypeDisplayName &
  PublishesDataLoading &
  PublishesWritableTimeRange;

export const customAppEmbeddableFactory: EmbeddablePublicDefinition<
  CustomAppEmbeddableState,
  CustomAppApi
> = {
  type: CUSTOM_APP_EMBEDDABLE_TYPE,
  buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
    const { core, search } = getServices();
    const titleManager = initializeTitleManager(initialState);
    const timeRangeManager = initializeTimeRangeManager(initialState);
    const document$ = new BehaviorSubject<AppDocument>(initialState.document);

    const dataLayer = createDataLayer({
      runQuery: createRunEsqlQuery({ search, http: core.http }),
    });
    dataLayer.setSources(initialState.document.dataSources);

    const serializeState = (): CustomAppEmbeddableState => ({
      ...titleManager.getLatestState(),
      ...timeRangeManager.getLatestState(),
      version: CUSTOM_APP_STATE_VERSION,
      document: document$.getValue(),
    });

    const stateApi = initializeStateApi<CustomAppEmbeddableState>({
      uuid,
      parentApi,
      serializeState,
      anyStateChange$: merge(
        titleManager.anyStateChange$,
        timeRangeManager.anyStateChange$,
        document$.pipe(
          skip(1),
          map(() => undefined)
        )
      ),
      getComparators: () => ({
        ...titleComparators,
        ...timeRangeComparators,
        version: 'skip',
        document: 'deepEquality',
      }),
      applySerializedState: (lastSaved) => {
        titleManager.reinitializeState(lastSaved ?? {});
        timeRangeManager.reinitializeState(lastSaved ?? {});
        if (lastSaved) document$.next(lastSaved.document);
      },
    });

    const api = finalizeApi({
      ...stateApi,
      ...titleManager.api,
      ...timeRangeManager.api,
      dataLoading$: dataLayer.loading$,
      serializeState,
      getTypeDisplayName: () =>
        i18n.translate('xpack.customApp.embeddable.typeDisplayName', {
          defaultMessage: 'Custom app',
        }),
    });

    // The dashboard's time range, filters and reloads reach every node through this one
    // subscription; nodes only ever read their source's state.
    const fetchSubscription = fetch$(api).subscribe(dataLayer.refresh);
    const sourcesSubscription = document$
      .pipe(
        map(({ dataSources }) => dataSources),
        distinctUntilChanged(deepEqual),
        skip(1)
      )
      .subscribe(dataLayer.setSources);

    return {
      api,
      Component: function CustomAppEmbeddableComponent() {
        const [document] = useBatchedPublishingSubjects(document$);

        useEffect(
          () => () => {
            fetchSubscription.unsubscribe();
            sourcesSubscription.unsubscribe();
            dataLayer.destroy();
          },
          []
        );

        return (
          <DataLayerContext.Provider value={dataLayer}>
            <NodeRenderer node={document.root} />
          </DataLayerContext.Provider>
        );
      },
    };
  },
};
