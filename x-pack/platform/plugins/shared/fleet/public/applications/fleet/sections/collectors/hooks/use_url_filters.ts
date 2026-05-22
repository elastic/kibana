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
  kuery?: string;
  pageIndex: number;
}

const QUERYPARAM_KUERY = 'kuery';
const QUERYPARAM_PAGE = 'page';

export const useCollectorsUrlFilters = (): CollectorsFilter => {
  const { urlParams } = useUrlParams();

  return useMemo(() => {
    const kuery =
      typeof urlParams[QUERYPARAM_KUERY] === 'string' ? urlParams[QUERYPARAM_KUERY] : undefined;

    const rawPage = Number(urlParams[QUERYPARAM_PAGE]);
    const pageIndex = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage - 1 : 0;

    return { kuery, pageIndex };
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
            ...omit(urlParams, QUERYPARAM_KUERY, QUERYPARAM_PAGE),
            ...(next.kuery ? { [QUERYPARAM_KUERY]: next.kuery } : {}),
            ...(next.pageIndex > 0 ? { [QUERYPARAM_PAGE]: String(next.pageIndex + 1) } : {}),
          },
          { skipEmptyString: true }
        ),
      });
    },
    [current, urlParams, toUrlParams, history]
  );
};
