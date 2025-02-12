/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CHANGE_POINT_CHART_DATA_VIEW_REF_NAME,
  EMBEDDABLE_CHANGE_POINT_CHART_TYPE,
} from '@kbn/aiops-change-point-detection/constants';
import type { Reference } from '@kbn/content-management-utils';
import type { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import type { DataView } from '@kbn/data-views-plugin/common';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import type { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  apiHasExecutionContext,
  fetch$,
  initializeTimeRange,
  initializeTitleManager,
  useBatchedPublishingSubjects,
  apiPublishesFilters,
} from '@kbn/presentation-publishing';

import fastIsEqual from 'fast-deep-equal';
import { cloneDeep } from 'lodash';
import React, { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { BehaviorSubject, distinctUntilChanged, map, skipWhile } from 'rxjs';
import { getChangePointDetectionComponent } from '../../shared_components';
import type { AiopsPluginStart, AiopsPluginStartDeps } from '../../types';
import { initializeChangePointControls } from './initialize_change_point_controls';
import type {
  ChangePointEmbeddableApi,
  ChangePointEmbeddableRuntimeState,
  ChangePointEmbeddableState,
} from './types';

export type EmbeddableChangePointChartType = typeof EMBEDDABLE_CHANGE_POINT_CHART_TYPE;

export const getChangePointChartEmbeddableFactory = (
  getStartServices: StartServicesAccessor<AiopsPluginStartDeps, AiopsPluginStart>
) => {
  const factory: ReactEmbeddableFactory<
    ChangePointEmbeddableState,
    ChangePointEmbeddableRuntimeState,
    ChangePointEmbeddableApi
  > = {
    type: EMBEDDABLE_CHANGE_POINT_CHART_TYPE,
    deserializeState: (state) => {
      const serializedState = cloneDeep(state.rawState);
      // inject the reference
      const dataViewIdRef = state.references?.find(
        (ref) => ref.name === CHANGE_POINT_CHART_DATA_VIEW_REF_NAME
      );
      // if the serializedState already contains a dataViewId, we don't want to overwrite it. (Unsaved state can cause this)
      if (dataViewIdRef && serializedState && !serializedState.dataViewId) {
        serializedState.dataViewId = dataViewIdRef?.id;
      }
      return serializedState;
    },
    buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
      const [coreStart, pluginStart] = await getStartServices();

      const timeRangeManager = initializeTimeRange(state);
      const titleManager = initializeTitleManager(state);

      const {
        changePointControlsApi,
        changePointControlsComparators,
        serializeChangePointChartState,
      } = initializeChangePointControls(state);

      const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
      const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);

      const dataViews$ = new BehaviorSubject<DataView[] | undefined>([
        await pluginStart.data.dataViews.get(state.dataViewId),
      ]);

      const filtersApi = apiPublishesFilters(parentApi) ? parentApi : undefined;

      const api = buildApi(
        {
          ...timeRangeManager.api,
          ...titleManager.api,
          ...changePointControlsApi,
          getTypeDisplayName: () =>
            i18n.translate('xpack.aiops.changePointDetection.typeDisplayName', {
              defaultMessage: 'change point charts',
            }),
          isEditingEnabled: () => true,
          onEdit: async () => {
            try {
              const { resolveEmbeddableChangePointUserInput } = await import(
                './resolve_change_point_config_input'
              );

              const result = await resolveEmbeddableChangePointUserInput(
                coreStart,
                pluginStart,
                parentApi,
                uuid,
                serializeChangePointChartState()
              );

              changePointControlsApi.updateUserInput(result);
            } catch (e) {
              return Promise.reject();
            }
          },
          dataLoading$,
          blockingError$,
          dataViews$,
          serializeState: () => {
            const dataViewId = changePointControlsApi.dataViewId.getValue();
            const references: Reference[] = dataViewId
              ? [
                  {
                    type: DATA_VIEW_SAVED_OBJECT_TYPE,
                    name: CHANGE_POINT_CHART_DATA_VIEW_REF_NAME,
                    id: dataViewId,
                  },
                ]
              : [];
            return {
              rawState: {
                timeRange: undefined,
                ...titleManager.serialize(),
                ...timeRangeManager.serialize(),
                ...serializeChangePointChartState(),
              },
              references,
            };
          },
        },
        {
          ...timeRangeManager.comparators,
          ...titleManager.comparators,
          ...changePointControlsComparators,
        }
      );

      const ChangePointDetectionComponent = getChangePointDetectionComponent(
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
            />
          );
        },
      };
    },
  };

  return factory;
};
