/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { targetLookupQueryKeys } from '../cache_keys';
import type { UseResolveIndexParams } from './types';

const THIRTY_SECONDS = 30 * 1000;

export const useResolveIndex = ({
  client,
  query,
  targetType,
  expandWildcards,
  enabled = true,
}: UseResolveIndexParams) =>
  useQuery({
    queryKey: targetLookupQueryKeys.resolveIndex(query, targetType, expandWildcards),
    queryFn: () => client.resolveIndex(query, { expandWildcards }),
    enabled: enabled && query.trim().length > 0,
    staleTime: THIRTY_SECONDS,
    refetchOnWindowFocus: false,
  });
