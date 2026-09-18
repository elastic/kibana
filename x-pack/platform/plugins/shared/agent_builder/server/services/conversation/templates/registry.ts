/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationTemplate } from '@kbn/agent-builder-common';
import { CONVERSATION_TEMPLATES } from '../../../../common/templates';
import { validateTemplateDefinition } from './validation';

// Validate all code-registered templates at module load time so a malformed
// built-in fails fast rather than at first use.
for (const template of CONVERSATION_TEMPLATES) {
  validateTemplateDefinition(template);
}

export const getTemplate = (id: string): ConversationTemplate | undefined =>
  CONVERSATION_TEMPLATES.find((t) => t.id === id);
