/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import type { ConversationTemplatesService } from '../../services/conversation_templates';
import { useAgentBuilderServices } from './use_agent_builder_service';
import { useConversation } from './use_conversation';

export const DEFAULT_CONVERSATION_ICON: IconType = 'comment';

export const getConversationTemplateIcon = (
  conversationTemplatesService: ConversationTemplatesService,
  templateId: string | undefined
): IconType => {
  if (!templateId) {
    return DEFAULT_CONVERSATION_ICON;
  }
  return (
    conversationTemplatesService.getTemplateUIDefinition(templateId)?.icon ??
    DEFAULT_CONVERSATION_ICON
  );
};

export interface ConversationTemplateDisplay {
  name: string;
  icon?: IconType;
}

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
