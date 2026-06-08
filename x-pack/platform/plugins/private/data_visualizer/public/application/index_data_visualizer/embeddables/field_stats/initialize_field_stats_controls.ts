/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { AggregateQuery } from '@kbn/es-query';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import type { StateComparators } from '@kbn/presentation-publishing';
import { BehaviorSubject, map, merge, skip } from 'rxjs';
import type { FieldStatsInitialState } from '../grid_embeddable/types';
import { FieldStatsInitializerViewType } from '../grid_embeddable/types';
import type { FieldStatsControlsApi } from './types';

export const fieldStatsControlsComparators: StateComparators<FieldStatsInitialState> = {
  view_type: 'referenceEquality',
  data_view_id: 'referenceEquality',
  query: 'deepEquality',
  show_distributions: 'referenceEquality',
};

export const initializeFieldStatsControls = (
  initialState: FieldStatsInitialState,
  uiSettings: IUiSettingsClient
) => {
  const isEsqlEnabled = uiSettings.get(ENABLE_ESQL);
  const defaultViewType = isEsqlEnabled
    ? FieldStatsInitializerViewType.ESQL
    : FieldStatsInitializerViewType.DATA_VIEW;

  const viewType$ = new BehaviorSubject<FieldStatsInitializerViewType>(
    initialState.view_type ?? defaultViewType
  );
  const dataViewId$ = new BehaviorSubject<string>(initialState.data_view_id ?? '');
  const query$ = new BehaviorSubject<AggregateQuery>(
    initialState.query ?? ({ esql: '' } as AggregateQuery)
  );
  const showDistributions$ = new BehaviorSubject<boolean>(
    initialState.show_distributions ?? false
  );

  const resetData$ = new BehaviorSubject<number>(Date.now());
  const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
  const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);

  const updateUserInput = (update: Partial<FieldStatsInitialState>, shouldResetData = false) => {
    if (shouldResetData) {
      resetData$.next(Date.now());
    }
    if (update.view_type !== undefined) viewType$.next(update.view_type);
    if (update.data_view_id !== undefined) dataViewId$.next(update.data_view_id);
    if (update.query !== undefined) query$.next(update.query ?? ({ esql: '' } as AggregateQuery));
  };

  const getLatestState = (): FieldStatsInitialState => ({
    view_type: viewType$.getValue(),
    data_view_id: dataViewId$.getValue() || undefined,
    query: query$.getValue()?.esql ? query$.getValue() : undefined,
    show_distributions: showDistributions$.getValue(),
  });

  const onRenderComplete = () => dataLoading$.next(false);
  const onLoading = (v: boolean) => dataLoading$.next(v);
  const onError = (error?: Error) => blockingError$.next(error);

  return {
    fieldStatsControlsApi: {
      updateUserInput,
      query$,
      viewType$,
      dataViewId$,
      showDistributions$,
    } as unknown as FieldStatsControlsApi,
    dataLoadingApi: {
      dataLoading$,
      blockingError$,
      onRenderComplete,
      onLoading,
      onError,
    },
    anyStateChange$: merge(
      viewType$.pipe(
        skip(1),
        map(() => undefined)
      ),
      dataViewId$.pipe(
        skip(1),
        map(() => undefined)
      ),
      query$.pipe(
        skip(1),
        map(() => undefined)
      ),
      showDistributions$.pipe(
        skip(1),
        map(() => undefined)
      )
    ),
    getLatestState,
    reinitializeState: (nextState: FieldStatsInitialState) => {
      if (nextState.view_type !== undefined) viewType$.next(nextState.view_type);
      if (nextState.data_view_id !== undefined) dataViewId$.next(nextState.data_view_id);
      if (nextState.query !== undefined) query$.next(nextState.query ?? ({ esql: '' } as AggregateQuery));
      if (nextState.show_distributions !== undefined) showDistributions$.next(nextState.show_distributions);
    },
    resetData$,
    serializeFieldStatsChartState: getLatestState,
    fieldStatsControlsComparators,
    onFieldStatsTableDestroy: () => {
      viewType$.complete();
      dataViewId$.complete();
      query$.complete();
      showDistributions$.complete();
      resetData$.complete();
    },
  };
};
