/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface MemoryReference {
  uri: string;
  relation?: string;
  description?: string;
}

interface MemoryWriter {
  uri: string;
  metadata: Record<string, string | number>;
}

interface MemoryGovernance {
  provenance?: {
    created_by?: MemoryWriter;
    updated_by?: MemoryWriter;
  };
  lifecycle?: {
    status?: string;
  };
}

export interface StoredMemoryDocument {
  '@timestamp': string;
  id: string;
  type: string;
  title: string;
  description: string;
  content: string;
  tags?: string[];
  expires_at?: string;
  updated_at: string;
  references?: MemoryReference[];
  attributes?: Record<string, string | number | boolean | string[]>;
  governance?: MemoryGovernance;
}

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

export const addConversationReference = (
  references: MemoryReference[] | undefined,
  conversationId: string
): MemoryReference[] => {
  const existingReferences = references ?? [];
  const uri = `conversation://${conversationId}`;

  if (existingReferences.some((reference) => reference.uri === uri)) {
    return existingReferences;
  }

  return [
    ...existingReferences,
    {
      uri,
      relation: 'derived_from',
      description: 'The Agent Builder conversation where this memory was recorded.',
    },
  ];
};

export const updateMemoryProvenance = (
  governance: MemoryGovernance | undefined,
  writer: MemoryWriter,
  recordCreation: boolean
): MemoryGovernance => ({
  ...governance,
  provenance: {
    ...governance?.provenance,
    ...(recordCreation &&
      governance?.provenance?.created_by === undefined && { created_by: writer }),
    updated_by: writer,
  },
});
