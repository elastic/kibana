/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Replacements, transformRawData } from '@kbn/elastic-assistant-common';
import type { ClientMessage } from '../../assistant_context/types';
import { getAnonymizedValue as defaultGetAnonymizedValue } from '../get_anonymized_value';
import type { SelectedPromptContext } from '../prompt_context/types';
import { SYSTEM_PROMPT_CONTEXT_NON_I18N } from './translations';

interface ClientMessageWithReplacements extends ClientMessage {
  replacements: Replacements;
}
export function getCombinedMessage({
  currentReplacements,
  getAnonymizedValue = defaultGetAnonymizedValue,
  promptText,
  selectedPromptContexts,
}: {
  currentReplacements: Replacements | undefined;
  getAnonymizedValue?: ({
    currentReplacements,
    rawValue,
  }: {
    currentReplacements: Replacements | undefined;
    rawValue: string;
  }) => string;
  promptText: string;
  selectedPromptContexts: Record<string, SelectedPromptContext>;
}): ClientMessageWithReplacements {
  let replacements: Replacements = currentReplacements ?? {};
  const onNewReplacements = (newReplacements: Replacements) => {
    replacements = { ...replacements, ...newReplacements };
  };

  const promptContextsContent = Object.keys(selectedPromptContexts)
    .sort()
    .map((id) => {
      const promptContextData = transformRawData({
        anonymizationFields: selectedPromptContexts[id].contextAnonymizationFields?.data ?? [],
        currentReplacements: { ...currentReplacements, ...selectedPromptContexts[id].replacements },
        getAnonymizedValue,
        onNewReplacements,
        rawData: selectedPromptContexts[id].rawData,
      });

      return `${SYSTEM_PROMPT_CONTEXT_NON_I18N(promptContextData)}\n`;
    });

  const content = `${
    promptContextsContent.length > 0 ? `${promptContextsContent}\n` : ''
  }${promptText}`;

  return {
    // trim ensures any extra \n and other whitespace is removed
    content: content.trim(),
    role: 'user', // we are combining the system and user messages into one message
    timestamp: new Date().toISOString(),
    replacements,
  };
}
