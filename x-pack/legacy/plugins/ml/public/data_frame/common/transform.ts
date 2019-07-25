/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { BehaviorSubject } from 'rxjs';
import { filter, distinctUntilChanged } from 'rxjs/operators';
import { Subscription } from 'rxjs';

// @ts-ignore
import { isJobIdValid } from '../../../common/util/job_utils';

import { PivotAggDict } from './pivot_aggs';
import { PivotGroupByDict } from './pivot_group_by';

export const isTransformIdValid = isJobIdValid;

export type IndexName = string;
export type IndexPattern = string;
export type DataFrameTransformId = string;

export interface PreviewRequestBody {
  pivot: {
    group_by: PivotGroupByDict;
    aggregations: PivotAggDict;
  };
  source: {
    index: IndexPattern | IndexPattern[];
    query?: any;
  };
}

export interface CreateRequestBody extends PreviewRequestBody {
  description?: string;
  dest: {
    index: IndexName;
  };
  sync?: {
    time: {
      field: string;
      delay: string;
    };
  };
}

export interface DataFrameTransformPivotConfig extends CreateRequestBody {
  id: DataFrameTransformId;
  mode?: string; // added property on client side to allow filtering by this field
}

// Don't allow intervals of '0', don't allow floating intervals.
export const delayFormatRegex = /^[1-9][0-9]*(nanos|micros|ms|s|m|h|d)$/;

export enum REFRESH_TRANSFORM_LIST_STATE {
  ERROR = 'error',
  IDLE = 'idle',
  LOADING = 'loading',
  REFRESH = 'refresh',
}
export const refreshTransformList$ = new BehaviorSubject<REFRESH_TRANSFORM_LIST_STATE>(
  REFRESH_TRANSFORM_LIST_STATE.IDLE
);

export const useRefreshTransformList = (
  callback: {
    isLoading?(d: boolean): void;
    onRefresh?(): void;
  } = {}
) => {
  useEffect(() => {
    const distinct$ = refreshTransformList$.pipe(distinctUntilChanged());

    const subscriptions: Subscription[] = [];

    if (typeof callback.onRefresh === 'function') {
      // initial call to refresh
      callback.onRefresh();

      subscriptions.push(
        distinct$
          .pipe(filter(state => state === REFRESH_TRANSFORM_LIST_STATE.REFRESH))
          .subscribe(() => typeof callback.onRefresh === 'function' && callback.onRefresh())
      );
    }

    if (typeof callback.isLoading === 'function') {
      subscriptions.push(
        distinct$.subscribe(
          state =>
            typeof callback.isLoading === 'function' &&
            callback.isLoading(state === REFRESH_TRANSFORM_LIST_STATE.LOADING)
        )
      );
    }

    return () => {
      subscriptions.map(sub => sub.unsubscribe());
    };
  }, []);

  return {
    refresh: () => {
      // A refresh is followed immediately by setting the state to loading
      // to trigger data fetching and loading indicators in one go.
      refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.REFRESH);
      refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.LOADING);
    },
  };
};
