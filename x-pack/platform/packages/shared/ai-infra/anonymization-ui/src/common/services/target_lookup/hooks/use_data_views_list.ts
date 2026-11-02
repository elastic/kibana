/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { targetLookupQueryKeys } from '../cache_keys';
import type { UseTargetLookupParams } from './types';

const FIVE_MINUTES = 5 * 60 * 1000;

export const useDataViewsList = ({ client, enabled = true }: UseTargetLookupParams) =>
  useQuery({
    queryKey: targetLookupQueryKeys.dataViewsList(),
    queryFn: () => client.getDataViews(),
    enabled,
    staleTime: FIVE_MINUTES,
    refetchOnWindowFocus: false,
  });
