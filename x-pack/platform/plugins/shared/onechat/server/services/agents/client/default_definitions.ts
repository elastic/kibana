/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentDefinition } from '@kbn/onechat-common';
import { AgentType, oneChatDefaultAgentId, builtinToolIds as tools } from '@kbn/onechat-common';

export const defaultAgentTools = [
  tools.search,
  tools.listIndices,
  tools.getIndexMapping,
  tools.executeEsql,
];

export const createDefaultAgentDefinition = (): AgentDefinition => {
  return {
    id: oneChatDefaultAgentId,
    type: AgentType.chat,
    name: 'Onechat default agent',
    description: 'The default onechat agent',
    configuration: {
      tools: [{ tool_ids: [...defaultAgentTools] }],
    },
  };
};
