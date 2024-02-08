/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message, RawMessage } from '../../assistant_context/types';
import type { SelectedPromptContext } from '../prompt_context/types';
import type { Prompt } from '../types';

export const getSystemMessages = ({
  isNewChat,
  selectedSystemPrompt,
}: {
  isNewChat: boolean;
  selectedSystemPrompt: Prompt | undefined;
}): Message[] => {
  if (!isNewChat || selectedSystemPrompt == null) {
    return [];
  }

  const message: Message = {
    content: selectedSystemPrompt.content,
    role: 'system',
    timestamp: new Date().toLocaleString(),
  };

  return [message];
};

export function getCombinedRawMessages({
  isNewChat,
  promptText,
  selectedPromptContexts,
  selectedSystemPrompt,
}: {
  isNewChat: boolean;
  promptText: string;
  selectedPromptContexts: Record<string, SelectedPromptContext>;
  selectedSystemPrompt: Prompt | undefined;
}): RawMessage[] {
  if (Object.keys(selectedPromptContexts).length === 0) {
    return [
      {
        content: `${isNewChat ? `${selectedSystemPrompt?.content ?? ''}\n\n` : ''}

  ${promptText}`,
        role: 'user', // we are combining the system and user messages into one message
      },
    ];
  }

  return Object.keys(selectedPromptContexts)
    .sort()
    .map((id) => {
      return {
        content: isNewChat ? `${selectedSystemPrompt?.content ?? ''}\n\n` : '',
        role: 'user', // we are combining the system and user messages into one message
        timestamp: new Date().toLocaleString(),
        allow: selectedPromptContexts[id].allow,
        allowReplacement: selectedPromptContexts[id].allowReplacement,
        rawData: selectedPromptContexts[id].rawData,
        promptText,
      };
    });
}
