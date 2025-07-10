/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateComparators } from '@kbn/presentation-publishing';
import { BehaviorSubject, map, merge } from 'rxjs';
import type { ChangePointDetectionViewType } from '@kbn/aiops-change-point-detection/constants';
import type { ChangePointComponentApi, ChangePointEmbeddableState } from './types';

type ChangePointEmbeddableCustomState = Omit<
  ChangePointEmbeddableState,
  'timeRange' | 'title' | 'description' | 'hidePanelTitles'
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

export const initializeChangePointControls = (rawState: ChangePointEmbeddableState) => {
  const viewType = new BehaviorSubject<ChangePointDetectionViewType>(rawState.viewType);
  const dataViewId = new BehaviorSubject<string>(rawState.dataViewId);
  const fn = new BehaviorSubject(rawState.fn);
  const metricField = new BehaviorSubject(rawState.metricField);
  const splitField = new BehaviorSubject(rawState.splitField);
  const partitions = new BehaviorSubject(rawState.partitions);
  const maxSeriesToPlot = new BehaviorSubject(rawState.maxSeriesToPlot);

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
