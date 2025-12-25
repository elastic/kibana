/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneChatDefaultAgentId, defaultAgentToolIds } from '@kbn/onechat-common';
import type { BuiltInAgentDefinition } from '@kbn/onechat-server/agents';

export const createDefaultAgentDefinition = (): BuiltInAgentDefinition => {
  return {
    id: oneChatDefaultAgentId,
    name: 'Elastic AI Agent',
    description: 'Elastic AI Agent',
    configuration: {
      tools: [{ tool_ids: [...defaultAgentToolIds] }],
    },
  };
};
