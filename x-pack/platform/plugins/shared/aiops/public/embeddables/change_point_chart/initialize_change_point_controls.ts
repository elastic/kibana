/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateComparators } from '@kbn/presentation-publishing';
import { BehaviorSubject, map, merge, skip } from 'rxjs';
import type { ChangePointDetectionViewType } from '@kbn/aiops-change-point-detection/constants';
import type { ChangePointChartEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/change_point_chart';
import type { ChangePointComponentApi, ChangePointEmbeddableCustomState } from './types';

export const changePointComparators: StateComparators<ChangePointEmbeddableCustomState> = {
  view_type: 'referenceEquality',
  data_view_id: 'referenceEquality',
  aggregation_function: 'referenceEquality',
  metric_field: 'referenceEquality',
  split_field: 'referenceEquality',
  partitions: 'deepEquality',
  max_series_to_plot: 'referenceEquality',
};

export const initializeChangePointControls = (initialState: ChangePointChartEmbeddableState) => {
  const viewType = new BehaviorSubject<ChangePointDetectionViewType>(initialState.view_type);
  const dataViewId = new BehaviorSubject<string>(initialState.data_view_id);
  const fn = new BehaviorSubject(initialState.aggregation_function);
  const metricField = new BehaviorSubject(initialState.metric_field);
  const splitField = new BehaviorSubject(initialState.split_field);
  const partitions = new BehaviorSubject(initialState.partitions);
  const maxSeriesToPlot = new BehaviorSubject(initialState.max_series_to_plot);

  const updateUserInput = (update: ChangePointEmbeddableCustomState) => {
    viewType.next(update.view_type);
    dataViewId.next(update.data_view_id);
    fn.next(update.aggregation_function);
    metricField.next(update.metric_field);
    splitField.next(update.split_field);
    partitions.next(update.partitions);
    maxSeriesToPlot.next(update.max_series_to_plot);
  };

  const getLatestState = (): ChangePointEmbeddableCustomState => {
    return {
      view_type: viewType.getValue(),
      data_view_id: dataViewId.getValue(),
      aggregation_function: fn.getValue(),
      metric_field: metricField.getValue(),
      split_field: splitField.getValue(),
      partitions: partitions.getValue(),
      max_series_to_plot: maxSeriesToPlot.getValue(),
    };
  };

  return {
    api: {
      viewType,
      dataViewId,
      fn,
      metricField,
      splitField,
      partitions,
      maxSeriesToPlot,
      updateUserInput,
    } satisfies ChangePointComponentApi,
    anyStateChange$: merge(
      viewType.pipe(
        skip(1),
        map(() => undefined)
      ),
      dataViewId.pipe(
        skip(1),
        map(() => undefined)
      ),
      fn.pipe(
        skip(1),
        map(() => undefined)
      ),
      metricField.pipe(
        skip(1),
        map(() => undefined)
      ),
      splitField.pipe(
        skip(1),
        map(() => undefined)
      ),
      partitions.pipe(
        skip(1),
        map(() => undefined)
      ),
      maxSeriesToPlot.pipe(
        skip(1),
        map(() => undefined)
      )
    ),
    getLatestState,
    reinitializeState: (lastSavedState: ChangePointEmbeddableCustomState) => {
      viewType.next(lastSavedState.view_type);
      dataViewId.next(lastSavedState.data_view_id);
      fn.next(lastSavedState.aggregation_function);
      metricField.next(lastSavedState.metric_field);
      splitField.next(lastSavedState.split_field);
      partitions.next(lastSavedState.partitions);
      maxSeriesToPlot.next(lastSavedState.max_series_to_plot);
    },
  };
};
