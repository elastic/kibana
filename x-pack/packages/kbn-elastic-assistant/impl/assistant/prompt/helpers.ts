/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message } from '../../assistant_context/types';
import {
  DEFAULT_SYSTEM_PROMPT_NON_I18N,
  DEFAULT_SYSTEM_PROMPT_NAME,
  SUPERHERO_SYSTEM_PROMPT_NON_I18N,
  SUPERHERO_SYSTEM_PROMPT_NAME,
  SYSTEM_PROMPT_CONTEXT_NON_I18N,
} from '../../content/prompts/system/translations';
import type { PromptContext } from '../prompt_context/types';
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

export async function getCombinedMessage({
  isNewChat,
  promptContexts,
  promptText,
  selectedPromptContextIds,
  selectedSystemPrompt,
}: {
  isNewChat: boolean;
  promptContexts: Record<string, PromptContext>;
  promptText: string;
  selectedPromptContextIds: string[];
  selectedSystemPrompt: Prompt | undefined;
}): Promise<Message> {
  const selectedPromptContexts = selectedPromptContextIds.reduce<PromptContext[]>((acc, id) => {
    const promptContext = promptContexts[id];
    return promptContext != null ? [...acc, promptContext] : acc;
  }, []);

  const promptContextsContent = await Promise.all(
    selectedPromptContexts.map(async ({ getPromptContext }) => {
      const promptContext = await getPromptContext();

      return `${SYSTEM_PROMPT_CONTEXT_NON_I18N(promptContext)}`;
    })
  );

  return {
    content: `${isNewChat ? `${selectedSystemPrompt?.content ?? ''}` : `${promptContextsContent}`}

${promptContextsContent}

${promptText}`,
    role: 'user', // we are combining the system and user messages into one message
    timestamp: new Date().toLocaleString(),
  };
}

export const getDefaultSystemPrompt = (): Prompt => ({
  id: 'default-system-prompt',
  content: DEFAULT_SYSTEM_PROMPT_NON_I18N,
  name: DEFAULT_SYSTEM_PROMPT_NAME,
  promptType: 'system',
});

export const getSuperheroPrompt = (): Prompt => ({
  id: 'CB9FA555-B59F-4F71-AFF9-8A891AC5BC28',
  content: SUPERHERO_SYSTEM_PROMPT_NON_I18N,
  name: SUPERHERO_SYSTEM_PROMPT_NAME,
  promptType: 'system',
});
