/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';

import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';

import { AssistantUiSettings } from '../assistant/helpers';
import type { PromptContext } from '../assistant/prompt_context/types';
import { DEFAULT_CONVERSATION_STATE } from '../assistant/use_conversation';

export const getUniquePromptContextId = (): string => v4();

export const updatePromptContexts = ({
  prevPromptContexts,
  promptContext,
}: {
  prevPromptContexts: Record<string, PromptContext>;
  promptContext: PromptContext;
}): Record<string, PromptContext> => ({
  ...prevPromptContexts,
  [promptContext.id]: {
    ...promptContext,
  },
});

/**
 * Returns ConversationState from local storage or default state, fills in secrets
 * @param key - full key to use for local storage, e.g. 'securitySolution.securityAssistant.default'
 * @param storage - local storage object
 * @param secrets - secrets to use for apiConfig
 */
export const getConversationFromLocalStorage = ({
  key,
  storage,
  secrets,
}: {
  key: string;
  storage: IStorageWrapper;
  secrets: AssistantUiSettings;
}) => {
  const state = storage.get(key);
  if (state != null) {
    return {
      ...state,
      apiConfig: {
        openAI: { ...secrets.openAI },
        virusTotal: { ...secrets.virusTotal },
      },
    };
  } else {
    storage.set(key, DEFAULT_CONVERSATION_STATE);
    return {
      ...DEFAULT_CONVERSATION_STATE,
      apiConfig: {
        openAI: { ...secrets.openAI },
        virusTotal: { ...secrets.virusTotal },
      },
    };
  }
};
