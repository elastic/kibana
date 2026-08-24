/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { phishingTemplate } from './phishing';
import { securityFindingTemplate } from './security_finding';
import { quickNoteTemplate } from './quick_note';
import type { PluginSetupDependencies } from '../types';

const BUILTIN_TEMPLATES = [phishingTemplate, securityFindingTemplate, quickNoteTemplate];

export const registerConversationTemplates = ({
  setupDeps,
}: {
  setupDeps: PluginSetupDependencies;
}): void => {
  const { agentBuilder } = setupDeps;
  for (const template of BUILTIN_TEMPLATES) {
    agentBuilder.conversationTemplates.register(template);
  }
};
