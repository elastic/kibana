/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type QueryFunctionContext, useQuery } from '@kbn/react-query';
import type { Feature } from '@kbn/streams-schema';
import { useKibana } from './use_kibana';
import { useFetchErrorToast } from './use_fetch_error_toast';

interface UseFetchFeaturesOptions {
  query?: string;
}

interface FetchFeaturesResult {
  features: Feature[];
}

export const useFetchFeatures = (options: UseFetchFeaturesOptions = {}) => {
  const { query } = options;
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const showFetchErrorToast = useFetchErrorToast();

  const fetchFeatures = async ({
    signal,
  }: QueryFunctionContext): Promise<FetchFeaturesResult | undefined> => {
    const response = await streamsRepositoryClient.fetch('GET /internal/streams/_features', {
      signal: signal ?? null,
    });

    let features = response.features as Feature[];

    // Filter by query if provided (case-insensitive search on name and value only)
    if (query?.trim()) {
      const searchQuery = query.trim().toLowerCase();
      features = features.filter((feature) => {
        const searchableFields = [feature.name, feature.value]
          .filter(Boolean)
          .map((field) => String(field).toLowerCase());

        return searchableFields.some((field) => field.includes(searchQuery));
      });
    }

    return { features };
  };

  return useQuery<FetchFeaturesResult | undefined, Error>({
    queryKey: ['features', 'all', query],
    queryFn: fetchFeatures,
    onError: showFetchErrorToast,
  });
};
