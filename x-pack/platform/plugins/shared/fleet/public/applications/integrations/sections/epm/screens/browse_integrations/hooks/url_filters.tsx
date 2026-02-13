/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { omit } from 'lodash';

import { useUrlParams } from '../../../../../../../hooks';

import type {
  BrowseIntegrationsFilter,
  BrowseIntegrationSortType,
  IntegrationStatusFilterType,
} from '../types';

const VALID_STATUSES: IntegrationStatusFilterType[] = ['beta', 'deprecated'];

function isValidStatus(value: string): value is IntegrationStatusFilterType {
  return (VALID_STATUSES as string[]).includes(value);
}

export function useAddUrlFilters() {
  const urlFilters = useUrlFilters();
  const { toUrlParams, urlParams } = useUrlParams();
  const history = useHistory();

  return useCallback(
    (filters: Partial<BrowseIntegrationsFilter>, options?: { replace?: boolean }) => {
      const newFilters = { ...urlFilters, ...filters };

      const method = options?.replace ? history.replace : history.push;

      method.call(history, {
        search: toUrlParams(
          {
            ...omit(urlParams, 'q', 'sort', 'status'),
            ...(newFilters.q ? { q: newFilters.q } : {}),
            ...(newFilters.sort ? { sort: newFilters.sort } : {}),
            ...(newFilters.status && newFilters.status.length > 0
              ? { status: newFilters.status }
              : {}),
          },
          {
            skipEmptyString: true,
          }
        ),
      });
    },
    [urlFilters, urlParams, toUrlParams, history]
  );
}

export function useUrlFilters(): BrowseIntegrationsFilter {
  const { urlParams } = useUrlParams();

  return useMemo(() => {
    let q: BrowseIntegrationsFilter['q'];
    if (typeof urlParams.q === 'string') {
      q = urlParams.q;
    }

    let sort: BrowseIntegrationsFilter['sort'];
    if (typeof urlParams.sort === 'string' && isValidSortType(urlParams.sort)) {
      sort = urlParams.sort;
    }

    let status: BrowseIntegrationsFilter['status'];
    const rawStatus = urlParams.status;
    if (typeof rawStatus === 'string') {
      // Single value: ?status=beta
      if (isValidStatus(rawStatus)) {
        status = [rawStatus];
      }
    } else if (Array.isArray(rawStatus)) {
      // Multiple values: ?status=beta&status=deprecated
      const validStatuses = rawStatus.filter(
        (s): s is IntegrationStatusFilterType => typeof s === 'string' && isValidStatus(s)
      );
      if (validStatuses.length > 0) {
        status = validStatuses;
      }
    }

    return {
      q,
      sort,
      status,
    };
  }, [urlParams]);
}

function isValidSortType(sort: string): sort is BrowseIntegrationSortType {
  return ['recent-old', 'old-recent', 'a-z', 'z-a'].includes(sort);
}
