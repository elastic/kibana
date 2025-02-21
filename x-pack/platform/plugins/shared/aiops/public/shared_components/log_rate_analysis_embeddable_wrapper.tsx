/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import React, { useEffect, useMemo, useState, type FC } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import type { Observable } from 'rxjs';
import { BehaviorSubject, combineLatest, distinctUntilChanged, map } from 'rxjs';

import { AIOPS_EMBEDDABLE_ORIGIN } from '@kbn/aiops-common/constants';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { UI_SETTINGS } from '@kbn/data-service';
import { LogRateAnalysisReduxProvider } from '@kbn/aiops-log-rate-analysis/state';
import type { TimeRange } from '@kbn/es-query';
import { DatePickerContextProvider } from '@kbn/ml-date-picker';
import type { SignificantItem } from '@kbn/ml-agg-utils';

import type { WindowParameters } from '@kbn/aiops-log-rate-analysis';
import type { PublishesFilters } from '@kbn/presentation-publishing';
import { AiopsAppContext, type AiopsAppContextValue } from '../hooks/use_aiops_app_context';
import { DataSourceContextProvider } from '../hooks/use_data_source';
import { ReloadContextProvider } from '../hooks/use_reload';
import { FilterQueryContextProvider } from '../hooks/use_filters_query';
import type { AiopsPluginStartDeps } from '../types';

import { LogRateAnalysisForEmbeddable } from '../components/log_rate_analysis/log_rate_analysis_for_embeddable';

/**
 * Only used to initialize internally
 */
export type LogRateAnalysisPropsWithDeps = LogRateAnalysisEmbeddableWrapperProps & {
  coreStart: CoreStart;
  pluginStart: AiopsPluginStartDeps;
};

export type LogRateAnalysisEmbeddableWrapper = FC<LogRateAnalysisEmbeddableWrapperProps>;

export interface LogRateAnalysisEmbeddableWrapperProps {
  dataViewId: string;
  timeRange: TimeRange;
  /**
   * Component to render if there are no significant items found
   */
  emptyState?: React.ReactElement;
  /**
   * Outputs the most recent significant items
   */
  onChange?: (significantItems: SignificantItem[]) => void;
  /**
   * Last reload request time, can be used for manual reload
   */
  lastReloadRequestTime?: number;
  /** Origin of the embeddable instance */
  embeddingOrigin?: string;
  onLoading: (isLoading: boolean) => void;
  onRenderComplete: () => void;
  onError: (error: Error) => void;
  windowParameters?: WindowParameters;
  filtersApi?: PublishesFilters;
}

const LogRateAnalysisEmbeddableWrapperWithDeps: FC<LogRateAnalysisPropsWithDeps> = ({
  // Component dependencies
  coreStart,
  pluginStart,
  // Component props
  dataViewId,
  timeRange,
  embeddingOrigin,
  lastReloadRequestTime,
  windowParameters,
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

  // We use the following pattern to track changes of dataViewId, and if there's
  // a change, we unmount and remount the complete inner component. This makes
  // sure the component is reinitialized correctly when the options of the
  // dashboard panel are used to change the data view. This is a bit of a
  // workaround since originally log rate analysis was developed as a standalone
  // page with the expectation that the data view is set once and never changes.
  const prevDataViewId = usePrevious(dataViewId);
  const [_, setRerenderFlag] = useState(false);
  useEffect(() => {
    if (prevDataViewId && prevDataViewId !== dataViewId) {
      setRerenderFlag((prev) => !prev);
    }
  }, [dataViewId, prevDataViewId]);
  const showComponent = prevDataViewId === undefined || prevDataViewId === dataViewId;

  // TODO: Remove data-shared-item as part of https://github.com/elastic/kibana/issues/179376>
  return (
    <div
      data-shared-item=""
      data-test-subj="aiopsEmbeddableLogRateAnalysis"
      css={{
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        padding: '10px',
      }}
    >
      {showComponent && (
        <ReloadContextProvider reload$={resultObservable$}>
          <AiopsAppContext.Provider value={aiopsAppContextValue}>
            <DatePickerContextProvider {...datePickerDeps}>
              <DataSourceContextProvider
                dataViews={pluginStart.data.dataViews}
                dataViewId={dataViewId}
              >
                <FilterQueryContextProvider timeRange={timeRange} filtersApi={filtersApi}>
                  <LogRateAnalysisReduxProvider initialAnalysisStart={windowParameters}>
                    <LogRateAnalysisForEmbeddable timeRange={timeRange} />
                  </LogRateAnalysisReduxProvider>
                </FilterQueryContextProvider>
              </DataSourceContextProvider>
            </DatePickerContextProvider>
          </AiopsAppContext.Provider>
        </ReloadContextProvider>
      )}
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default LogRateAnalysisEmbeddableWrapperWithDeps;
