/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { loadTransactionList } from '../services/rest/apm/transaction_groups';
import { IUrlParams } from '../context/UrlParamsContext/types';
import { useUiFilters } from '../context/UrlParamsContext';
import { useFetcher } from './useFetcher';
import { TransactionGroupListAPIResponse } from '../../server/routes/transaction_groups/transaction_group_list_route';

const getRelativeImpact = (
  impact: number,
  impactMin: number,
  impactMax: number
) =>
  Math.max(
    ((impact - impactMin) / Math.max(impactMax - impactMin, 1)) * 100,
    1
  );

function getWithRelativeImpact(items: TransactionGroupListAPIResponse) {
  const impacts = items
    .map(({ impact }) => impact)
    .filter(impact => impact !== null) as number[];

  const impactMin = Math.min(...impacts);
  const impactMax = Math.max(...impacts);

  return items.map(item => {
    return {
      ...item,
      impactRelative:
        item.impact !== null
          ? getRelativeImpact(item.impact, impactMin, impactMax)
          : null
    };
  });
}

export function useTransactionList(urlParams: IUrlParams) {
  const { serviceName, transactionType, start, end } = urlParams;
  const uiFilters = useUiFilters(urlParams);
  const { data = [], error, status } = useFetcher(() => {
    if (serviceName && start && end && transactionType) {
      return loadTransactionList({
        serviceName,
        start,
        end,
        transactionType,
        uiFilters
      });
    }
  }, [serviceName, start, end, transactionType, uiFilters]);

  const memoizedData = useMemo(() => getWithRelativeImpact(data), [data]);
  return {
    data: memoizedData,
    status,
    error
  };
}
