/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { type Streams } from '@kbn/streams-schema';
import { CODE_ANALYSIS_FEATURE_TYPE, type Feature } from '@kbn/significant-events-schema';
import type { QueryFunctionContext } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import { useFetchErrorToast } from '../use_fetch_error_toast';
import { useKibana } from '../use_kibana';

// Subtypes emitted by the code intelligence Stage 1 pipeline.
const REPO_TYPE_SUBTYPE = 'repo_type';
const LANGUAGE_SUBTYPE = 'language';
const SERVICE_NAME_SUBTYPE = 'service_name';

export interface CodeInsights {
  repository?: string;
  repoType?: string;
  language?: string;
  serviceName?: string;
  servicePredicted?: boolean;
  updatedAt?: string;
}

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

/**
 * Fetches the code-derived (`code_analysis`) Feature KIs for a stream and
 * projects them into a compact {@link CodeInsights} summary. These are hidden
 * from the main KI table (they are computed features) and surfaced separately.
 */
export const useStreamCodeFeatures = (
  definition: Streams.all.Definition,
  deps: unknown[] = [],
  { enabled = true }: { enabled?: boolean } = {}
) => {
  const { streamsRepositoryClient } = useKibana().dependencies.start.streams;
  const showFetchErrorToast = useFetchErrorToast();
  const streamName = definition.name;

  const fetchFeatures = async ({ signal: querySignal }: QueryFunctionContext) => {
    return streamsRepositoryClient.fetch('GET /internal/streams/{name}/features', {
      params: {
        path: { name: streamName },
        query: { include_excluded: false },
      },
      signal: querySignal ?? null,
    });
  };

  const { data, isLoading, error, refetch } = useQuery<{ features: Feature[] }, Error>({
    queryKey: ['code-features', streamName, ...deps],
    queryFn: fetchFeatures,
    onError: showFetchErrorToast,
    enabled,
  });

  const insights = useMemo<CodeInsights | null>(() => {
    const codeFeatures = (data?.features ?? []).filter(
      (feature) => feature.type === CODE_ANALYSIS_FEATURE_TYPE
    );
    const bySubtype = (subtype: string) => codeFeatures.find((f) => f.subtype === subtype);

    const repoTypeFeature = bySubtype(REPO_TYPE_SUBTYPE);
    const languageFeature = bySubtype(LANGUAGE_SUBTYPE);
    const serviceNameFeature = bySubtype(SERVICE_NAME_SUBTYPE);

    if (!repoTypeFeature && !languageFeature && !serviceNameFeature) {
      return null;
    }

    const updatedAt = codeFeatures
      .map((f) => f.updated_at)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1);

    return {
      repository: asString(
        repoTypeFeature?.properties?.repository ??
          serviceNameFeature?.properties?.repository ??
          languageFeature?.properties?.repository
      ),
      repoType: asString(repoTypeFeature?.properties?.repo_type),
      language: asString(languageFeature?.properties?.language),
      serviceName: asString(serviceNameFeature?.properties?.service_name),
      servicePredicted: serviceNameFeature?.properties?.predicted === true,
      updatedAt,
    };
  }, [data?.features]);

  return { insights, isLoading, error, refetch };
};
