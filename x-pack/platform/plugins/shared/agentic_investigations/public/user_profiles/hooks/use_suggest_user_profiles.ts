/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import useDebounce from 'react-use/lib/useDebounce';

const SUGGEST_URL = '/internal/agent_builder/_suggest_user_profiles';
const DEFAULT_SIZE = 10;
const DEBOUNCE_MS = 250;

export const useSuggestUserProfiles = (searchTerm: string) => {
  const { services } = useKibana<CoreStart>();
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm);

  useDebounce(() => setDebouncedTerm(searchTerm), DEBOUNCE_MS, [searchTerm]);

  return useQuery<UserProfileWithAvatar[]>({
    queryKey: ['suggestUserProfiles', debouncedTerm],
    queryFn: () =>
      services.http.post<UserProfileWithAvatar[]>(SUGGEST_URL, {
        body: JSON.stringify({ name: debouncedTerm, size: DEFAULT_SIZE, dataPath: 'avatar' }),
      }),
    keepPreviousData: true,
    staleTime: 60_000,
  });
};
