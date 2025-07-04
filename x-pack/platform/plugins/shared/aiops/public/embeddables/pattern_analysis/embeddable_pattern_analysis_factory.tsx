/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EMBEDDABLE_PATTERN_ANALYSIS_TYPE,
  PATTERN_ANALYSIS_DATA_VIEW_REF_NAME,
} from '@kbn/aiops-log-pattern-analysis/constants';
import type { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  type SerializedPanelState,
  apiHasExecutionContext,
  apiPublishesFilters,
  fetch$,
  initializeTitleManager,
  useBatchedPublishingSubjects,
  initializeTimeRangeManager,
  timeRangeComparators,
  titleComparators,
} from '@kbn/presentation-publishing';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import fastIsEqual from 'fast-deep-equal';
import { cloneDeep } from 'lodash';
import React, { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { BehaviorSubject, distinctUntilChanged, map, merge, skipWhile } from 'rxjs';
import { getPatternAnalysisComponent } from '../../shared_components';
import type { AiopsPluginStart, AiopsPluginStartDeps } from '../../types';
import { initializePatternAnalysisControls } from './initialize_pattern_analysis_controls';
import type { PatternAnalysisEmbeddableApi, PatternAnalysisEmbeddableState } from './types';
import { getDataviewReferences } from '../get_dataview_references';

export type EmbeddablePatternAnalysisType = typeof EMBEDDABLE_PATTERN_ANALYSIS_TYPE;

function deserializeState(serializedState?: SerializedPanelState<PatternAnalysisEmbeddableState>) {
  const state = serializedState?.rawState
    ? cloneDeep(serializedState?.rawState)
    : ({} as PatternAnalysisEmbeddableState);
  // inject the reference
  const dataViewIdRef = serializedState?.references?.find(
    (ref) => ref.name === PATTERN_ANALYSIS_DATA_VIEW_REF_NAME
  );
  // if the serializedState already contains a dataViewId, we don't want to overwrite it. (Unsaved state can cause this)
  if (dataViewIdRef && state && !state.dataViewId) {
    state.dataViewId = dataViewIdRef?.id;
  }
  return state;
}

export const getPatternAnalysisEmbeddableFactory = (
  getStartServices: StartServicesAccessor<AiopsPluginStartDeps, AiopsPluginStart>
) => {
  const factory: EmbeddableFactory<PatternAnalysisEmbeddableState, PatternAnalysisEmbeddableApi> = {
    type: EMBEDDABLE_PATTERN_ANALYSIS_TYPE,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      const [coreStart, pluginStart] = await getStartServices();
      const runtimeState = deserializeState(initialState);
      const timeRangeManager = initializeTimeRangeManager(initialState.rawState);
      const titleManager = initializeTitleManager(initialState.rawState);

      const {
        patternAnalysisControlsApi,
        serializePatternAnalysisChartState,
        patternAnalysisControlsComparators,
      } = initializePatternAnalysisControls(runtimeState);

      const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
      const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);

      const dataViews$ = new BehaviorSubject<DataView[] | undefined>([
        await pluginStart.data.dataViews.get(
          runtimeState.dataViewId ?? (await pluginStart.data.dataViews.getDefaultId())
        ),
      ]);

      const filtersApi = apiPublishesFilters(parentApi) ? parentApi : undefined;

      function serializeState() {
        const dataViewId = patternAnalysisControlsApi.dataViewId.getValue();
        return {
          rawState: {
            ...titleManager.getLatestState(),
            ...timeRangeManager.getLatestState(),
            ...serializePatternAnalysisChartState(),
          },
          references: getDataviewReferences(dataViewId, PATTERN_ANALYSIS_DATA_VIEW_REF_NAME),
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
          const lastState = deserializeState(lastSaved);
          timeRangeManager.reinitializeState(lastSaved?.rawState);
          titleManager.reinitializeState(lastSaved?.rawState);
          patternAnalysisControlsApi.updateUserInput(lastState);
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
              dataViewId={dataViewId}
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
