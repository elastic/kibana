/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { useRef, useCallback, useState } from 'react';
import { MessageRole } from '@kbn/observability-ai-assistant-plugin/public';
import type { Observable } from 'rxjs';
import type { StreamingChatResponseEventWithoutError } from '@kbn/observability-ai-assistant-plugin/common';
import type { CaseUI } from '../../../../common';
import { useChatService } from './use_chat_service';
import { buildCaseSummaryPrompt } from './case_summary_promot';

interface UseCaseSummaryProps {
  isLoading?: boolean;
  caseData: CaseUI;
  markdown?: boolean;
}

export const useCaseSummary = ({ caseData, markdown }: UseCaseSummaryProps) => {
  const [summary, setSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const abortControllerRef = useRef(new AbortController());

  const { chatService, observabilityAIAssistantService, connectors, isObsAIAssistantEnabled } =
    useChatService();

  const handleComplete = useCallback(
    (complete: Observable<StreamingChatResponseEventWithoutError>) => {
      setIsLoading(true);
      complete.subscribe({
        next: (result) => {
          if (result.type === 'chatCompletionMessage' && result.message.content) {
            const content = result.message.content || '';
            setIsLoading(false);
            setSummary(content);
          }
          if (result.type === 'chatCompletionChunk' && result.message.content) {
            setSummary((prev) => prev + result.message.content);
          }
        },
        error: () => {
          setIsLoading(false);
        },
      });
    },
    []
  );

  const generateSummary = useCallback(() => {
    if (!isObsAIAssistantEnabled) {
      setIsLoading(false);
      return;
    }
    if (!observabilityAIAssistantService || !chatService.value || !connectors?.length) {
      setSummary('');
      setIsLoading(false);
      return;
    }

    const conversationId = uuidv4();
    const prompt = buildCaseSummaryPrompt(caseData, markdown);

    const complete = chatService.value.complete({
      getScreenContexts: () => observabilityAIAssistantService?.getScreenContexts(),
      conversationId,
      signal: abortControllerRef.current.signal,
      connectorId: connectors[0].id,
      messages: [
        {
          '@timestamp': new Date().toISOString(),
          message: {
            role: MessageRole.User,
            content: prompt,
          },
        },
      ],
      scopes: ['observability'],
      disableFunctions: true,
      persist: false,
      // System message is now included in the prompt itself for clarity.
    });

    if (complete) {
      handleComplete(complete);
    } else {
      setIsLoading(false);
    }
  }, [
    caseData,
    chatService.value,
    connectors,
    handleComplete,
    isObsAIAssistantEnabled,
    markdown,
    observabilityAIAssistantService,
  ]);

  return {
    summary,
    setSummary,
    generateSummary,
    isLoading,
  };
};
