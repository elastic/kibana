/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { API_VERSIONS } from '../../common/constants';
import { useKibana } from '../common/lib/kibana';
import { useErrorToast } from '../common/hooks/use_error_toast';

interface UseHistoryTagsConfig {
  enabled?: boolean;
}

export const useHistoryTags = ({ enabled = true }: UseHistoryTagsConfig = {}) => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  const { data, isLoading, isFetching } = useQuery<{ data: string[] }, Error, string[]>(
    ['historyTags'],
    () =>
      http.get<{ data: string[] }>('/internal/osquery/history/tags', {
        version: API_VERSIONS.internal.v1,
      }),
    {
      enabled,
      select: (response) => response.data,
      onSuccess: () => setErrorToast(),
      onError: (error) =>
        setErrorToast(error, {
          title: i18n.translate('xpack.osquery.historyTags.fetchError', {
            defaultMessage: 'Error while fetching tags',
          }),
        }),
      staleTime: 30000,
    }
  );

  return {
    tags: data ?? [],
    isLoading: isLoading && enabled,
    isFetching,
  };
};
