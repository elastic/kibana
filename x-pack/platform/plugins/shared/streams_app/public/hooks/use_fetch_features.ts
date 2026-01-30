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

export interface FeatureWithStream extends Feature {
  stream_name: string;
}

interface UseFetchFeaturesOptions {
  streamNames?: string[];
  type?: string;
  query?: string;
}

interface FetchFeaturesResult {
  features: FeatureWithStream[];
}

export const useFetchFeatures = (options: UseFetchFeaturesOptions = {}) => {
  const { streamNames, type, query } = options;
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
      params: {
        query: {
          streamNames,
          type,
        },
      },
      signal: signal ?? null,
    });

    let features = response.features as FeatureWithStream[];

    // Filter by query if provided (case-insensitive search on name, title, and description)
    if (query?.trim()) {
      const searchQuery = query.trim().toLowerCase();
      features = features.filter((feature) => {
        const searchableFields = [
          feature.name,
          feature.title,
          feature.description,
          feature.type,
          feature.stream_name,
        ]
          .filter(Boolean)
          .map((field) => String(field).toLowerCase());

        return searchableFields.some((field) => field.includes(searchQuery));
      });
    }

    return { features };
  };

  return useQuery<FetchFeaturesResult | undefined, Error>({
    queryKey: ['features', 'all', streamNames, type, query],
    queryFn: fetchFeatures,
    onError: showFetchErrorToast,
  });
};
