/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AIOPS_EMBEDDABLE_ORIGIN } from '@kbn/aiops-common/constants';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { UI_SETTINGS } from '@kbn/data-service';
import type { TimeRange } from '@kbn/es-query';
import { DatePickerContextProvider } from '@kbn/ml-date-picker';
import { pick } from 'lodash';
import React, { useEffect, useMemo, useState, type FC } from 'react';
import type { Observable } from 'rxjs';
import { BehaviorSubject, combineLatest, distinctUntilChanged, map } from 'rxjs';
import type { PublishesFilters } from '@kbn/presentation-publishing';
import type { MinimumTimeRangeOption } from '../components/log_categorization/log_categorization_for_embeddable/minimum_time_range';
import type {
  RandomSamplerOption,
  RandomSamplerProbability,
} from '../components/log_categorization/sampling_menu/random_sampler';
import { PatternAnalysisEmbeddableWrapper } from '../embeddables/pattern_analysis/pattern_analysis_component_wrapper';
import { AiopsAppContext, type AiopsAppContextValue } from '../hooks/use_aiops_app_context';
import { DataSourceContextProvider } from '../hooks/use_data_source';
import { FilterQueryContextProvider } from '../hooks/use_filters_query';
import { ReloadContextProvider } from '../hooks/use_reload';
import type { AiopsPluginStartDeps } from '../types';

/**
 * Only used to initialize internally
 */
export type PatternAnalysisPropsWithDeps = PatternAnalysisProps & {
  coreStart: CoreStart;
  pluginStart: AiopsPluginStartDeps;
};

export type PatternAnalysisSharedComponent = FC<PatternAnalysisProps>;

export interface PatternAnalysisProps {
  dataViewId: string;
  timeRange: TimeRange;
  fieldName: string | undefined;
  minimumTimeRangeOption: MinimumTimeRangeOption;
  randomSamplerMode: RandomSamplerOption;
  randomSamplerProbability: RandomSamplerProbability;
  /**
   * Component to render if there are no patterns found
   */
  emptyState?: React.ReactElement;
  /**
   * Outputs the most recent patterns data
   */
  onChange?: (patterns: Category[]) => void;
  /**
   * Last reload request time, can be used for manual reload
   */
  lastReloadRequestTime?: number;
  /** Origin of the embeddable instance */
  embeddingOrigin?: string;
  onLoading: (isLoading: boolean) => void;
  onRenderComplete: () => void;
  onError: (error: Error) => void;
  filtersApi?: PublishesFilters;
}

const PatternAnalysisWrapper: FC<PatternAnalysisPropsWithDeps> = ({
  // Component dependencies
  coreStart,
  pluginStart,
  // Component props
  dataViewId,
  timeRange,
  fieldName,
  minimumTimeRangeOption,
  randomSamplerMode,
  randomSamplerProbability,
  onLoading,
  onError,
  onRenderComplete,
  embeddingOrigin,
  lastReloadRequestTime,
  onChange,
  filtersApi,
}) => {
  const deps = useMemo(() => {
    const { lens, data, usageCollection, fieldFormats, charts, share, storage, unifiedSearch } =
      pluginStart;

    return {
      data,
      lens,
      usageCollection,
      fieldFormats,
      charts,
      share,
      storage,
      unifiedSearch,
      ...coreStart,
    };
  }, [coreStart, pluginStart]);

  const datePickerDeps = {
    ...pick(deps, ['data', 'http', 'notifications', 'theme', 'uiSettings', 'userProfile', 'i18n']),
    uiSettingsKeys: UI_SETTINGS,
  };

  const aiopsAppContextValue = useMemo<AiopsAppContextValue>(() => {
    return {
      embeddingOrigin: embeddingOrigin ?? AIOPS_EMBEDDABLE_ORIGIN.DEFAULT,
      ...deps,
    };
  }, [deps, embeddingOrigin]);

  const [manualReload$] = useState<BehaviorSubject<number>>(
    new BehaviorSubject<number>(lastReloadRequestTime ?? Date.now())
  );

  useEffect(
    function updateManualReloadSubject() {
      if (!lastReloadRequestTime) return;
      manualReload$.next(lastReloadRequestTime);
    },
    [lastReloadRequestTime, manualReload$]
  );

  const resultObservable$ = useMemo<Observable<number>>(() => {
    return combineLatest([manualReload$]).pipe(
      map(([manualReload]) => Math.max(manualReload)),
      distinctUntilChanged()
    );
  }, [manualReload$]);

  // TODO: Remove data-shared-item as part of https://github.com/elastic/kibana/issues/179376>
  return (
    <div
      data-shared-item=""
      data-test-subj="aiopsEmbeddablePatternAnalysis"
      css={{
        width: '100%',
        padding: '10px',
      }}
    >
      <AiopsAppContext.Provider value={aiopsAppContextValue}>
        <DatePickerContextProvider {...datePickerDeps}>
          <ReloadContextProvider reload$={resultObservable$}>
            <DataSourceContextProvider
              dataViews={pluginStart.data.dataViews}
              dataViewId={dataViewId}
            >
              <FilterQueryContextProvider timeRange={timeRange} filtersApi={filtersApi}>
                <PatternAnalysisEmbeddableWrapper
                  dataViewId={dataViewId}
                  timeRange={timeRange}
                  fieldName={fieldName}
                  minimumTimeRangeOption={minimumTimeRangeOption}
                  randomSamplerMode={randomSamplerMode}
                  randomSamplerProbability={randomSamplerProbability}
                  lastReloadRequestTime={lastReloadRequestTime}
                  onLoading={onLoading}
                  onRenderComplete={onRenderComplete}
                  onError={onError}
                  onChange={onChange}
                />
              </FilterQueryContextProvider>
            </DataSourceContextProvider>
          </ReloadContextProvider>
        </DatePickerContextProvider>
      </AiopsAppContext.Provider>
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default PatternAnalysisWrapper;
