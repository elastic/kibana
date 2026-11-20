/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type {
  KiHistogramBucket,
  KiHistogramResponse,
} from '../../../common/http_api/knowledge_indicators';
import { getKiHistogram } from '../api/knowledge_indicators';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

interface UseKiHistogramResult {
  buckets: KiHistogramBucket[];
  isLoading: boolean;
  error: Error | undefined;
}

const EMPTY_BUCKETS: KiHistogramBucket[] = [];

/** Knowledge documents added per UTC day over the last 30 days, oldest first. */
export const useKiHistogram = (aiIndexId: string): UseKiHistogramResult => {
  const {
    services: { http },
  } = useKibana();

  const { data, isLoading, error } = useQuery<KiHistogramResponse, Error>({
    queryKey: contextEngineQueryKeys.aiIndex.kiHistogram(aiIndexId),
    queryFn: ({ signal }) => getKiHistogram(http, { aiIndexId, signal }),
  });

  return {
    buckets: data?.buckets ?? EMPTY_BUCKETS,
    isLoading,
    error: error ?? undefined,
  };
};
