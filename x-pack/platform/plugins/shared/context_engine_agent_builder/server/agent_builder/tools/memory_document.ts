/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MemoryReference,
  MemoryWriter,
} from '@kbn/context-engine-plugin/server/memory/memory_document';

export const createMemoryWriter = ({
  toolId,
  runId,
  agentId,
}: {
  toolId: string;
  runId: string;
  agentId?: string;
}): MemoryWriter => ({
  uri: `tool://${toolId}`,
  metadata: {
    run_id: runId,
    ...(agentId !== undefined && { agent_id: agentId }),
  },
});

export const createConversationReferences = (
  conversationId: string | undefined
): MemoryReference[] | undefined => {
  if (conversationId === undefined) {
    return undefined;
  }

  return [
    {
      uri: `conversation://${conversationId}`,
      relation: 'derived_from',
      description: 'The Agent Builder conversation where this memory was recorded.',
    },
  ];
};
