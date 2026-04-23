/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useCallback } from 'react';
import { useParams, useHistory, useLocation } from 'react-router-dom';

import type { CategoryParams } from '../../home';

import { pagePathGetters } from '../../../../../../../constants';

export interface UrlCategories {
  category: string;
  subCategory?: string;
}

export function useUrlCategories(): UrlCategories {
  const params = useParams<CategoryParams>();
  return useMemo(
    () => ({
      category: params.category || '',
      subCategory: params.subcategory,
    }),
    [params.category, params.subcategory]
  );
}

export function useSetUrlCategory() {
  const history = useHistory();
  const { search } = useLocation();

  return useCallback(
    (update: { category?: string; subCategory?: string }, options?: { replace?: boolean }) => {
      const url = pagePathGetters.integrations_all({
        category: update.category ?? '',
        subCategory: update.subCategory ?? '',
      })[1];

      const existingSearch = new URLSearchParams(search);
      existingSearch.delete('view');
      const [basePath] = url.split('?');

      const qs = existingSearch.toString();
      const fullUrl = qs ? `${basePath}?${qs}` : basePath;

      if (options?.replace) {
        history.replace(fullUrl);
      } else {
        history.push(fullUrl);
      }
    },
    [history, search]
  );
}
