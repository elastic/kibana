/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { AnonymizationProfile } from '@kbn/anonymization-common';
import type { AnonymizationProfilesClient } from '../../common/services/profiles/client';
import { ensureProfilesApiError } from '../../common/services/profiles/errors';
import type { ProfilesApiError } from '../../common/services/profiles/errors';
import { useFindProfiles } from '../../common/services/profiles/hooks/use_find_profiles';
import type {
  ProfilesListQuery,
  ProfilesQueryContext,
  TargetType,
} from '../../common/types/profiles';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;

interface UseProfilesListViewParams {
  client: AnonymizationProfilesClient;
  context: ProfilesQueryContext;
  initialPerPage?: number;
}

interface ProfileListFilters {
  targetType: '' | TargetType;
  targetId: string;
}

interface ProfileListPagination {
  page: number;
  perPage: number;
}

interface ProfileListViewState {
  filters: ProfileListFilters;
  pagination: ProfileListPagination;
  query: ProfilesListQuery;
  profiles: AnonymizationProfile[];
  total: number;
  loading: boolean;
  error?: ProfilesApiError;
}

interface ProfilesListViewController extends ProfileListViewState {
  setTargetType: (targetType: '' | TargetType) => void;
  setTargetId: (targetId: string) => void;
  setPage: (page: number) => void;
  setPerPage: (perPage: number) => void;
  refetch: () => Promise<unknown>;
}

export const useProfilesListView = ({
  client,
  context,
  initialPerPage = DEFAULT_PER_PAGE,
}: UseProfilesListViewParams): ProfilesListViewController => {
  const [targetType, setTargetType] = useState<'' | TargetType>('');
  const [targetId, setTargetId] = useState('');
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [perPage, setPerPage] = useState(initialPerPage);

  const query = useMemo(
    () => ({
      targetType: targetType || undefined,
      targetId: targetId || undefined,
      page,
      perPage,
    }),
    [targetType, targetId, page, perPage]
  );

  const {
    data: listData,
    isLoading,
    error: queryError,
    refetch: refetchProfiles,
  } = useFindProfiles({ client, context, query });

  const error: ProfilesApiError | undefined = useMemo(
    () =>
      queryError
        ? ensureProfilesApiError(queryError, 'Unable to load anonymization profiles')
        : undefined,
    [queryError]
  );

  const filters = useMemo(() => ({ targetType, targetId }), [targetType, targetId]);
  const pagination = useMemo(() => ({ page, perPage }), [page, perPage]);

  const profiles: ProfileListViewState['profiles'] = useMemo(
    () => listData?.data ?? [],
    [listData]
  );

  const total = listData?.total ?? 0;

  const setTargetTypeValue = useCallback((value: '' | TargetType) => {
    setTargetType(value);
    setPage(DEFAULT_PAGE);
  }, []);

  const setTargetIdValue = useCallback((value: string) => {
    setTargetId(value);
    setPage(DEFAULT_PAGE);
  }, []);

  const setPerPageValue = useCallback((value: number) => {
    setPerPage(value);
    setPage(DEFAULT_PAGE);
  }, []);

  const refetch = useCallback(async () => refetchProfiles(), [refetchProfiles]);

  return useMemo(
    () => ({
      filters,
      pagination,
      query,
      profiles,
      total,
      loading: isLoading,
      error,
      setTargetType: setTargetTypeValue,
      setTargetId: setTargetIdValue,
      setPage,
      setPerPage: setPerPageValue,
      refetch,
    }),
    [
      filters,
      pagination,
      query,
      profiles,
      total,
      isLoading,
      error,
      setTargetTypeValue,
      setTargetIdValue,
      setPage,
      setPerPageValue,
      refetch,
    ]
  );
};
