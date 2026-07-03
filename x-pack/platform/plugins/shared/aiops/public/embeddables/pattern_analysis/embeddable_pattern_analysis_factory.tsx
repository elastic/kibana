/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMBEDDABLE_PATTERN_ANALYSIS_TYPE } from '@kbn/aiops-log-pattern-analysis/constants';
import type { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { EmbeddablePublicDefinition } from '@kbn/embeddable-plugin/public';
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
import { initializeStateApi } from '@kbn/presentation-publishing';
import fastIsEqual from 'fast-deep-equal';
import React, { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { BehaviorSubject, distinctUntilChanged, map, merge, skip, skipWhile } from 'rxjs';
import type { PatternAnalysisEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/pattern_analysis';
import { getPatternAnalysisComponent } from '../../shared_components';
import type { AiopsPluginStart, AiopsPluginStartDeps } from '../../types';
import { initializePatternAnalysisControls } from './initialize_pattern_analysis_controls';
import type { PatternAnalysisEmbeddableApi } from './types';
import { canUseAiops } from '../../capabilities';
import { toUiMinimumTimeRange } from '../../../common/embeddables/pattern_analysis/normalize_legacy_state';

export type EmbeddablePatternAnalysisType = typeof EMBEDDABLE_PATTERN_ANALYSIS_TYPE;

export const getPatternAnalysisEmbeddableFactory = (
  getStartServices: StartServicesAccessor<AiopsPluginStartDeps, AiopsPluginStart>
) => {
  const factory: EmbeddablePublicDefinition<
    PatternAnalysisEmbeddableState,
    PatternAnalysisEmbeddableApi
  > = {
    type: EMBEDDABLE_PATTERN_ANALYSIS_TYPE,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      const [coreStart, pluginStart] = await getStartServices();
      canUseAiops(coreStart, true);
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
        runtimeState.data_view_id ?? (await pluginStart.data.dataViews.getDefaultId());
      const dataViews$ = new BehaviorSubject<DataView[] | undefined>(
        initialDataViewId ? [await pluginStart.data.dataViews.get(initialDataViewId)] : []
      );

      const filtersApi = apiPublishesFilters(parentApi) ? parentApi : undefined;

      const stateApi = initializeStateApi<PatternAnalysisEmbeddableState>({
        uuid,
        parentApi,
        serializeState: () => ({
          ...titleManager.getLatestState(),
          ...timeRangeManager.getLatestState(),
          ...serializePatternAnalysisChartState(),
        }),
        anyStateChange$: merge(
          timeRangeManager.anyStateChange$,
          titleManager.anyStateChange$,
          patternAnalysisControlsApi.dataViewId.pipe(
            skip(1),
            map(() => undefined)
          ),
          patternAnalysisControlsApi.fieldName.pipe(
            skip(1),
            map(() => undefined)
          ),
          patternAnalysisControlsApi.minimumTimeRangeOption.pipe(
            skip(1),
            map(() => undefined)
          ),
          patternAnalysisControlsApi.randomSamplerMode.pipe(
            skip(1),
            map(() => undefined)
          ),
          patternAnalysisControlsApi.randomSamplerProbability.pipe(
            skip(1),
            map(() => undefined)
          )
        ),
        getComparators: () => ({
          ...timeRangeComparators,
          ...titleComparators,
          ...patternAnalysisControlsComparators,
        }),
        applySerializedState: (nextState) => {
          timeRangeManager.reinitializeState(nextState);
          titleManager.reinitializeState(nextState);
          patternAnalysisControlsApi.updateUserInput(nextState);
        },
      });

      const api = finalizeApi({
        ...timeRangeManager.api,
        ...titleManager.api,
        ...stateApi,
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
              minimumTimeRangeOption={toUiMinimumTimeRange(minimumTimeRangeOption)}
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
