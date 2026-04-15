/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from 'react';
import deepEqual from 'fast-deep-equal';
import type { SetRequired } from 'type-fest';
import type { AlertsTableProps, BulkActionsReducerAction } from '../types';
import { BulkActionsVerbs } from '../types';

export interface UseAlertsTableQueryParamsOptions
  extends SetRequired<
    Pick<
      AlertsTableProps,
      | 'ruleTypeIds'
      | 'consumers'
      | 'query'
      | 'sort'
      | 'runtimeMappings'
      | 'pageIndex'
      | 'pageSize'
      | 'minScore'
      | 'trackScores'
    >,
    'sort'
  > {
  fields: Array<{
    field: string;
    include_unmapped: boolean;
  }>;
  dispatchBulkAction: Dispatch<BulkActionsReducerAction>;
  setPageIndex: Dispatch<SetStateAction<number>>;
}

/**
 * Manages the query params state for the alerts table, resetting the page index to zero and
 * clearing the bulk actions state when the query changes.
 */
export const useAlertsTableQueryParams = ({
  ruleTypeIds,
  consumers,
  fields,
  query,
  sort,
  runtimeMappings,
  pageIndex,
  pageSize,
  minScore,
  trackScores,
  dispatchBulkAction,
  setPageIndex,
}: UseAlertsTableQueryParamsOptions) => {
  const [queryParams, setQueryParams] = useState({
    ruleTypeIds,
    consumers,
    fields,
    query,
    sort,
    runtimeMappings,
    pageIndex,
    pageSize,
    minScore,
    trackScores,
  });

  // Check if the pagination should restart when any of the query params change
  useEffect(() => {
    setQueryParams((prevQueryParams) => {
      // If prevQueryParams is directly compared without selective prop assignment to a new object,
      // deepEqual will return a false negative, even if the objects are structurally identical.
      const resetPageIndex = !deepEqual(
        {
          ruleTypeIds: prevQueryParams.ruleTypeIds,
          consumers: prevQueryParams.consumers,
          fields: prevQueryParams.fields,
          query: prevQueryParams.query,
          sort: prevQueryParams.sort,
          runtimeMappings: prevQueryParams.runtimeMappings,
          trackScores: prevQueryParams.trackScores,
          pageSize: prevQueryParams.pageSize,
        },
        {
          ruleTypeIds,
          consumers,
          fields,
          query,
          sort,
          runtimeMappings,
          trackScores,
          pageSize,
        }
      );

      if (resetPageIndex) {
        setPageIndex(0);
      }
      if (resetPageIndex || pageIndex !== prevQueryParams.pageIndex) {
        // Clear any bulk actions selections when the query changes
        dispatchBulkAction({ action: BulkActionsVerbs.clear });
      }
      return {
        ruleTypeIds,
        consumers,
        fields,
        query,
        sort,
        runtimeMappings,
        minScore,
        trackScores,
        // Go back to the first page if the query changes
        pageIndex: resetPageIndex ? 0 : pageIndex,
        pageSize,
      };
    });
  }, [
    ruleTypeIds,
    fields,
    query,
    runtimeMappings,
    sort,
    consumers,
    minScore,
    trackScores,
    pageSize,
    pageIndex,
    dispatchBulkAction,
    setPageIndex,
  ]);

  return queryParams;
};
