/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { useAgentBuilderServices } from './use_agent_builder_service';
import { useConversation } from './use_conversation';

export interface ConversationTemplateDisplay {
  name: string;
  icon?: IconType;
}

/**
 * Display info for the active conversation's template, resolved from the conversation
 * template UI registry. Falls back to the raw template id when no UI definition is
 * registered. Returns undefined for untemplated conversations.
 */
export const useConversationTemplateDisplay = (): ConversationTemplateDisplay | undefined => {
  const { conversationTemplatesService } = useAgentBuilderServices();
  const { conversation } = useConversation();

  const templateId = conversation?.template_id;
  if (!templateId) {
    return undefined;
  }

  const definition = conversationTemplatesService.getTemplateUIDefinition(templateId);
  return { name: definition?.name ?? templateId, icon: definition?.icon };
};
