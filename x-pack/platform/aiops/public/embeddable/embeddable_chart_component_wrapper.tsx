/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, combineLatest, type Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import type { FC } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import useObservable from 'react-use/lib/useObservable';
import { ChangePointsTable } from '../components/change_point_detection/change_points_table';
import { CHANGE_POINT_DETECTION_VIEW_TYPE } from '../../common/constants';
import { ReloadContextProvider } from '../hooks/use_reload';
import {
  type ChangePointAnnotation,
  ChangePointDetectionControlsContextProvider,
  type ChangePointDetectionRequestParams,
} from '../components/change_point_detection/change_point_detection_context';
import type {
  EmbeddableChangePointChartInput,
  EmbeddableChangePointChartOutput,
} from './embeddable_change_point_chart';
import type { EmbeddableChangePointChartProps } from './embeddable_change_point_chart_component';
import { FilterQueryContextProvider, useFilterQueryUpdates } from '../hooks/use_filters_query';
import { DataSourceContextProvider, useDataSource } from '../hooks/use_data_source';
import { useAiopsAppContext } from '../hooks/use_aiops_app_context';
import { createMergedEsQuery } from '../application/utils/search_utils';
import { useChangePointResults } from '../components/change_point_detection/use_change_point_agg_request';
import { ChartsGrid } from '../components/change_point_detection/charts_grid';
import { NoChangePointsWarning } from '../components/change_point_detection/no_change_points_warning';

const defaultSort = {
  field: 'p_value' as keyof ChangePointAnnotation,
  direction: 'asc',
};

export interface EmbeddableInputTrackerProps {
  input$: Observable<EmbeddableChangePointChartInput>;
  initialInput: EmbeddableChangePointChartInput;
  reload$: Observable<number>;
  onOutputChange: (output: Partial<EmbeddableChangePointChartOutput>) => void;
  onRenderComplete: () => void;
  onLoading: (isLoading: boolean) => void;
  onError: (error: Error) => void;
}

export const EmbeddableInputTracker: FC<EmbeddableInputTrackerProps> = ({
  input$,
  initialInput,
  reload$,
  onOutputChange,
  onRenderComplete,
  onLoading,
  onError,
}) => {
  const input = useObservable(input$, initialInput);

  const [manualReload$] = useState<BehaviorSubject<number>>(
    new BehaviorSubject<number>(initialInput.lastReloadRequestTime ?? Date.now())
  );

  useEffect(
    function updateManualReloadSubject() {
      if (
        input.lastReloadRequestTime === initialInput.lastReloadRequestTime ||
        !input.lastReloadRequestTime
      )
        return;
      manualReload$.next(input.lastReloadRequestTime);
    },
    [input.lastReloadRequestTime, initialInput.lastReloadRequestTime, manualReload$]
  );

  const resultObservable$ = useMemo<Observable<number>>(() => {
    return combineLatest([reload$, manualReload$]).pipe(
      map(([reload, manualReload]) => Math.max(reload, manualReload)),
      distinctUntilChanged()
    );
  }, [manualReload$, reload$]);

  return (
    <ReloadContextProvider reload$={resultObservable$}>
      <DataSourceContextProvider dataViewId={input.dataViewId}>
        <FilterQueryContextProvider timeRange={input.timeRange}>
          <ChangePointDetectionControlsContextProvider>
            <ChartGridEmbeddableWrapper
              viewType={input.viewType}
              timeRange={input.timeRange}
              fn={input.fn}
              metricField={input.metricField}
              splitField={input.splitField}
              maxSeriesToPlot={input.maxSeriesToPlot}
              dataViewId={input.dataViewId}
              partitions={input.partitions}
              onLoading={onLoading}
              onRenderComplete={onRenderComplete}
              onError={onError}
              onChange={input.onChange}
              emptyState={input.emptyState}
            />
          </ChangePointDetectionControlsContextProvider>
        </FilterQueryContextProvider>
      </DataSourceContextProvider>
    </ReloadContextProvider>
  );
};

