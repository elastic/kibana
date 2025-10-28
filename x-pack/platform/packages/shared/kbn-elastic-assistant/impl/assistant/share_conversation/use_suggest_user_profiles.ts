/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { useQuery } from '@kbn/react-query';
import useDebounce from 'react-use/lib/useDebounce';
import { noop } from 'lodash';
import type { SuggestUsersResponse } from '@kbn/elastic-assistant-common';
import { API_VERSIONS, ELASTIC_USERS_SUGGEST_URL } from '@kbn/elastic-assistant-common';
import type { HttpStart, IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import * as i18n from './translations';
import { useAssistantContext } from '../../..';

type Props = Omit<SuggestUserProfilesArgs, 'signal' | 'http'> & {
  onDebounce?: () => void;
  forbiddenUsers?: string[];
};

/**
 * Time in ms until the data become stale.
 * We set the stale time to one minute
 * to prevent fetching the same queries
 * while the user is typing.
 */
const STALE_TIME = 1000 * 60;
const SEARCH_DEBOUNCE_MS = 250;
const DEFAULT_USER_SIZE = 5;
export const useSuggestUserProfiles = ({
  forbiddenUsers = [],
  searchTerm,
  size = DEFAULT_USER_SIZE,
  onDebounce = noop,
}: Props) => {
  const { http, toasts } = useAssistantContext();
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  useDebounce(
    () => {
      setDebouncedSearchTerm(searchTerm);
      onDebounce();
    },
    SEARCH_DEBOUNCE_MS,
    [searchTerm]
  );

  return useQuery<SuggestUsersResponse, IHttpFetchError<ResponseErrorBody>, SuggestUsersResponse>(
    ['users', 'suggest', debouncedSearchTerm, size],
    ({ signal }) =>
      suggestUserProfiles({
        http,
        searchTerm: debouncedSearchTerm,
        size: debouncedSearchTerm.length > 0 ? size : 0,
        signal,
      }),
    {
      retry: false,
      keepPreviousData: true,
      staleTime: STALE_TIME,
      select: (data) => data.filter((user) => !forbiddenUsers.includes(user.uid)),
      onError: (error) => {
        if (error.name !== 'AbortError') {
          toasts?.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            {
              title: i18n.ERROR_SUGGEST,
            }
          );
        }
      },
    }
  );
};
export interface SuggestUserProfilesArgs {
  http: HttpStart;
  searchTerm: string;
  signal?: AbortSignal;
  size?: number;
}
const suggestUserProfiles = async ({
  http,
  size = DEFAULT_USER_SIZE,
  searchTerm,
  signal,
}: SuggestUserProfilesArgs): Promise<SuggestUsersResponse> => {
  const response = await http.post<SuggestUsersResponse>(ELASTIC_USERS_SUGGEST_URL, {
    body: JSON.stringify({ searchTerm, size }),
    signal,
    version: API_VERSIONS.internal.v1,
  });

  return response;
};
