/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import deepEqual from 'react-fast-compare';
import { BehaviorSubject, filter, pairwise, startWith } from 'rxjs';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import type { PresentationContainer } from '@kbn/presentation-containers';
import {
  initializeTimeRange,
  initializeTitleManager,
  useBatchedPublishingSubjects,
  useFetchContext,
} from '@kbn/presentation-publishing';
import { QueryClientProvider } from '@tanstack/react-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { CONFIG_EDITOR_EDIT_TABLE_TITLE } from '../translations';
import type {
  EmbeddableAlertsTableApi,
  EmbeddableAlertsTableConfig,
  EmbeddableAlertsTablePublicStartDependencies,
  EmbeddableAlertsTableRuntimeState,
  EmbeddableAlertsTableSerializedState,
} from '../types';
import { openConfigEditor } from '../components/open_config_editor';
import { EMBEDDABLE_ALERTS_TABLE_ID, PERSISTED_TABLE_CONFIG_KEY_PREFIX } from '../constants';
import { EmbeddableAlertsTable } from '../components/embeddable_alerts_table';
import { queryClient } from '../query_client';

export const getAlertsTableEmbeddableFactory = (
  coreServices: CoreStart,
  deps: EmbeddableAlertsTablePublicStartDependencies
): ReactEmbeddableFactory<
  EmbeddableAlertsTableSerializedState,
  EmbeddableAlertsTableRuntimeState,
  EmbeddableAlertsTableApi
> => ({
  type: EMBEDDABLE_ALERTS_TABLE_ID,
  deserializeState: (state) => {
    return state.rawState;
  },
  buildEmbeddable: async (state, buildApi, uuid) => {
    const timeRange = initializeTimeRange(state);
    const titleManager = initializeTitleManager(state);
    const queryLoading$ = new BehaviorSubject<boolean | undefined>(true);
    const services = {
      ...coreServices,
      ...deps,
    };
    const tableConfig$ = new BehaviorSubject<EmbeddableAlertsTableConfig>(state.tableConfig);
    const api = buildApi(
      {
        ...timeRange.api,
        ...titleManager.api,
        dataLoading$: queryLoading$,
        isEditingEnabled: () => true,
        onEdit: async () => {
          try {
            const newTableConfig = await openConfigEditor({
              coreServices,
              parentApi: api.parentApi as PresentationContainer,
              initialConfig: tableConfig$.getValue(),
            });
            tableConfig$.next(newTableConfig);
          } catch {
            // The user closed without saving
          }
        },
        getTypeDisplayName: () => CONFIG_EDITOR_EDIT_TABLE_TITLE,
        serializeState: () => {
          return {
            rawState: {
              ...titleManager.serialize(),
              ...timeRange.serialize(),
              tableConfig: tableConfig$.getValue(),
            },
          };
        },
      },
      {
        ...titleManager.comparators,
        ...timeRange.comparators,
        tableConfig: [tableConfig$, (value) => tableConfig$.next(value), (a, b) => deepEqual(a, b)],
      }
    );
    const persistedTableConfigKey = `${PERSISTED_TABLE_CONFIG_KEY_PREFIX}-${uuid}`;
    const onDeleteSubscription = api.parentApi?.children$
      ?.pipe(
        startWith(null),
        pairwise(),
        filter(
          // Since the panels api doesn't have a way to listen to panel deletions
          // we have to listen to the children$ stream and check if the panel was removed
          ([prevChildren, currentChildren]) => !!prevChildren?.[uuid] && !currentChildren?.[uuid]
        )
      )
      ?.subscribe(() => {
        // Clean up the persisted table configuration when the panel
        // is deleted from the dashboard
        localStorage.removeItem(persistedTableConfigKey);
      });

    return {
      api,
      Component: () => {
        const { timeRange: selectedTimeRange } = useFetchContext(api);
        const [tableConfig] = useBatchedPublishingSubjects(tableConfig$);

        useEffect(() => {
          if (onDeleteSubscription) {
            return () => {
              onDeleteSubscription.unsubscribe();
            };
          }
        }, []);

        return (
          <KibanaContextProvider services={services}>
            <QueryClientProvider client={queryClient}>
              <EmbeddableAlertsTable
                id={persistedTableConfigKey}
                timeRange={selectedTimeRange}
                solution={tableConfig?.solution}
                filters={tableConfig?.filters}
                services={services}
              />
            </QueryClientProvider>
          </KibanaContextProvider>
        );
      },
    };
  },
});
