/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { BehaviorSubject, map, merge, skip } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { getESQLQueryVariables } from '@kbn/esql-utils';
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
import { createAppRuntime } from './runtime/app_runtime';
import { AppRuntimeContext } from './runtime/app_runtime_context';
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
      getParameterNames: (query) => getESQLQueryVariables(query),
    });
    dataLayer.setSources(initialState.document.dataSources);
    const runtime = createAppRuntime(initialState.document);
    // Emits the defaults straight away, then every change a user makes.
    const stateSubscription = runtime.state$.subscribe(dataLayer.setState);

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

    // Discarding unsaved changes swaps the document; the runtime and the sources follow it.
    const documentSubscription = document$.pipe(skip(1)).subscribe((document) => {
      runtime.setDocument(document);
      dataLayer.setSources(document.dataSources);
    });

    return {
      api,
      Component: function CustomAppEmbeddableComponent() {
        const [document] = useBatchedPublishingSubjects(document$);

        // Subscribed here rather than when the panel is built so that the nodes below, whose
        // effects run first, have already declared the sources they read when the first fetch
        // arrives. The dashboard's time range, filters and reloads reach every node through
        // this one subscription.
        useEffect(() => {
          const fetchSubscription = fetch$(api).subscribe(dataLayer.refresh);
          return () => fetchSubscription.unsubscribe();
        }, []);

        useEffect(
          () => () => {
            stateSubscription.unsubscribe();
            documentSubscription.unsubscribe();
            dataLayer.destroy();
          },
          []
        );

        return (
          <AppRuntimeContext.Provider value={runtime}>
            <DataLayerContext.Provider value={dataLayer}>
              <NodeRenderer node={document.root} />
            </DataLayerContext.Provider>
          </AppRuntimeContext.Provider>
        );
      },
    };
  },
};
