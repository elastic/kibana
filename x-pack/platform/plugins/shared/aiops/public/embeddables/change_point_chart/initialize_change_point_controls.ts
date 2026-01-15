/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateComparators } from '@kbn/presentation-publishing';
import { BehaviorSubject, map, merge } from 'rxjs';
import type { ChangePointDetectionViewType } from '@kbn/aiops-change-point-detection/constants';
import type { ChangePointComponentApi } from './types';
import type { ChangePointEmbeddableState } from '../../../common/embeddables/change_point_chart/types';

type ChangePointEmbeddableCustomState = Omit<
  ChangePointEmbeddableState,
  'timeRange' | 'title' | 'description' | 'hide_title'
>;

export const changePointComparators: StateComparators<ChangePointEmbeddableCustomState> = {
  viewType: 'referenceEquality',
  dataViewId: 'referenceEquality',
  fn: 'referenceEquality',
  metricField: 'referenceEquality',
  splitField: 'referenceEquality',
  partitions: 'deepEquality',
  maxSeriesToPlot: 'referenceEquality',
};

export const initializeChangePointControls = (initialState: ChangePointEmbeddableState) => {
  const viewType = new BehaviorSubject<ChangePointDetectionViewType>(initialState.viewType);
  const dataViewId = new BehaviorSubject<string>(initialState.dataViewId);
  const fn = new BehaviorSubject(initialState.fn);
  const metricField = new BehaviorSubject(initialState.metricField);
  const splitField = new BehaviorSubject(initialState.splitField);
  const partitions = new BehaviorSubject(initialState.partitions);
  const maxSeriesToPlot = new BehaviorSubject(initialState.maxSeriesToPlot);

  const updateUserInput = (update: ChangePointEmbeddableCustomState) => {
    viewType.next(update.viewType);
    dataViewId.next(update.dataViewId);
    fn.next(update.fn);
    metricField.next(update.metricField);
    splitField.next(update.splitField);
    partitions.next(update.partitions);
    maxSeriesToPlot.next(update.maxSeriesToPlot);
  };

  const getLatestState = (): ChangePointEmbeddableCustomState => {
    return {
      viewType: viewType.getValue(),
      dataViewId: dataViewId.getValue(),
      fn: fn.getValue(),
      metricField: metricField.getValue(),
      splitField: splitField.getValue(),
      partitions: partitions.getValue(),
      maxSeriesToPlot: maxSeriesToPlot.getValue(),
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
    } as unknown as ChangePointComponentApi,
    anyStateChange$: merge(
      viewType,
      dataViewId,
      fn,
      metricField,
      splitField,
      partitions,
      maxSeriesToPlot
    ).pipe(map(() => undefined)),
    getLatestState,
    reinitializeState: (lastSavedState: ChangePointEmbeddableCustomState) => {
      viewType.next(lastSavedState.viewType);
      dataViewId.next(lastSavedState.dataViewId);
      fn.next(lastSavedState.fn);
      metricField.next(lastSavedState.metricField);
      splitField.next(lastSavedState.splitField);
      partitions.next(lastSavedState.partitions);
      maxSeriesToPlot.next(lastSavedState.maxSeriesToPlot);
    },
  };
};
