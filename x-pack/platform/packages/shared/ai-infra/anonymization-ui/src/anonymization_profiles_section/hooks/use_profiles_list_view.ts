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
import { useFindAllProfiles } from '../../common/services/profiles/hooks/use_find_all_profiles';
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
  enabled?: boolean;
}

interface ProfileListFilters {
  targetType: '' | TargetType;
  queryText: string;
}

interface ProfileListPagination {
  page: number;
  perPage: number;
}

interface ProfileListViewState {
  filters: ProfileListFilters;
  pagination: ProfileListPagination;
  query: Pick<ProfilesListQuery, 'filter' | 'targetType' | 'page' | 'perPage'>;
  profiles: AnonymizationProfile[];
  total: number;
  loading: boolean;
  error?: ProfilesApiError;
}

export interface ProfilesListViewController extends ProfileListViewState {
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
  enabled = true,
}: UseProfilesListViewParams): ProfilesListViewController => {
  const [targetType, setTargetType] = useState<'' | TargetType>('');
  const [queryText, setQueryText] = useState('');
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [perPage, setPerPage] = useState(initialPerPage);

  const query = useMemo<ProfileListViewState['query']>(
    () => ({
      targetType: targetType || undefined,
      filter: queryText.trim() || undefined,
      page,
      perPage,
    }),
    [targetType, queryText, page, perPage]
  );

  const {
    data: allProfilesData,
    isLoading,
    error: queryError,
    refetch: refetchProfiles,
  } = useFindAllProfiles({
    client,
    context,
    targetType: query.targetType,
    enabled,
  });

  const error: ProfilesApiError | undefined = useMemo(
    () =>
      queryError
        ? ensureProfilesApiError(queryError, 'Unable to load anonymization profiles')
        : undefined,
    [queryError]
  );

  const filters = useMemo(() => ({ targetType, queryText }), [targetType, queryText]);
  const pagination = useMemo(() => ({ page, perPage }), [page, perPage]);

  const filteredProfiles = useMemo(() => {
    const allProfiles = allProfilesData ?? [];
    const normalizedQuery = queryText.trim().toLowerCase();
    if (!normalizedQuery) {
      return allProfiles;
    }

    return allProfiles.filter((profile) => {
      const normalizedName = profile.name.toLowerCase();
      const normalizedTargetId = profile.targetId.toLowerCase();
      return (
        normalizedName.includes(normalizedQuery) || normalizedTargetId.includes(normalizedQuery)
      );
    });
  }, [allProfilesData, queryText]);

  const profiles = useMemo(
    () => filteredProfiles.slice((page - 1) * perPage, page * perPage),
    [filteredProfiles, page, perPage]
  );

  const total = filteredProfiles.length;

  const setTargetTypeValue = useCallback((value: '' | TargetType) => {
    setTargetType(value);
    setPage(DEFAULT_PAGE);
  }, []);

  const setTargetIdValue = useCallback((value: string) => {
    setQueryText(value);
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
