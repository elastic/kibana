/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE } from '@kbn/aiops-log-rate-analysis/constants';
import type { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { openLazyFlyout } from '@kbn/presentation-util';

import {
  apiHasExecutionContext,
  apiPublishesFilters,
  fetch$,
  initializeTimeRangeManager,
  initializeTitleManager,
  useBatchedPublishingSubjects,
  titleComparators,
  timeRangeComparators,
} from '@kbn/presentation-publishing';
import { initializeUnsavedChanges } from '@kbn/presentation-publishing';

import fastIsEqual from 'fast-deep-equal';
import React, { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { BehaviorSubject, distinctUntilChanged, map, merge, skipWhile } from 'rxjs';
import { getLogRateAnalysisEmbeddableWrapperComponent } from '../../shared_components';
import type { AiopsPluginStart, AiopsPluginStartDeps } from '../../types';
import { initializeLogRateAnalysisControls } from './initialize_log_rate_analysis_analysis_controls';
import type { LogRateAnalysisEmbeddableApi } from './types';
import { EmbeddableLogRateAnalysisUserInput } from './log_rate_analysis_config_input';
import type { LogRateAnalysisEmbeddableState } from '../../../common/embeddables/log_rate_analysis/types';

export type EmbeddableLogRateAnalysisType = typeof EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE;

export const getLogRateAnalysisEmbeddableFactory = (
  getStartServices: StartServicesAccessor<AiopsPluginStartDeps, AiopsPluginStart>
) => {
  const factory: EmbeddableFactory<LogRateAnalysisEmbeddableState, LogRateAnalysisEmbeddableApi> = {
    type: EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      const [coreStart, pluginStart] = await getStartServices();
      const runtimeState = initialState;
      const timeRangeManager = initializeTimeRangeManager(initialState);
      const titleManager = initializeTitleManager(initialState);

      const { logRateAnalysisControlsApi, serializeLogRateAnalysisChartState } =
        initializeLogRateAnalysisControls(runtimeState);

      const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
      const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);

      const initialDataViewId =
        runtimeState.dataViewId ?? (await pluginStart.data.dataViews.getDefaultId());
      const dataViews$ = new BehaviorSubject<DataView[] | undefined>(
        initialDataViewId ? [await pluginStart.data.dataViews.get(initialDataViewId)] : undefined
      );

      const filtersApi = apiPublishesFilters(parentApi) ? parentApi : undefined;

      function serializeState() {
        return {
          ...titleManager.getLatestState(),
          ...timeRangeManager.getLatestState(),
          ...serializeLogRateAnalysisChartState(),
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
          dataViewId: 'referenceEquality',
          ...timeRangeComparators,
          ...titleComparators,
        }),
        onReset: (lastSaved) => {
          titleManager.reinitializeState(lastSaved);
          timeRangeManager.reinitializeState(lastSaved);
          logRateAnalysisControlsApi.updateUserInput(lastSaved ?? {});
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
          openLazyFlyout({
            core: coreStart,
            parentApi,
            flyoutProps: {
              hideCloseButton: true,
              focusedPanelId: uuid,
              'data-test-subj': 'aiopsLogRateAnalysisEmbeddableInitializer',
              'aria-labelledby': 'logRateAnalysisConfig',
            },
            loadContent: async ({ closeFlyout }) => {
              const initState = serializeLogRateAnalysisChartState();
              return (
                <EmbeddableLogRateAnalysisUserInput
                  pluginStart={pluginStart}
                  logRateAnalysisControlsApi={logRateAnalysisControlsApi}
                  onConfirm={(result) => {
                    logRateAnalysisControlsApi.updateUserInput(result);
                    closeFlyout();
                  }}
                  onCancel={() => {
                    logRateAnalysisControlsApi.updateUserInput(initState);
                    closeFlyout();
                  }}
                  initialState={initState}
                />
              );
            },
          });
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
