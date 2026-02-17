/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from './use_kibana';
import { useStreamsAppFetch } from './use_streams_app_fetch';

/**
 * An integration suggestion based on detected features
 */
export interface IntegrationSuggestion {
  /** The Fleet package name */
  packageName: string;
  /** The display title of the package */
  packageTitle: string;
  /** Confidence score from the matched feature (0-100) */
  confidence: number;
  /** The feature ID that triggered this suggestion */
  featureId: string;
  /** Human-readable title of the matched feature */
  featureTitle: string;
  /** OTel receiver config YAML snippet (if available) */
  otelConfig?: string;
  /** Benefits of installing this integration */
  benefits: string[];
  /** Documentation URL */
  docsUrl?: string;
}

/**
 * Result of getting integration suggestions for a stream
 */
export interface IntegrationSuggestionsResult {
  /** The stream name this result is for */
  streamName: string;
  /** Matched integration suggestions sorted by confidence (descending) */
  suggestions: IntegrationSuggestion[];
}

export const useIntegrationSuggestionsFetch = ({ streamName }: { streamName: string }) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const integrationSuggestionsFetch = useStreamsAppFetch(
    async ({ signal }) => {
      const response = await streamsRepositoryClient.fetch(
        'GET /internal/streams/{name}/integration_suggestions',
        {
          signal,
          params: {
            path: {
              name: streamName,
            },
          },
        }
      );
      return response as IntegrationSuggestionsResult;
    },
    [streamName, streamsRepositoryClient]
  );

  return integrationSuggestionsFetch;
};
