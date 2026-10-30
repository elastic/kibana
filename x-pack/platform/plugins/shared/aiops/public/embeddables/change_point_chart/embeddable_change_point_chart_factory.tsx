/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMBEDDABLE_CHANGE_POINT_CHART_TYPE } from '@kbn/aiops-change-point-detection/constants';
import { openLazyFlyout } from '@kbn/presentation-util';
import type { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { EmbeddablePublicDefinition } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  apiHasExecutionContext,
  fetch$,
  initializeTimeRangeManager,
  initializeTitleManager,
  useBatchedPublishingSubjects,
  apiPublishesFilters,
  titleComparators,
  timeRangeComparators,
  RequestCancellationManager,
} from '@kbn/presentation-publishing';
import type { AbortReason } from '@kbn/kibana-utils-plugin/common';
import { initializeStateApi } from '@kbn/presentation-publishing';

import fastIsEqual from 'fast-deep-equal';
import React, { useEffect, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';
import { BehaviorSubject, EMPTY, distinctUntilChanged, map, merge, skip, skipWhile } from 'rxjs';
import type { ChangePointChartEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/change_point_chart';
import { getChangePointDetectionComponent } from '../../shared_components';
import type { AiopsPluginStart, AiopsPluginStartDeps } from '../../types';
import {
  changePointComparators,
  initializeChangePointControls,
} from './initialize_change_point_controls';
import type { ChangePointEmbeddableApi } from './types';
import { canUseAiops } from '../../capabilities';

export type EmbeddableChangePointChartType = typeof EMBEDDABLE_CHANGE_POINT_CHART_TYPE;

export const getChangePointChartEmbeddableFactory = (
  getStartServices: StartServicesAccessor<AiopsPluginStartDeps, AiopsPluginStart>
) => {
  const factory: EmbeddablePublicDefinition<
    ChangePointChartEmbeddableState,
    ChangePointEmbeddableApi
  > = {
    type: EMBEDDABLE_CHANGE_POINT_CHART_TYPE,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      const [coreStart, pluginStart] = await getStartServices();
      canUseAiops(coreStart, true);

      const timeRangeManager = initializeTimeRangeManager(initialState);
      const titleManager = initializeTitleManager(initialState);

      const state = initialState;

      const changePointManager = initializeChangePointControls(state);

      const dataLoading$ = new BehaviorSubject<boolean | undefined>(false);
      const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);

      const dataSources$ = new BehaviorSubject<DataView[] | undefined>([
        await pluginStart.data.dataViews.get(state.data_view_id),
      ]);

      const filtersApi = apiPublishesFilters(parentApi) ? parentApi : undefined;

      const stateApi = initializeStateApi<ChangePointChartEmbeddableState>({
        uuid,
        parentApi,
        serializeState: () => ({
          ...titleManager.getLatestState(),
          ...timeRangeManager.getLatestState(),
          ...changePointManager.getLatestState(),
        }),
        anyStateChange$: merge(
          titleManager.anyStateChange$,
          timeRangeManager.anyStateChange$,
          changePointManager.anyStateChange$
        ),
        getComparators: () => {
          return {
            ...titleComparators,
            ...timeRangeComparators,
            ...changePointComparators,
          };
        },
        applySerializedState: (nextState) => {
          timeRangeManager.reinitializeState(nextState);
          titleManager.reinitializeState(nextState);
          changePointManager.reinitializeState(nextState);
        },
      });

      const requestCancellationManager = new RequestCancellationManager();

      const api = finalizeApi({
        ...timeRangeManager.api,
        ...titleManager.api,
        ...changePointManager.api,
        ...stateApi,
        getTypeDisplayName: () =>
          i18n.translate('xpack.aiops.changePointDetection.typeDisplayName', {
            defaultMessage: 'change point charts',
          }),
        isEditingEnabled: () => true,
        onEdit: async () => {
          openLazyFlyout({
            core: coreStart,
            parentApi,
            flyoutProps: {
              'data-test-subj': 'aiopsChangePointChartEmbeddableInitializer',
              'aria-labelledby': 'changePointConfig',
              focusedPanelId: uuid,
            },
            loadContent: async ({ closeFlyout }) => {
              const { EmbeddableChangePointUserInput } = await import(
                './change_point_config_input'
              );
              return (
                <EmbeddableChangePointUserInput
                  coreStart={coreStart}
                  pluginStart={pluginStart}
                  onConfirm={(result) => {
                    changePointManager.api.updateUserInput(result);
                    closeFlyout();
                  }}
                  onCancel={closeFlyout}
                  input={changePointManager.getLatestState()}
                />
              );
            },
          });
        },
        dataLoading$,
        blockingError$,
        dataSources$,
        cancelRequests: (reason?: AbortReason) => {
          requestCancellationManager.cancel(reason);
          // Without this the dashboard keeps showing the panel as loading, which keeps the
          // cancel button visible and blocks `waitForPanelsToLoad$`.
          dataLoading$.next(false);
        },
      });

      // Starting a new load lifts a previous cancellation. Besides `fetch$`, the panel
      // refetches whenever one of its data inputs changes. `viewType` and `maxSeriesToPlot`
      // only affect presentation and don't trigger a refetch, so they must not start a load.
      const fetchSubscription = merge(
        fetch$(api),
        ...[api.dataViewId, api.fn, api.metricField, api.splitField, api.partitions].map(
          (subject: Observable<unknown>) => subject.pipe(skip(1))
        )
      ).subscribe(() => requestCancellationManager.startLoad());

      const ChangePointDetectionComponent = getChangePointDetectionComponent(
        coreStart,
        pluginStart
      );

      const onLoading = (v: boolean) => dataLoading$.next(v);
      const onRenderComplete = () => dataLoading$.next(false);
      const onError = (error: Error) => {
        // A cancellation is not a panel error
        if (error?.name === 'AbortError') return;
        blockingError$.next(error);
      };

      return {
        api,
        Component: () => {
          if (!apiHasExecutionContext(parentApi)) {
            throw new Error('Parent API does not have execution context');
          }

          useEffect(() => {
            return () => fetchSubscription.unsubscribe();
          }, []);

          const [dataViewId, viewType, fn, metricField, splitField, maxSeriesToPlot, partitions] =
            useBatchedPublishingSubjects(
              api.dataViewId,
              api.viewType,
              api.fn,
              api.metricField,
              api.splitField,
              api.maxSeriesToPlot,
              api.partitions
            );

          const reload$ = useMemo(
            () =>
              merge(
                fetch$(api).pipe(
                  skipWhile((fetchContext) => !fetchContext.isReload),
                  map(() => Date.now())
                ),
                (pluginStart.cps?.cpsManager?.getProjectRouting$() ?? EMPTY).pipe(
                  map(() => Date.now())
                )
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
            <ChangePointDetectionComponent
              filtersApi={filtersApi}
              viewType={viewType}
              timeRange={timeRange}
              fn={fn}
              metricField={metricField}
              splitField={splitField}
              maxSeriesToPlot={maxSeriesToPlot}
              dataViewId={dataViewId}
              partitions={partitions}
              onLoading={onLoading}
              onRenderComplete={onRenderComplete}
              onError={onError}
              embeddingOrigin={embeddingOrigin}
              lastReloadRequestTime={lastReloadRequestTime}
              requestCancellationManager={requestCancellationManager}
              parentApi={parentApi}
            />
          );
        },
      };
    },
  };

  return factory;
};
