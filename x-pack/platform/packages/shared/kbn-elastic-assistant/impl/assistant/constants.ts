/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TEST_IDS = {
  SYSTEM_PROMPT_SELECTOR: 'systemPromptSelector',
  CONVERSATIONS_MULTISELECTOR: 'conversationMultiSelector',
  ADD_SYSTEM_PROMPT: 'addSystemPrompt',
  PROMPT_SUPERSELECT: 'promptSuperSelect',
  CONVERSATIONS_MULTISELECTOR_OPTION: (id: string) => `conversationMultiSelectorOption-${id}`,
  SETTINGS_MODAL: 'settingsModal',
  SYSTEM_PROMPT_MODAL: {
    ID: 'systemPromptModal',
    PROMPT_TEXT: 'systemPromptModalPromptText',
    TOGGLE_ALL_DEFAULT_CONVERSATIONS: 'systemPromptModalToggleDefaultConversations',
    SAVE: 'systemPromptModalSave',
    CANCEL: 'systemPromptModalCancel',
  },
};
