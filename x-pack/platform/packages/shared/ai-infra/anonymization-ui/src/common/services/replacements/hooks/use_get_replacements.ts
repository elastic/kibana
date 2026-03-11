/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { replacementsQueryKeys } from '../cache_keys';
import type { ReplacementsApiError } from '../errors';
import type { UseGetReplacementsParams } from './types';

export const useGetReplacements = ({
  client,
  replacementsId,
  enabled = true,
}: UseGetReplacementsParams) =>
  useQuery({
    queryKey: replacementsId
      ? replacementsQueryKeys.detail(replacementsId)
      : [...replacementsQueryKeys.root(), 'detail', 'none'],
    queryFn: async () => {
      if (!replacementsId) {
        return null;
      }
      try {
        return await client.getReplacements(replacementsId);
      } catch (error) {
        // Missing replacement sets are expected for some conversations and should
        // not fail rendering or trigger noisy retries.
        if ((error as ReplacementsApiError)?.kind === 'not_found') {
          return null;
        }
        throw error;
      }
    },
    enabled: enabled && Boolean(replacementsId),
    staleTime: Infinity,
    retry: (failureCount, error) => {
      const kind = (error as ReplacementsApiError)?.kind;
      if (kind === 'not_found' || kind === 'forbidden' || kind === 'unauthorized') {
        return false;
      }
      return failureCount < 3;
    },
  });
