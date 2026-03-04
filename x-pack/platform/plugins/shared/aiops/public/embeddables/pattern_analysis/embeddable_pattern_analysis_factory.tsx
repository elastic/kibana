/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMBEDDABLE_PATTERN_ANALYSIS_TYPE } from '@kbn/aiops-log-pattern-analysis/constants';
import type { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  apiHasExecutionContext,
  apiPublishesFilters,
  fetch$,
  initializeTitleManager,
  useBatchedPublishingSubjects,
  initializeTimeRangeManager,
  timeRangeComparators,
  titleComparators,
} from '@kbn/presentation-publishing';
import { initializeUnsavedChanges } from '@kbn/presentation-publishing';
import fastIsEqual from 'fast-deep-equal';
import React, { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { BehaviorSubject, distinctUntilChanged, map, merge, skipWhile } from 'rxjs';
import { getPatternAnalysisComponent } from '../../shared_components';
import type { AiopsPluginStart, AiopsPluginStartDeps } from '../../types';
import { initializePatternAnalysisControls } from './initialize_pattern_analysis_controls';
import type { PatternAnalysisEmbeddableApi } from './types';
import type { PatternAnalysisEmbeddableState } from '../../../common/embeddables/pattern_analysis/types';

export type EmbeddablePatternAnalysisType = typeof EMBEDDABLE_PATTERN_ANALYSIS_TYPE;

export const getPatternAnalysisEmbeddableFactory = (
  getStartServices: StartServicesAccessor<AiopsPluginStartDeps, AiopsPluginStart>
) => {
  const factory: EmbeddableFactory<PatternAnalysisEmbeddableState, PatternAnalysisEmbeddableApi> = {
    type: EMBEDDABLE_PATTERN_ANALYSIS_TYPE,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      const [coreStart, pluginStart] = await getStartServices();
      const runtimeState = initialState;
      const timeRangeManager = initializeTimeRangeManager(initialState);
      const titleManager = initializeTitleManager(initialState);

      const {
        patternAnalysisControlsApi,
        serializePatternAnalysisChartState,
        patternAnalysisControlsComparators,
      } = initializePatternAnalysisControls(runtimeState);

      const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
      const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);

      const initialDataViewId =
        runtimeState.dataViewId ?? (await pluginStart.data.dataViews.getDefaultId());
      const dataViews$ = new BehaviorSubject<DataView[] | undefined>(
        initialDataViewId ? [await pluginStart.data.dataViews.get(initialDataViewId)] : []
      );

      const filtersApi = apiPublishesFilters(parentApi) ? parentApi : undefined;

      function serializeState() {
        return {
          ...titleManager.getLatestState(),
          ...timeRangeManager.getLatestState(),
          ...serializePatternAnalysisChartState(),
        };
      }

      const unsavedChangesApi = initializeUnsavedChanges<PatternAnalysisEmbeddableState>({
        uuid,
        parentApi,
        serializeState,
        anyStateChange$: merge(
          timeRangeManager.anyStateChange$,
          titleManager.anyStateChange$,
          patternAnalysisControlsApi.dataViewId,
          patternAnalysisControlsApi.fieldName,
          patternAnalysisControlsApi.minimumTimeRangeOption,
          patternAnalysisControlsApi.randomSamplerMode,
          patternAnalysisControlsApi.randomSamplerProbability
        ).pipe(map(() => undefined)),
        getComparators: () => ({
          ...timeRangeComparators,
          ...titleComparators,
          ...patternAnalysisControlsComparators,
        }),
        onReset: (lastSaved) => {
          timeRangeManager.reinitializeState(lastSaved);
          titleManager.reinitializeState(lastSaved);
          if (lastSaved) {
            patternAnalysisControlsApi.updateUserInput(lastSaved);
          }
        },
      });

      const api = finalizeApi({
        ...timeRangeManager.api,
        ...titleManager.api,
        ...unsavedChangesApi,
        ...patternAnalysisControlsApi,
        getTypeDisplayName: () =>
          i18n.translate('xpack.aiops.patternAnalysis.typeDisplayName', {
            defaultMessage: 'pattern analysis',
          }),
        isEditingEnabled: () => true,
        onEdit: async () => {
          try {
            const { resolveEmbeddablePatternAnalysisUserInput } = await import(
              './resolve_pattern_analysis_config_input'
            );

            const result = await resolveEmbeddablePatternAnalysisUserInput(
              coreStart,
              pluginStart,
              parentApi,
              uuid,
              false,
              patternAnalysisControlsApi,
              undefined,
              serializePatternAnalysisChartState()
            );

            patternAnalysisControlsApi.updateUserInput(result);
          } catch (e) {
            return Promise.reject();
          }
        },
        dataLoading$,
        blockingError$,
        dataViews$,
        serializeState,
      });

      const PatternAnalysisComponent = getPatternAnalysisComponent(coreStart, pluginStart);

      const onLoading = (v: boolean) => dataLoading$.next(v);
      const onRenderComplete = () => dataLoading$.next(false);
      const onError = (error: Error) => blockingError$.next(error);

      return {
        api,
        Component: () => {
          if (!apiHasExecutionContext(parentApi)) {
            throw new Error('Parent API does not have execution context');
          }

          const [
            dataViewId,
            fieldName,
            minimumTimeRangeOption,
            randomSamplerMode,
            randomSamplerProbability,
          ] = useBatchedPublishingSubjects(
            api.dataViewId,
            api.fieldName,
            api.minimumTimeRangeOption,
            api.randomSamplerMode,
            api.randomSamplerProbability
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
            <PatternAnalysisComponent
              filtersApi={filtersApi}
              dataViewId={dataViewId ?? ''}
              fieldName={fieldName}
              minimumTimeRangeOption={minimumTimeRangeOption}
              randomSamplerMode={randomSamplerMode}
              randomSamplerProbability={randomSamplerProbability}
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
