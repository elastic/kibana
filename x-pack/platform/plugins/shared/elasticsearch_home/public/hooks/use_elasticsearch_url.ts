/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useHomeServices } from '../context';

interface ElasticsearchUrl {
  url: string | null;
  isLoading: boolean;
}

/**
 * The deployment's Elasticsearch endpoint. Resolves to `null` where cloud does not report one, such
 * as a self-managed deployment, so callers can hide the endpoint rather than show a blank panel.
 */
export const useElasticsearchUrl = (): ElasticsearchUrl => {
  const { cloud } = useHomeServices();

  const { data, isLoading } = useQuery({
    queryKey: ['elasticsearchHomeElasticsearchUrl'],
    queryFn: async () => {
      if (!cloud) {
        return null;
      }

      try {
        const { elasticsearchUrl } = await cloud.fetchElasticsearchConfig();
        return elasticsearchUrl ?? null;
      } catch {
        return null;
      }
    },
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  return { url: data ?? null, isLoading };
};
