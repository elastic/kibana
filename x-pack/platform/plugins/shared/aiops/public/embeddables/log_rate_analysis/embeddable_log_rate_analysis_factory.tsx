/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE,
  LOG_RATE_ANALYSIS_DATA_VIEW_REF_NAME,
} from '@kbn/aiops-log-rate-analysis/constants';
import type { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  type SerializedPanelState,
  apiHasExecutionContext,
  apiPublishesFilters,
  fetch$,
  initializeTimeRangeManager,
  initializeTitleManager,
  useBatchedPublishingSubjects,
  titleComparators,
  timeRangeComparators,
} from '@kbn/presentation-publishing';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';

import fastIsEqual from 'fast-deep-equal';
import { cloneDeep } from 'lodash';
import React, { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { BehaviorSubject, distinctUntilChanged, map, merge, skipWhile } from 'rxjs';
import { getLogRateAnalysisEmbeddableWrapperComponent } from '../../shared_components';
import type { AiopsPluginStart, AiopsPluginStartDeps } from '../../types';
import { initializeLogRateAnalysisControls } from './initialize_log_rate_analysis_analysis_controls';
import type { LogRateAnalysisEmbeddableApi, LogRateAnalysisEmbeddableState } from './types';
import { getDataviewReferences } from '../get_dataview_references';

export type EmbeddableLogRateAnalysisType = typeof EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE;

const deserializeState = (
  serializedState?: SerializedPanelState<LogRateAnalysisEmbeddableState>
) => {
  const state = serializedState?.rawState
    ? cloneDeep(serializedState?.rawState)
    : ({} as LogRateAnalysisEmbeddableState);
  // inject the reference
  const dataViewIdRef = serializedState?.references?.find(
    (ref) => ref.name === LOG_RATE_ANALYSIS_DATA_VIEW_REF_NAME
  );
  // if the serializedState already contains a dataViewId, we don't want to overwrite it. (Unsaved state can cause this)
  if (dataViewIdRef && state && !state.dataViewId) {
    state.dataViewId = dataViewIdRef?.id;
  }
  return state;
};

export const getLogRateAnalysisEmbeddableFactory = (
  getStartServices: StartServicesAccessor<AiopsPluginStartDeps, AiopsPluginStart>
) => {
  const factory: EmbeddableFactory<LogRateAnalysisEmbeddableState, LogRateAnalysisEmbeddableApi> = {
    type: EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      const [coreStart, pluginStart] = await getStartServices();
      const runtimeState = deserializeState(initialState);
      const timeRangeManager = initializeTimeRangeManager(initialState.rawState);
      const titleManager = initializeTitleManager(initialState.rawState);

      const {
        logRateAnalysisControlsApi,
        serializeLogRateAnalysisChartState,
        logRateAnalysisControlsComparators,
      } = initializeLogRateAnalysisControls(runtimeState);

      const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
      const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);

      const dataViews$ = new BehaviorSubject<DataView[] | undefined>([
        await pluginStart.data.dataViews.get(
          runtimeState.dataViewId ?? (await pluginStart.data.dataViews.getDefaultId())
        ),
      ]);

      const filtersApi = apiPublishesFilters(parentApi) ? parentApi : undefined;

      function serializeState() {
        const dataViewId = logRateAnalysisControlsApi.dataViewId.getValue();
        return {
          rawState: {
            ...titleManager.getLatestState(),
            ...timeRangeManager.getLatestState(),
            ...serializeLogRateAnalysisChartState(),
          },
          references: getDataviewReferences(dataViewId, LOG_RATE_ANALYSIS_DATA_VIEW_REF_NAME),
        };
      }

      const unsavedChangesApi = initializeUnsavedChanges<LogRateAnalysisEmbeddableState>({
        uuid,
        parentApi,
        serializeState,
        anyStateChange$: merge(
          timeRangeManager.anyStateChange$,
          titleManager.anyStateChange$,
          logRateAnalysisControlsApi.dataViewId
        ).pipe(map(() => undefined)),
        getComparators: () => ({
          ...timeRangeComparators,
          ...titleComparators,
          ...logRateAnalysisControlsComparators,
          windowParameters: 'skip',
        }),
        onReset: (lastSaved) => {
          const lastState = deserializeState(lastSaved);
          titleManager.reinitializeState(lastSaved?.rawState);
          timeRangeManager.reinitializeState(lastSaved?.rawState);
          logRateAnalysisControlsApi.updateUserInput(lastState);
        },
      });

      const api = finalizeApi({
        ...timeRangeManager.api,
        ...titleManager.api,
        ...unsavedChangesApi,
        ...logRateAnalysisControlsApi,
        getTypeDisplayName: () =>
          i18n.translate('xpack.aiops.logRateAnalysis.typeDisplayName', {
            defaultMessage: 'log rate analysis',
          }),
        isEditingEnabled: () => true,
        onEdit: async () => {
          try {
            const { resolveEmbeddableLogRateAnalysisUserInput } = await import(
              './resolve_log_rate_analysis_config_input'
            );

            const result = await resolveEmbeddableLogRateAnalysisUserInput(
              coreStart,
              pluginStart,
              parentApi,
              uuid,
              false,
              logRateAnalysisControlsApi,
              undefined,
              serializeLogRateAnalysisChartState()
            );

            logRateAnalysisControlsApi.updateUserInput(result);
          } catch (e) {
            return Promise.reject();
          }
        },
        dataLoading$,
        blockingError$,
        dataViews$,
        serializeState,
      });

      const LogRateAnalysisEmbeddableWrapper = getLogRateAnalysisEmbeddableWrapperComponent(
        coreStart,
        pluginStart
      );

      const onLoading = (v: boolean) => dataLoading$.next(v);
      const onRenderComplete = () => dataLoading$.next(false);
      const onError = (error: Error) => blockingError$.next(error);

      return {
        api,
        Component: () => {
          if (!apiHasExecutionContext(parentApi)) {
            throw new Error('Parent API does not have execution context');
          }

          const [dataViewId] = useBatchedPublishingSubjects(api.dataViewId);

          const reload$ = useMemo(
            () =>
              fetch$(api).pipe(
                skipWhile((fetchContext) => !fetchContext.isReload),
                map((fetchContext) => Date.now())
              ),
            []
          );

          const timeRange$ = useMemo(
            () =>
              fetch$(api).pipe(
                map((fetchContext) => fetchContext.timeRange),
                distinctUntilChanged(fastIsEqual)
              ),
            []
          );

          const lastReloadRequestTime = useObservable(reload$, Date.now());
          const timeRange = useObservable(timeRange$, undefined);

          const embeddingOrigin = apiHasExecutionContext(parentApi)
            ? parentApi.executionContext.type
            : undefined;

          return (
            <LogRateAnalysisEmbeddableWrapper
              filtersApi={filtersApi}
              dataViewId={dataViewId}
              timeRange={timeRange}
              onLoading={onLoading}
              onRenderComplete={onRenderComplete}
              onError={onError}
              embeddingOrigin={embeddingOrigin}
              lastReloadRequestTime={lastReloadRequestTime}
            />
          );
        },
      };
    },
  };

  return factory;
};
