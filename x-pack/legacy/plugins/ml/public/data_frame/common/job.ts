/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';
import { BehaviorSubject } from 'rxjs';

import { PivotAggDict } from './pivot_aggs';
import { PivotGroupByDict } from './pivot_group_by';

export type IndexName = string;
export type IndexPattern = string;
export type JobId = string;

export interface DataFrameJob {
  description?: string;
  dest: {
    index: IndexName;
  };
  source: {
    index: IndexPattern;
  };
  sync?: {
    time: {
      field: string;
      delay: string;
    };
  };
}

export interface DataFrameTransform extends DataFrameJob {
  pivot: {
    aggregations: PivotAggDict;
    group_by: PivotGroupByDict;
  };
}

export interface DataFrameTransformWithId extends DataFrameTransform {
  id: string;
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

export const useRefreshTransformList = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRefresh, setIsRefresh] = useState(false);

  useEffect(() => {
    const sub = refreshTransformList$.subscribe(s => {
      setIsLoading(s === REFRESH_TRANSFORM_LIST_STATE.LOADING);
      setIsRefresh(s === REFRESH_TRANSFORM_LIST_STATE.REFRESH);
    });
    return () => sub.unsubscribe();
  }, []);

  return {
    isLoading,
    isRefresh,
    refresh: () => {
      refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.REFRESH);
    },
    subscribe: refreshTransformList$.subscribe.bind(refreshTransformList$),
  };
};
