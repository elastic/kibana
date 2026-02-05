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

import type { BrowseIntegrationsFilter, BrowseIntegrationSortType } from '../types';

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
            ...omit(urlParams, 'q', 'sort', 'showBeta', 'showDeprecated'),
            ...(newFilters.q ? { q: newFilters.q } : {}),
            ...(newFilters.sort ? { sort: newFilters.sort } : {}),
            // Only add showBeta to URL when explicitly true, otherwise omit to fall back to default
            ...(newFilters.showBeta === true ? { showBeta: 'true' } : {}),
            // Only add showDeprecated to URL when explicitly true, otherwise omit to fall back to default
            ...(newFilters.showDeprecated === true ? { showDeprecated: 'true' } : {}),
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

    let showBeta: BrowseIntegrationsFilter['showBeta'];
    if (typeof urlParams.showBeta === 'string') {
      showBeta = urlParams.showBeta === 'true';
    }

    let showDeprecated: BrowseIntegrationsFilter['showDeprecated'];
    if (typeof urlParams.showDeprecated === 'string') {
      showDeprecated = urlParams.showDeprecated === 'true';
    }

    return {
      q,
      sort,
      showBeta,
      showDeprecated,
    };
  }, [urlParams]);
}

function isValidSortType(sort: string): sort is BrowseIntegrationSortType {
  return ['recent-old', 'old-recent', 'a-z', 'z-a'].includes(sort);
}
