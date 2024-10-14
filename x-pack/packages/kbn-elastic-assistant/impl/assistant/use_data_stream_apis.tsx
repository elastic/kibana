/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { HttpSetup } from '@kbn/core-http-browser';
import { PromptResponse, PromptTypeEnum } from '@kbn/elastic-assistant-common';
import type { FindAnonymizationFieldsResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/find_anonymization_fields_route.gen';
import { QueryObserverResult, RefetchOptions, RefetchQueryFilters } from '@tanstack/react-query';
import { useFetchAnonymizationFields } from './api/anonymization_fields/use_fetch_anonymization_fields';
import { FetchConversationsResponse, useFetchPrompts } from './api';
import {
  Conversation,
  mergeBaseWithPersistedConversations,
  useFetchCurrentUserConversations,
} from '../..';

interface Props {
  baseConversations: Record<string, Conversation>;
  http: HttpSetup;
  isAssistantEnabled: boolean;
}

export interface DataStreamApis {
  allPrompts: PromptResponse[];
  allSystemPrompts: PromptResponse[];
  anonymizationFields: FindAnonymizationFieldsResponse;
  conversations: Record<string, Conversation>;
  isErrorAnonymizationFields: boolean;
  isFetchedAnonymizationFields: boolean;
  isFetchedCurrentUserConversations: boolean;
  isLoadingAnonymizationFields: boolean;
  isLoadingCurrentUserConversations: boolean;
  isLoadingPrompts: boolean;
  isFetchedPrompts: boolean;
  refetchPrompts: (
    options?: RefetchOptions & RefetchQueryFilters<unknown>
  ) => Promise<QueryObserverResult<unknown, unknown>>;
  refetchCurrentUserConversations: () => Promise<
    QueryObserverResult<Record<string, Conversation>, unknown>
  >;
  setIsStreaming: (isStreaming: boolean) => void;
}

export const useDataStreamApis = ({
  http,
  baseConversations,
  isAssistantEnabled,
}: Props): DataStreamApis => {
  const [isStreaming, setIsStreaming] = useState(false);
  const onFetchedConversations = useCallback(
    (conversationsData: FetchConversationsResponse): Record<string, Conversation> =>
      mergeBaseWithPersistedConversations(baseConversations, conversationsData),
    [baseConversations]
  );
  const {
    data: conversations,
    isLoading: isLoadingCurrentUserConversations,
    refetch: refetchCurrentUserConversations,
    isFetched: isFetchedCurrentUserConversations,
  } = useFetchCurrentUserConversations({
    http,
    onFetch: onFetchedConversations,
    refetchOnWindowFocus: !isStreaming,
    isAssistantEnabled,
  });

  const {
    data: anonymizationFields,
    isLoading: isLoadingAnonymizationFields,
    isError: isErrorAnonymizationFields,
    isFetched: isFetchedAnonymizationFields,
  } = useFetchAnonymizationFields();

  const {
    data: { data: allPrompts },
    refetch: refetchPrompts,
    isLoading: isLoadingPrompts,
    isFetched: isFetchedPrompts,
  } = useFetchPrompts();
  const allSystemPrompts = useMemo(() => {
    if (!isLoadingPrompts) {
      return allPrompts.filter((p) => p.promptType === PromptTypeEnum.system);
    }
    return [];
  }, [allPrompts, isLoadingPrompts]);
  return {
    allPrompts,
    allSystemPrompts,
    anonymizationFields,
    conversations,
    isErrorAnonymizationFields,
    isFetchedAnonymizationFields,
    isFetchedCurrentUserConversations,
    isLoadingAnonymizationFields,
    isLoadingCurrentUserConversations,
    isLoadingPrompts,
    isFetchedPrompts,
    refetchPrompts,
    refetchCurrentUserConversations,
    setIsStreaming,
  };
};
