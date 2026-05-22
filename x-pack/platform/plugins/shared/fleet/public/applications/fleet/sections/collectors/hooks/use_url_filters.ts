/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useCallback, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { omit } from 'lodash';

import { useUrlParams } from '../../../../../hooks';

export interface CollectorsFilter {
  kuery?: string;
  groupBy: string;
  pageIndex: number;
  groupPage: number;
  groupAfterKey?: string;
  expandedGroups: string[];
}

const QUERYPARAM_KUERY = 'kuery';
const QUERYPARAM_PAGE = 'page';
const QUERYPARAM_GROUPBY = 'groupBy';
const QUERYPARAM_GROUPPAGE = 'groupPage';
const QUERYPARAM_GROUPAFTERKEY = 'groupAfterKey';
const QUERYPARAM_EXPANDEDGROUPS = 'expandedGroups';

const VALID_GROUP_BY_VALUES = ['none', 'collector.group', 'config.name'];

export const useCollectorsUrlFilters = (): CollectorsFilter => {
  const { urlParams } = useUrlParams();

  return useMemo(() => {
    const kuery =
      typeof urlParams[QUERYPARAM_KUERY] === 'string' ? urlParams[QUERYPARAM_KUERY] : undefined;

    const rawGroupBy = urlParams[QUERYPARAM_GROUPBY];
    const groupBy =
      typeof rawGroupBy === 'string' && VALID_GROUP_BY_VALUES.includes(rawGroupBy)
        ? rawGroupBy
        : 'none';

    const rawPage = Number(urlParams[QUERYPARAM_PAGE]);
    const pageIndex = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage - 1 : 0;

    const rawGroupPage = Number(urlParams[QUERYPARAM_GROUPPAGE]);
    const groupPage = Number.isInteger(rawGroupPage) && rawGroupPage >= 1 ? rawGroupPage - 1 : 0;

    const groupAfterKey =
      typeof urlParams[QUERYPARAM_GROUPAFTERKEY] === 'string'
        ? urlParams[QUERYPARAM_GROUPAFTERKEY]
        : undefined;

    const rawExpanded = urlParams[QUERYPARAM_EXPANDEDGROUPS];
    const expandedGroups =
      typeof rawExpanded === 'string' && rawExpanded.length > 0 ? rawExpanded.split(',') : [];

    return { kuery, groupBy, pageIndex, groupPage, groupAfterKey, expandedGroups };
  }, [urlParams]);
};

export const useSetCollectorsUrlFilters = () => {
  const current = useCollectorsUrlFilters();
  const currentRef = useRef(current);
  currentRef.current = current;

  const { toUrlParams, urlParams } = useUrlParams();
  const urlParamsRef = useRef(urlParams);
  urlParamsRef.current = urlParams;

  const history = useHistory();

  return useCallback(
    (filters: Partial<CollectorsFilter>, options?: { replace?: boolean }) => {
      const next = { ...currentRef.current, ...filters };
      const method = options?.replace ? history.replace : history.push;

      method.call(history, {
        search: toUrlParams(
          {
            ...omit(
              urlParamsRef.current,
              QUERYPARAM_KUERY,
              QUERYPARAM_PAGE,
              QUERYPARAM_GROUPBY,
              QUERYPARAM_GROUPPAGE,
              QUERYPARAM_GROUPAFTERKEY,
              QUERYPARAM_EXPANDEDGROUPS
            ),
            ...(next.kuery ? { [QUERYPARAM_KUERY]: next.kuery } : {}),
            ...(next.groupBy && next.groupBy !== 'none'
              ? { [QUERYPARAM_GROUPBY]: next.groupBy }
              : {}),
            ...(next.pageIndex > 0 ? { [QUERYPARAM_PAGE]: String(next.pageIndex + 1) } : {}),
            ...(next.groupPage > 0 ? { [QUERYPARAM_GROUPPAGE]: String(next.groupPage + 1) } : {}),
            ...(next.groupAfterKey ? { [QUERYPARAM_GROUPAFTERKEY]: next.groupAfterKey } : {}),
            ...(next.expandedGroups?.length
              ? { [QUERYPARAM_EXPANDEDGROUPS]: next.expandedGroups.join(',') }
              : {}),
          },
          { skipEmptyString: true }
        ),
      });
    },
    [toUrlParams, history]
  );
};
