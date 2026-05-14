/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { omit } from 'lodash';

import { useUrlParams } from '../../../../../hooks';

export interface CollectorsFilter {
  q?: string;
  pageIndex: number;
  pageSize: number;
}

const QUERYPARAM_Q = 'q';
const QUERYPARAM_PAGE = 'page';
const QUERYPARAM_PAGE_SIZE = 'pageSize';
export const VALID_PAGE_SIZES = [10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 20;

export const useCollectorsUrlFilters = (): CollectorsFilter => {
  const { urlParams } = useUrlParams();

  return useMemo(() => {
    const q =
      typeof urlParams[QUERYPARAM_Q] === 'string' ? urlParams[QUERYPARAM_Q] : undefined;

    const rawPage = Number(urlParams[QUERYPARAM_PAGE]);
    const pageIndex = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage - 1 : 0;

    const rawSize = Number(urlParams[QUERYPARAM_PAGE_SIZE]);
    const pageSize = (VALID_PAGE_SIZES as readonly number[]).includes(rawSize)
      ? rawSize
      : DEFAULT_PAGE_SIZE;

    return { q, pageIndex, pageSize };
  }, [urlParams]);
};

export const useSetCollectorsUrlFilters = () => {
  const current = useCollectorsUrlFilters();
  const { toUrlParams, urlParams } = useUrlParams();
  const history = useHistory();

  return useCallback(
    (filters: Partial<CollectorsFilter>, options?: { replace?: boolean }) => {
      const next = { ...current, ...filters };
      const method = options?.replace ? history.replace : history.push;

      method.call(history, {
        search: toUrlParams(
          {
            ...omit(urlParams, QUERYPARAM_Q, QUERYPARAM_PAGE, QUERYPARAM_PAGE_SIZE),
            ...(next.q ? { [QUERYPARAM_Q]: next.q } : {}),
            ...(next.pageIndex > 0 ? { [QUERYPARAM_PAGE]: String(next.pageIndex + 1) } : {}),
            ...(next.pageSize !== DEFAULT_PAGE_SIZE
              ? { [QUERYPARAM_PAGE_SIZE]: String(next.pageSize) }
              : {}),
          },
          { skipEmptyString: true }
        ),
      });
    },
    [current, urlParams, toUrlParams, history]
  );
};
