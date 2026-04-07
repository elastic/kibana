/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlattenRecord } from '@kbn/streams-schema';
import { useAbortController } from '@kbn/react-hooks';
import {
  getPipelineSuggestionTaskStatus,
  postPipelineSuggestionTaskByAction,
  postSchedulePipelineSuggestionTaskWithConflictRetry,
} from '../lib/pipeline_suggestion_repository';
import { useKibana } from './use_kibana';

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
      fieldName: string;
      sampleMessages: string[];
    }) => {
      return postSchedulePipelineSuggestionTaskWithConflictRetry(streamsRepositoryClient, {
        streamName,
        signal,
        body: {
          action: 'schedule',
          connectorId: params.connectorId,
          documents: params.documents,
          fieldName: params.fieldName,
          sampleMessages: params.sampleMessages,
        },
      });
    },
    getPipelineSuggestionTaskStatus: async () => {
      return getPipelineSuggestionTaskStatus(streamsRepositoryClient, {
        streamName,
        signal,
      });
    },
    cancelPipelineSuggestionTask: async () => {
      return postPipelineSuggestionTaskByAction(streamsRepositoryClient, {
        streamName,
        signal,
        action: 'cancel',
      });
    },
    acknowledgePipelineSuggestionTask: async () => {
      return postPipelineSuggestionTaskByAction(streamsRepositoryClient, {
        streamName,
        signal,
        action: 'acknowledge',
      });
    },
  };
}
