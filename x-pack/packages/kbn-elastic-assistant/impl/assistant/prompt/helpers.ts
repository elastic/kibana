/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getAnonymizedData,
  getAnonymizedValues,
  getCsvFromData,
} from '@kbn/elastic-assistant-common';
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
  onNewReplacements,
  isNewChat,
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
}): Message[] {
  return Object.keys(selectedPromptContexts)
    .sort()
    .map((id) => {
      let content: string;
      if (typeof selectedPromptContexts[id].rawData === 'string') {
        content = `${SYSTEM_PROMPT_CONTEXT_NON_I18N(
          selectedPromptContexts[id].rawData.toString()
        )}`;
      } else {
        const anonymizedData = getAnonymizedData({
          allow: selectedPromptContexts[id].allow,
          allowReplacement: selectedPromptContexts[id].allowReplacement,
          currentReplacements,
          rawData: selectedPromptContexts[id].rawData as Record<string, string[]>,
          getAnonymizedValue,
          getAnonymizedValues,
        });

        const promptContext = getCsvFromData(anonymizedData.anonymizedData);
        content = `${
          isNewChat ? `${selectedSystemPrompt?.content ?? ''}\n\n` : ''
        }${SYSTEM_PROMPT_CONTEXT_NON_I18N(promptContext)}
      ${promptText}`;
        onNewReplacements(anonymizedData.replacements);
      }
      return {
        content,
        role: 'user', // we are combining the system and user messages into one message
        timestamp: new Date().toLocaleString(),
      };
    });
}
