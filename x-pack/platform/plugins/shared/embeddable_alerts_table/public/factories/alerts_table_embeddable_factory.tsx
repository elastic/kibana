/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { BehaviorSubject, map, merge } from 'rxjs';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import {
  initializeTimeRangeManager,
  initializeTitleManager,
  timeRangeComparators,
  titleComparators,
  useFetchContext,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import { QueryClientProvider } from '@kbn/react-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { initializeUnsavedChanges } from '@kbn/presentation-publishing';
import { openLazyFlyout } from '@kbn/presentation-util';
import { getRuleTypeIdsForSolution } from '@kbn/response-ops-alerts-filters-form/utils/solutions';
import { getInternalRuleTypesWithCache } from '../utils/get_internal_rule_types_with_cache';
import { ALERTS_PANEL_LABEL } from '../translations';
import type {
  EmbeddableAlertsTableApi,
  EmbeddableAlertsTableConfig,
  EmbeddableAlertsTablePublicStartDependencies,
  EmbeddableAlertsTableSerializedState,
} from '../types';
import { EMBEDDABLE_ALERTS_TABLE_ID, PERSISTED_TABLE_CONFIG_KEY_PREFIX } from '../constants';
import { EmbeddableAlertsTable } from '../components/embeddable_alerts_table';
import { queryClient } from '../query_client';

export const getAlertsTableEmbeddableFactory = (
  coreServices: CoreStart,
  deps: EmbeddableAlertsTablePublicStartDependencies
): EmbeddableFactory<EmbeddableAlertsTableSerializedState, EmbeddableAlertsTableApi> => ({
  type: EMBEDDABLE_ALERTS_TABLE_ID,
  buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
    const timeRangeManager = initializeTimeRangeManager(initialState);
    const titleManager = initializeTitleManager(initialState ?? {});
    const queryLoading$ = new BehaviorSubject<boolean | undefined>(true);
    const services = {
      ...coreServices,
      ...deps,
    };

    const initialTableConfig = initialState.tableConfig;
    const tableConfig$ = new BehaviorSubject<EmbeddableAlertsTableConfig>(initialTableConfig);

    const serializeState = () => ({
      ...titleManager.getLatestState(),
      ...timeRangeManager.getLatestState(),
      tableConfig: tableConfig$.getValue(),
    });

    const unsavedChangesApi = initializeUnsavedChanges({
      uuid,
      parentApi,
      anyStateChange$: merge(
        timeRangeManager.anyStateChange$,
        titleManager.anyStateChange$,
        tableConfig$
      ).pipe(map(() => undefined)),
      serializeState,
      getComparators: () => ({
        ...titleComparators,
        ...timeRangeComparators,
        tableConfig: 'deepEquality',
      }),
      onReset: (lastSaved) => {
        titleManager.reinitializeState(lastSaved);
        timeRangeManager.reinitializeState(lastSaved);
      },
    });

    const ruleTypes = await getInternalRuleTypesWithCache(coreServices.http);
    const ruleTypeIdsForSolution =
      !ruleTypes || !initialTableConfig?.solution
        ? []
        : getRuleTypeIdsForSolution(ruleTypes, initialTableConfig.solution);

    const api = finalizeApi({
      ...timeRangeManager.api,
      ...titleManager.api,
      ...unsavedChangesApi,
      dataLoading$: queryLoading$,
      serializeState,
      isEditingEnabled: () => {
        // Users cannot edit panels based on a solution they cannot access.
        // The first condition ensures panels are editable even if the table configuration is
        // unexpectedly undefined or incomplete
        return !initialTableConfig?.solution || ruleTypeIdsForSolution.length > 0;
      },
      getTypeDisplayName: () => ALERTS_PANEL_LABEL,
      onEdit: async () => {
        try {
          openLazyFlyout({
            core: coreServices,
            parentApi: api.parentApi,
            loadContent: async ({ closeFlyout, ariaLabelledBy }) => {
              const { ConfigEditor } = await import('../components/config_editor');
              return (
                <ConfigEditor
                  initialConfig={tableConfig$.getValue()}
                  ariaLabelledBy={ariaLabelledBy}
                  coreServices={coreServices}
                  closeFlyout={closeFlyout}
                  onSave={(newConfig: EmbeddableAlertsTableConfig) => {
                    tableConfig$.next(newConfig);
                  }}
                />
              );
            },
          });
        } catch {
          // The user closed without saving, discard the edits
        }
      },
    });

    return {
      api,
      Component: () => {
        const { timeRange: selectedTimeRange } = useFetchContext(api);
        const tableConfig = useStateFromPublishingSubject(tableConfig$);

        return (
          <KibanaContextProvider services={services}>
            <QueryClientProvider client={queryClient}>
              <EmbeddableAlertsTable
                id={`${PERSISTED_TABLE_CONFIG_KEY_PREFIX}-${uuid}`}
                timeRange={selectedTimeRange}
                solution={tableConfig?.solution}
                query={tableConfig?.query}
                services={services}
              />
            </QueryClientProvider>
          </KibanaContextProvider>
        );
      },
    };
  },
});
