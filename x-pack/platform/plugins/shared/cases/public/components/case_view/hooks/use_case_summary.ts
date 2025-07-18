/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { useRef, useCallback, useState, useMemo } from 'react';
import { MessageRole } from '@kbn/observability-ai-assistant-plugin/public';
import type { Observable } from 'rxjs';
import type { StreamingChatResponseEventWithoutError } from '@kbn/observability-ai-assistant-plugin/common';
import type { CaseUI } from '../../../../common';
import { useChatService } from './use_chat_service';

interface UseCaseSummaryProps {
  onSuccess?: (summary: string) => void;
  onChunk?: (chunk: string) => void;
  isLoading?: boolean;
  caseData: CaseUI;
}

function buildCaseSummaryPrompt(caseData: CaseUI): string {
  const {
    title,
    description,
    tags = [],
    severity,
    category,
    assignees = [],
    status,
    created_at: createdAt,
    updated_at: updatedAt,

    totalAlerts = 0,
    totalComment = 0,
    comments = [],
  } = caseData;

  // Format dates
  const createdDate = createdAt ? new Date(createdAt).toLocaleString() : 'N/A';
  const updatedDate = updatedAt ? new Date(updatedAt).toLocaleString() : 'N/A';

  // Extract alert types from comments if available
  const alertTypes = new Set<string>();
  const alertRules = new Set<string>();
  const userComments = new Set<string>();

  comments.forEach((comment) => {
    if (comment.type === 'alert' && comment.rule) {
      if (comment.rule.name) alertRules.add(comment.rule.name);
      if (comment.alertId?.length) {
        alertTypes.add(comment.rule.name || 'Unknown Alert');
      }
    }
    if (comment.type === 'user' && comment.comment) {
      userComments.add(comment.comment);
    }
  });

  let prompt = `You are an expert Site Reliability Engineering (SRE) assistant specialized in incident investigation and observability data analysis.

Create a concise, structured summary in markdown format of the following case for a senior SRE. Focus on investigation-relevant details and avoid referring to specific users.\n\n`;

  // Basic case information
  prompt += `## Case Overview\n`;
  prompt += `- **Title**: ${title}\n`;
  prompt += `- **Status**: ${status || 'N/A'}\n`;
  prompt += `- **Severity**: ${severity || 'N/A'}\n`;
  if (category) prompt += `- **Category**: ${category}\n`;
  if (tags.length) prompt += `- **Tags**: ${tags.join(', ')}\n`;
  if (assignees.length) {
    prompt += `- **Assigned to**: ${assignees.length} ${
      assignees.length === 1 ? 'person' : 'people'
    }\n`;
  }
  prompt += `- **Created**: ${createdDate}\n`;
  prompt += `- **Last Updated**: ${updatedDate}\n\n`;

  // Description
  if (description) {
    prompt += `## Description\n${description}\n\n`;
  }

  // Alerts and activity
  prompt += `## Activity Summary\n`;
  prompt += `- **Total Alerts**: ${totalAlerts}\n`;
  if (alertTypes.size > 0) {
    prompt += `- **Alert Types**: ${Array.from(alertTypes).join(', ')}\n`;
  }
  if (alertRules.size > 0) {
    prompt += `- **Alert Rules**: ${Array.from(alertRules).join(', ')}\n`;
  }
  prompt += `- **Comments/Updates**: ${totalComment}\n\n`;
  prompt += `### User Comments\n`;
  if (userComments.size > 0) {
    prompt += Array.from(userComments).join('\n');
  }

  // Analysis instructions
  prompt += `## Analysis Instructions\n`;
  prompt += `Provide a concise 3-4 sentence summary that includes:\n`;
  prompt += `1. The core issue or incident being reported\n`;
  prompt += `2. The potential impact or severity level\n`;
  prompt += `3. Any relevant patterns or related alerts\n`;
  prompt += `4. Suggested next steps or areas for investigation\n\n`;
  prompt += `Focus on technical details and avoid mentioning specific users.`;

  return prompt;
}

export const useCaseSummary = ({ onSuccess, onChunk, caseData }: UseCaseSummaryProps) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const abortControllerRef = useRef(new AbortController());

  const { chatService, observabilityAIAssistantService, connectors, isObsAIAssistantEnabled } =
    useChatService();

  const screenContexts = observabilityAIAssistantService?.getScreenContexts();

  const formattedScreenContexts = useMemo(
    () =>
      (screenContexts ?? [])
        .map((context) => ({
          screenDescription: context.screenDescription || '',
        }))
        .filter((context) => context.screenDescription),
    [screenContexts]
  );

  const handleComplete = useCallback(
    (complete: Observable<StreamingChatResponseEventWithoutError>) => {
      setIsLoading(true);
      complete.subscribe({
        next: (result) => {
          if (result.type === 'chatCompletionMessage' && result.message.content) {
            setIsLoading(false);
            setSummary(result.message.content);
            onSuccess?.(result.message.content);
          }
          if (result.type === 'chatCompletionChunk' && result.message.content) {
            setIsLoading(false);
            setSummary(result.message.content);
            onChunk?.(result.message.content);
          }
        },
        error: () => {
          setIsLoading(false);
        },
      });
    },
    [onSuccess, onChunk]
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
    const prompt = buildCaseSummaryPrompt(caseData);

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
    chatService.value,
    observabilityAIAssistantService,
    connectors,
    isObsAIAssistantEnabled,
    handleComplete,
    caseData,
  ]);

  return {
    summary,
    setSummary,
    abortController: abortControllerRef.current,
    screenContexts: formattedScreenContexts,
    generateSummary,
    isObsAIAssistantEnabled,
    isLoading,
  };
};
