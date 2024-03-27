/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Replacement, transformRawData } from '@kbn/elastic-assistant-common';
import { getAnonymizedValue as defaultGetAnonymizedValue } from '../get_anonymized_value';
import type { Message } from '../../assistant_context/types';
import type { SelectedPromptContext } from '../prompt_context/types';
import type { Prompt } from '../types';
import { SYSTEM_PROMPT_CONTEXT_NON_I18N } from '../../content/prompts/system/translations';

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

export function getCombinedMessage({
  currentReplacements,
  getAnonymizedValue = defaultGetAnonymizedValue,
  isNewChat,
  promptText,
  selectedPromptContexts,
  selectedSystemPrompt,
}: {
  currentReplacements: Replacement[] | undefined;
  getAnonymizedValue?: ({
    currentReplacements,
    rawValue,
  }: {
    currentReplacements: Record<string, string> | undefined;
    rawValue: string;
  }) => string;
  isNewChat: boolean;
  promptText: string;
  selectedPromptContexts: Record<string, SelectedPromptContext>;
  selectedSystemPrompt: Prompt | undefined;
}): Message {
  const replacements: Replacement[] = currentReplacements ?? [];
  const onNewReplacements = (newReplacements: Replacement[]) => {
    replacements.push(...newReplacements);
  };

  const promptContextsContent = Object.keys(selectedPromptContexts)
    .sort()
    .map((id) => {
      const promptContextData = transformRawData({
        allow: selectedPromptContexts[id].allow,
        allowReplacement: selectedPromptContexts[id].allowReplacement,
        currentReplacements,
        getAnonymizedValue,
        onNewReplacements,
        rawData: selectedPromptContexts[id].rawData,
      });

      return `${SYSTEM_PROMPT_CONTEXT_NON_I18N(promptContextData)}`;
    });

  return {
    content: `${
      isNewChat ? `${selectedSystemPrompt?.content ?? ''}\n\n` : ''
    }${promptContextsContent}\n\n${promptText}`,
    role: 'user', // we are combining the system and user messages into one message
    timestamp: new Date().toLocaleString(),
    replacements,
  };
}
