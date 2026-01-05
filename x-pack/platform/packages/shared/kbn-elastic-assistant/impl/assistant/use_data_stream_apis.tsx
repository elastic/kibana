/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState } from 'react';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { PromptResponse, User } from '@kbn/elastic-assistant-common';
import { PromptTypeEnum } from '@kbn/elastic-assistant-common';
import type { FindAnonymizationFieldsResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import type {
  InfiniteData,
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
} from '@kbn/react-query';
import { useFetchAnonymizationFields } from './api/anonymization_fields/use_fetch_anonymization_fields';
import type { ConversationWithOwner, FetchConversationsResponse } from './api';
import { useFetchPrompts } from './api';
import { useFetchCurrentUserConversations } from '../..';

interface Props {
  currentUser?: User;
  http: HttpSetup;
  isAssistantEnabled: boolean;
}

export interface DataStreamApis {
  allPrompts: PromptResponse[];
  allSystemPrompts: PromptResponse[];
  anonymizationFields: FindAnonymizationFieldsResponse;
  conversations: Record<string, ConversationWithOwner>;
  currentUser?: User;
  isErrorAnonymizationFields: boolean;
  isFetchedAnonymizationFields: boolean;
  isFetchedCurrentUserConversations: boolean;
  isFetchingCurrentUserConversations: boolean;
  isLoadingAnonymizationFields: boolean;
  isLoadingCurrentUserConversations: boolean;
  isLoadingPrompts: boolean;
  isFetchedPrompts: boolean;
  refetchPrompts: (
    options?: RefetchOptions & RefetchQueryFilters<unknown>
  ) => Promise<QueryObserverResult<unknown, unknown>>;
  refetchCurrentUserConversations: <TPageData>(
    options?: RefetchOptions & RefetchQueryFilters<TPageData>
  ) => Promise<QueryObserverResult<InfiniteData<FetchConversationsResponse>, unknown>>;
  setIsStreaming: (isStreaming: boolean) => void;
  setPaginationObserver: (ref: HTMLDivElement) => void;
}

export const useDataStreamApis = ({
  currentUser,
  http,
  isAssistantEnabled,
}: Props): DataStreamApis => {
  const [isStreaming, setIsStreaming] = useState(false);
  const {
    data: conversations,
    isLoading: isLoadingCurrentUserConversations,
    refetch: refetchCurrentUserConversations,
    isFetching: isFetchingCurrentUserConversations,
    isFetched: isFetchedCurrentUserConversations,
    setPaginationObserver,
  } = useFetchCurrentUserConversations({
    currentUser,
    http,
    perPage: 28,
    refetchOnWindowFocus: !isStreaming,
    isAssistantEnabled,
    fields: ['id', 'title', 'apiConfig', 'updatedAt', 'users', 'createdBy'],
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
    isFetchedPrompts,
    isFetchingCurrentUserConversations,
    isLoadingAnonymizationFields,
    isLoadingCurrentUserConversations,
    isLoadingPrompts,
    refetchCurrentUserConversations,
    refetchPrompts,
    setIsStreaming,
    setPaginationObserver,
  };
};
