/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message } from '../../assistant_context/types';
import { SYSTEM_PROMPT_CONTEXT_NON_I18N } from '../../content/prompts/system/translations';

import { transformRawData } from '../../data_anonymization/transform_raw_data';
import { getAnonymizedValue as defaultGetAnonymizedValue } from '../get_anonymized_value';
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

export async function getCombinedMessage({
  currentReplacements,
  getAnonymizedValue = defaultGetAnonymizedValue,
  isNewChat,
  onNewReplacements,
  promptText,
  selectedPromptContexts,
  selectedSystemPrompt,
}: {
  currentReplacements: Record<string, string> | undefined;
  getAnonymizedValue?: ({
    currentReplacements,
    rawValue,
  }: {
    currentReplacements: Record<string, string> | undefined;
    rawValue: string;
  }) => string;
  isNewChat: boolean;
  onNewReplacements: (newReplacements: Record<string, string>) => void;
  promptText: string;
  selectedPromptContexts: Record<string, SelectedPromptContext>;
  selectedSystemPrompt: Prompt | undefined;
}): Promise<Message> {
  const promptContextsContent = Object.keys(selectedPromptContexts)
    .sort()
    .map((id) => {
      const promptContext = transformRawData({
        currentReplacements,
        getAnonymizedValue,
        onNewReplacements,
        selectedPromptContext: selectedPromptContexts[id],
      });

      return `${SYSTEM_PROMPT_CONTEXT_NON_I18N(promptContext)}`;
    });

  return {
    content: `${
      isNewChat ? `${selectedSystemPrompt?.content ?? ''}\n\n` : ''
    }${promptContextsContent}

${promptText}`,
    role: 'user', // we are combining the system and user messages into one message
    timestamp: new Date().toLocaleString(),
  };
}
