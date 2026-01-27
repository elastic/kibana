/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId, defaultAgentToolIds } from '@kbn/agent-builder-common';
import type { BuiltInAgentDefinition } from '@kbn/agent-builder-server/agents';

export const createDefaultAgentDefinition = (): BuiltInAgentDefinition => {
  return {
    id: agentBuilderDefaultAgentId,
    name: 'Elastic AI Agent',
    description: 'Elastic AI Agent',
    configuration: {
      tools: [{ tool_ids: [...defaultAgentToolIds] }],
    },
  };
};
