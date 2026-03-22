/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { profilesQueryKeys } from '../cache_keys';
import type { UseFindAllProfilesParams } from './types';
import { fetchAllPagesWithConcurrency } from './fetch_all_pages_with_concurrency';

const FETCH_PAGE_SIZE = 100;
const MAX_CONCURRENT_PAGE_FETCHES = 4;

export const useFindAllProfiles = ({
  client,
  context,
  targetType,
  enabled = true,
}: UseFindAllProfilesParams) =>
  useQuery({
    queryKey: [...profilesQueryKeys.root(context), 'list_all', targetType ?? null],
    queryFn: () =>
      fetchAllPagesWithConcurrency({
        perPage: FETCH_PAGE_SIZE,
        maxConcurrency: MAX_CONCURRENT_PAGE_FETCHES,
        fetchPage: (page, perPage) =>
          client.findProfiles({
            targetType,
            page,
            perPage,
          }),
      }),
    enabled,
  });
