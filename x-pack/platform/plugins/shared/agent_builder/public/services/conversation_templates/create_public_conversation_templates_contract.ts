/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationTemplateServiceStartContract } from '@kbn/agent-builder-browser';
import type { ConversationTemplatesService } from './conversation_templates_service';

export const createPublicConversationTemplatesContract = ({
  conversationTemplatesService,
}: {
  conversationTemplatesService: ConversationTemplatesService;
}): ConversationTemplateServiceStartContract => {
  return {
    addTemplateUIDefinition: (templateId, definition) => {
      return conversationTemplatesService.addTemplateUIDefinition(templateId, definition);
    },
    getTemplateUIDefinition: (templateId) => {
      return conversationTemplatesService.getTemplateUIDefinition(templateId);
    },
  };
};