/**
 * Grid component wrapper for embeddable.
 *
 * @param timeRange
 * @param fn
 * @param metricField
 * @param maxSeriesToPlot
 * @param splitField
 * @param partitions
 * @constructor
 */
export const ChartGridEmbeddableWrapper: FC<
  EmbeddableChangePointChartProps & {
    onRenderComplete: () => void;
    onLoading: (isLoading: boolean) => void;
    onError: (error: Error) => void;
  }
> = ({
  viewType = CHANGE_POINT_DETECTION_VIEW_TYPE.CHARTS,
  fn,
  metricField,
  maxSeriesToPlot,
  splitField,
  partitions,
  onError,
  onLoading,
  onRenderComplete,
  onChange,
  emptyState,
}) => {
  const { filters, query, searchBounds, interval } = useFilterQueryUpdates();

  const fieldConfig = useMemo(() => {
    return { fn, metricField, splitField };
  }, [fn, metricField, splitField]);

  const { dataView } = useDataSource();
  const { uiSettings } = useAiopsAppContext();

  const combinedQuery = useMemo(() => {
    const mergedQuery = createMergedEsQuery(query, filters, dataView, uiSettings);
    if (!Array.isArray(mergedQuery.bool?.filter)) {
      if (!mergedQuery.bool) {
        mergedQuery.bool = {};
      }
      mergedQuery.bool.filter = [];
    }

    mergedQuery.bool!.filter.push({
      range: {
        [dataView.timeFieldName!]: {
          from: searchBounds.min?.valueOf(),
          to: searchBounds.max?.valueOf(),
          format: 'epoch_millis',
        },
      },
    });

    if (Array.isArray(partitions) && partitions.length > 0 && fieldConfig.splitField) {
      mergedQuery.bool?.filter.push({
        terms: {
          [fieldConfig.splitField]: partitions,
        },
      });
    }

    return mergedQuery;
  }, [dataView, fieldConfig.splitField, filters, partitions, query, searchBounds, uiSettings]);

  const requestParams = useMemo<ChangePointDetectionRequestParams>(() => {
    return { interval } as ChangePointDetectionRequestParams;
  }, [interval]);

  const { results, isLoading } = useChangePointResults(
    fieldConfig,
    requestParams,
    combinedQuery,
    10000
  );

  useEffect(() => {
    onLoading(isLoading);
  }, [onLoading, isLoading]);

  const changePoints = useMemo<ChangePointAnnotation[]>(() => {
    let resultChangePoints: ChangePointAnnotation[] = results.sort((a, b) => {
      if (defaultSort.direction === 'asc') {
        return (a[defaultSort.field] as number) - (b[defaultSort.field] as number);
      } else {
        return (b[defaultSort.field] as number) - (a[defaultSort.field] as number);
      }
    });

    if (maxSeriesToPlot) {
      resultChangePoints = resultChangePoints.slice(0, maxSeriesToPlot);
    }

    if (onChange) {
      onChange(resultChangePoints);
    }

    return resultChangePoints;
  }, [results, maxSeriesToPlot, onChange]);

  return (
    <div
      css={css`
        overflow: auto;
        width: 100%;
      `}
    >
      {changePoints.length > 0 ? (
        viewType === CHANGE_POINT_DETECTION_VIEW_TYPE.CHARTS ? (
          <ChartsGrid
            changePoints={changePoints.map((r) => ({ ...r, ...fieldConfig }))}
            interval={requestParams.interval}
            onRenderComplete={onRenderComplete}
          />
        ) : viewType === CHANGE_POINT_DETECTION_VIEW_TYPE.TABLE ? (
          <ChangePointsTable
            isLoading={false}
            annotations={changePoints}
            fieldConfig={fieldConfig}
            onRenderComplete={onRenderComplete}
          />
        ) : null
      ) : !isLoading ? (
        emptyState ? (
          emptyState
        ) : (
          <NoChangePointsWarning onRenderComplete={onRenderComplete} />
        )
      ) : null}
    </div>
  );
};
