/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlattenRecord } from '@kbn/streams-schema';
import { useAbortController } from '@kbn/react-hooks';
import { useKibana } from './use_kibana';

interface ExtractedPatterns {
  grok: {
    fieldName: string;
    patternGroups: Array<{
      messages: string[];
      nodes: Array<{ pattern: string } | { id: string; component: string; values: string[] }>;
    }>;
  } | null;
  dissect: {
    fieldName: string;
    messages: string[];
  } | null;
}

export function usePipelineSuggestionApi(streamName: string) {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { signal } = useAbortController();

  return {
    schedulePipelineSuggestionTask: async (params: {
      connectorId?: string;
      documents: FlattenRecord[];
      extractedPatterns: ExtractedPatterns;
    }) => {
      return streamsRepositoryClient.fetch(
        'POST /internal/streams/{name}/_pipeline_suggestion/_task',
        {
          signal,
          params: {
            path: { name: streamName },
            body: {
              action: 'schedule' as const,
              connectorId: params.connectorId,
              documents: params.documents,
              extractedPatterns: params.extractedPatterns,
            },
          },
        }
      );
    },
    getPipelineSuggestionTaskStatus: async () => {
      return streamsRepositoryClient.fetch(
        'POST /internal/streams/{name}/_pipeline_suggestion/_status',
        {
          signal,
          params: {
            path: { name: streamName },
          },
        }
      );
    },
    cancelPipelineSuggestionTask: async () => {
      return streamsRepositoryClient.fetch(
        'POST /internal/streams/{name}/_pipeline_suggestion/_task',
        {
          signal,
          params: {
            path: { name: streamName },
            body: {
              action: 'cancel' as const,
            },
          },
        }
      );
    },
    acknowledgePipelineSuggestionTask: async () => {
      return streamsRepositoryClient.fetch(
        'POST /internal/streams/{name}/_pipeline_suggestion/_task',
        {
          signal,
          params: {
            path: { name: streamName },
            body: {
              action: 'acknowledge' as const,
            },
          },
        }
      );
    },
  };
}
