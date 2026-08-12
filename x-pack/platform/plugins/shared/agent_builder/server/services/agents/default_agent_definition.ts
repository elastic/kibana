/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { agentBuilderDefaultAgentId, AgentAccessControlMode } from '@kbn/agent-builder-common';
import type { AgentCreateRequest } from '../../../common/agents';

export const getDefaultAgentCreateRequest = (): AgentCreateRequest => ({
  id: agentBuilderDefaultAgentId,
  name: i18n.translate('xpack.agentBuilder.builtin.defaultAgent.name', {
    defaultMessage: 'Elastic AI Agent',
  }),
  description: i18n.translate('xpack.agentBuilder.builtin.defaultAgent.description', {
    defaultMessage:
      'The default agent for everyday work across your data and configurations. It has access to all current and future Elastic-built capabilities by default. You can customize it for specific tasks with custom skills, tools, plugins, and connectors.',
  }),
  access_control: { access_mode: AgentAccessControlMode.Public },
  configuration: {
    // enable built-in skills and default set of tools for the default agent
    enable_elastic_capabilities: true,
    tools: [],
    skill_ids: [],
  },
});
