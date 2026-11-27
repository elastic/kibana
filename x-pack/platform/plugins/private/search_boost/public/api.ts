/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart, IHttpFetchError } from '@kbn/core/public';
import { useQuery } from '@kbn/react-query';
import { PROFILES_API_PATH, RULES_API_PATH } from '../common/constants';
import type {
  BoostProfile,
  BoostRuleListItem,
  GetBoostProfilesResponse,
  GetBoostRulesResponse,
} from '../common/types';

type BoostFetchError = IHttpFetchError<{ message: string }>;

export interface BoostLists {
  profiles: BoostProfile[];
  rules: BoostRuleListItem[];
}

const fetchBoostLists = async (http: HttpStart, signal?: AbortSignal): Promise<BoostLists> => {
  const [{ profiles }, { rules }] = await Promise.all([
    http.get<GetBoostProfilesResponse>(PROFILES_API_PATH, { signal }),
    http.get<GetBoostRulesResponse>(RULES_API_PATH, { signal }),
  ]);
  return { profiles, rules };
};

export const useBoostLists = (http: HttpStart) =>
  useQuery<BoostLists, BoostFetchError>({
    queryKey: ['searchBoost', 'lists'],
    queryFn: ({ signal }) => fetchBoostLists(http, signal),
    retry: false,
    // Each load reads every index and data stream, so it doesn't repeat when the window regains focus.
    refetchOnWindowFocus: false,
  });
