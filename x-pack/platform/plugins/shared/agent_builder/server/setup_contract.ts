/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationUpdatedOptIn } from '@kbn/agent-builder-server';
import type { InternalSetupServices } from './services/types';
import type { AgentBuilderPluginSetup } from './types';

/**
 * The setup contract other plugins register their tools, skills, agents and attachments into. The
 * plugin hands it out in Kibana and its tasks entry in a task pod, so contributors register the same
 * way in both.
 */
export const createSetupContract = ({
  serviceSetups,
  topSnippets,
  conversationUpdatedOptIns,
}: {
  serviceSetups: InternalSetupServices;
  topSnippets: AgentBuilderPluginSetup['topSnippets'];
  conversationUpdatedOptIns: ConversationUpdatedOptIn[];
}): AgentBuilderPluginSetup => ({
  tools: {
    register: serviceSetups.tools.register.bind(serviceSetups.tools),
  },
  agents: {
    register: serviceSetups.agents.register.bind(serviceSetups.agents),
    registerType: serviceSetups.agents.registerType.bind(serviceSetups.agents),
    registerAiIndexResolver: serviceSetups.agents.registerAiIndexResolver.bind(
      serviceSetups.agents
    ),
  },
  attachments: {
    registerType: serviceSetups.attachments.registerType.bind(serviceSetups.attachments),
  },
  renderers: {
    register: serviceSetups.renderers.register.bind(serviceSetups.renderers),
  },
  conversationEvents: {
    register: serviceSetups.conversationEvents.register.bind(serviceSetups.conversationEvents),
  },
  hooks: {
    register: serviceSetups.hooks.register.bind(serviceSetups.hooks),
    registerCycleHook: serviceSetups.hooks.registerCycleHook.bind(serviceSetups.hooks),
  },
  skills: {
    register: serviceSetups.skills.registerSkill.bind(serviceSetups.skills),
  },
  plugins: {
    register: serviceSetups.plugins.register.bind(serviceSetups.plugins),
  },
  conversationTemplates: {
    register: serviceSetups.conversationTemplates.register.bind(
      serviceSetups.conversationTemplates
    ),
  },
  conversations: {
    enableUpdatedTrigger: (optIn) => {
      conversationUpdatedOptIns.push(optIn);
    },
  },
  callbacks: {
    registerConversationResolver: serviceSetups.callbacks.registerConversationResolver,
    registerTransport: serviceSetups.callbacks.registerTransport,
  },
  topSnippets,
});
