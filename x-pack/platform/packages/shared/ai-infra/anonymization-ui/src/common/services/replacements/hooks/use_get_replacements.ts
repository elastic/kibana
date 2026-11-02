/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { replacementsQueryKeys } from '../cache_keys';
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
        return undefined;
      }
      return client.getReplacements(replacementsId);
    },
    enabled: enabled && Boolean(replacementsId),
  });
