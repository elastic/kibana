/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { BuiltInAgentDefinition } from '@kbn/agent-builder-server/agents';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { CONTEXT_ENGINE_FEEDBACK_AGENT_ID } from '@kbn/context-engine-plugin/common/constants';
import instructions from './instructions.md.text';

export const feedbackLoopAgent: BuiltInAgentDefinition = {
  id: CONTEXT_ENGINE_FEEDBACK_AGENT_ID,
  name: i18n.translate('xpack.contextEngine.feedbackLoopAgent.name', {
    defaultMessage: 'Context Engine Feedback Loop',
  }),
  description: i18n.translate('xpack.contextEngine.feedbackLoopAgent.description', {
    defaultMessage:
      'Reviews how agents used an AI index and proposes improvements to its knowledge indicators and automations. Used by default when an AI index has no analysis agent of its own.',
  }),
  avatar_icon: 'sparkles',
  configuration: {
    instructions,
    // The same capabilities the default Elastic agent gets: the run has to investigate signals with
    // ES|QL and inspect knowledge indicators and workflows, and any capability added to the default
    // agent later is useful here for the same reason.
    enable_elastic_capabilities: true,
    tools: [],
    skill_ids: [],
  },
  availability: {
    cacheMode: 'space',
    handler: async ({ uiSettings }) => {
      const enabled = await uiSettings.get<boolean>(CONTEXT_ENGINE_ENABLED_SETTING_ID);
      return enabled
        ? { status: 'available' }
        : { status: 'unavailable', reason: 'Context Engine is disabled' };
    },
  },
};

export const registerFeedbackLoopAgent = (agentBuilder: AgentBuilderPluginSetup): void => {
  agentBuilder.agents.register(feedbackLoopAgent);
};
