/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import {
  initializeStateManager,
  type WithAllKeys,
  type StateComparators,
} from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import type { FieldStatsInitialState } from '../grid_embeddable/types';
import { FieldStatsInitializerViewType } from '../grid_embeddable/types';
import type { FieldStatsControlsApi } from './types';

export const initializeFieldStatsControls = (
  rawState: FieldStatsInitialState,
  uiSettings: IUiSettingsClient
) => {
  const isEsqlEnabled = uiSettings.get(ENABLE_ESQL);
  const defaultType = isEsqlEnabled
    ? FieldStatsInitializerViewType.ESQL
    : FieldStatsInitializerViewType.DATA_VIEW;

  const defaults: WithAllKeys<FieldStatsInitialState> = {
    showDistributions: false,
    viewType: defaultType,
    dataViewId: undefined,
    query: undefined,
  };
  const fieldStatsStateManager = initializeStateManager(rawState, defaults);

  const resetData$ = new BehaviorSubject<number>(Date.now());
  const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
  const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);

  const updateUserInput = (update: FieldStatsInitialState, shouldResetData = false) => {
    if (shouldResetData) {
      resetData$.next(Date.now());
    }
    fieldStatsStateManager.api.setViewType(update.viewType);
    fieldStatsStateManager.api.setDataViewId(update.dataViewId);
    fieldStatsStateManager.api.setQuery(update.query);
  };

  const fieldStatsControlsComparators: StateComparators<FieldStatsInitialState> = {
    viewType: 'referenceEquality',
    dataViewId: 'referenceEquality',
    query: 'deepEquality',
    showDistributions: 'referenceEquality',
  };

  const onRenderComplete = () => dataLoading$.next(false);
  const onLoading = (v: boolean) => dataLoading$.next(v);
  const onError = (error?: Error) => blockingError$.next(error);

  return {
    fieldStatsControlsApi: {
      updateUserInput,
      query$: fieldStatsStateManager.api.query$,
      viewType$: fieldStatsStateManager.api.viewType$,
      dataViewId$: fieldStatsStateManager.api.dataViewId$,
      showDistributions$: fieldStatsStateManager.api.showDistributions$,
    } as unknown as FieldStatsControlsApi,
    dataLoadingApi: {
      dataLoading$,
      blockingError$,
      onRenderComplete,
      onLoading,
      onError,
    },
    fieldStatsStateManager,
    // Reset data is internal state management, so no need to expose this in api
    resetData$,
    serializeFieldStatsChartState: () => fieldStatsStateManager.getLatestState(),
    fieldStatsControlsComparators,
    onFieldStatsTableDestroy: () => {
      fieldStatsStateManager.api.viewType$.complete();
      fieldStatsStateManager.api.dataViewId$.complete();
      fieldStatsStateManager.api.query$.complete();
      resetData$.complete();
    },
  };
};
