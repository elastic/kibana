/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';

import { API_VERSIONS } from '../../common/constants';
import { useKibana } from '../common/lib/kibana';
import { useErrorToast } from '../common/hooks/use_error_toast';
import { sanitizeSearch } from '../common/sanitize_search';
import { PACKS_ID } from './constants';
import type { PackSavedObject } from './types';

export interface UsePacksResponse {
  total: number;
  data: PackSavedObject[];
}

export const usePacks = ({
  isLive = false,
  pageIndex = 0,
  pageSize = 100,
  sortField = 'updated_at',
  sortOrder = 'desc',
  search,
  createdBy,
  enabled,
  skip = false,
}: {
  isLive?: boolean;
  pageIndex?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: string;
  search?: string;
  createdBy?: string;
  enabled?: string;
  skip?: boolean;
}) => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();
  const sanitizedSearch = sanitizeSearch(search);

  return useQuery<UsePacksResponse, { body: { error: string; message: string } }>(
    [PACKS_ID, { pageIndex, pageSize, sortField, sortOrder, search, createdBy, enabled }],
    () =>
      http.get('/api/osquery/packs', {
        version: API_VERSIONS.public.v1,
        query: {
          page: pageIndex + 1,
          pageSize,
          sort: sortField,
          sortOrder,
          ...(sanitizedSearch && { search: sanitizedSearch }),
          ...(createdBy && { createdBy }),
          ...(enabled && { enabled }),
        },
      }),
    {
      enabled: !skip,
      keepPreviousData: true,
      refetchInterval: isLive ? 10000 : false,
      onError: (error) => {
        setErrorToast(error, {
          title: error.body.error,
          toastMessage: error.body.message,
        });
      },
      refetchOnWindowFocus: !!isLive,
    }
  );
};
