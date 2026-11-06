/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import { useKibana } from './use_kibana';
import { useAIFeatures } from './use_ai_features';
import { useTimeRange } from './use_time_range';

export interface UseGenerateDescriptionResult {
  generate: () => Promise<string | null>;
  isLoading: boolean;
  isAvailable: boolean;
  hasConnector: boolean;
}

export function useGenerateDescription(streamName: string): UseGenerateDescriptionResult {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const aiFeatures = useAIFeatures();
  const { startMs, endMs } = useTimeRange();
  const [isLoading, setIsLoading] = useState(false);

  const generate = useCallback(async (): Promise<string | null> => {
    const connectorId = aiFeatures?.genAiConnectors.selectedConnector;
    if (!connectorId) return null;

    setIsLoading(true);
    const abortController = new AbortController();
    try {
      const result = await streamsRepositoryClient.fetch(
        'POST /internal/streams/{name}/_suggest_description',
        {
          signal: abortController.signal,
          params: {
            path: { name: streamName },
            body: { connector_id: connectorId, start: startMs, end: endMs },
          },
        }
      );
      return result.description;
    } finally {
      setIsLoading(false);
    }
  }, [aiFeatures, streamsRepositoryClient, streamName, startMs, endMs]);

  return {
    generate,
    isLoading,
    isAvailable: aiFeatures?.enabled ?? false,
    hasConnector: Boolean(aiFeatures?.genAiConnectors.selectedConnector),
  };
}
