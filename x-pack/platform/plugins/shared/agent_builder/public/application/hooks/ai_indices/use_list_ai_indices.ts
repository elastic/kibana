/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { useQuery } from '@kbn/react-query';
import type {
  AiIndexHttpItem,
  ListAiIndexResponse,
} from '@kbn/context-engine-plugin/common/http_api/ai_indices';
import { queryKeys } from '../../query_keys';
import { labels } from '../../utils/i18n';
import { useKibana } from '../use_kibana';
import { useToasts } from '../use_toasts';

/** Kept in-plugin so Agent Builder does not take a bundle dependency on contextEngine. */
const AI_INDEX_API_VERSION = '2023-10-31';
const AI_INDEX_PATH = '/api/context_engine/ai_index';

interface UseListAiIndicesResult {
  aiIndices: AiIndexHttpItem[];
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Lists the AI indices registered in the Context Engine for the current space.
 *
 * Agent Builder does not depend on the `contextEngine` plugin: this calls the public HTTP API
 * directly and only borrows types from its `common/` directory.
 */
export const useListAiIndices = (): UseListAiIndicesResult => {
  const {
    services: { http },
  } = useKibana();
  const { addErrorToast } = useToasts();

  const { data, isLoading, error } = useQuery<ListAiIndexResponse, Error>({
    queryKey: queryKeys.aiIndices.list,
    queryFn: ({ signal }) =>
      http.get<ListAiIndexResponse>(AI_INDEX_PATH, { version: AI_INDEX_API_VERSION, signal }),
    onError: (err) => {
      addErrorToast({
        title: labels.aiIndices.loadErrorMessage,
        text: formatAgentBuilderErrorMessage(err),
      });
    },
  });

  return { aiIndices: data?.ai_indices ?? [], isLoading, error: error ?? undefined };
};
