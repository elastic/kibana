/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { investigationTemplate } from './investigation';
import { incidentTemplate } from './incident';
import type { PluginSetupDependencies } from '../types';

const BUILTIN_TEMPLATES = [incidentTemplate, investigationTemplate];

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
