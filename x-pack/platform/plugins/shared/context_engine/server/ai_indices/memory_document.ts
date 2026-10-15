/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KiLifecycleStatus } from '../../common/step_types/ki';

export interface MemoryReference {
  uri: string;
  relation?: string;
  description?: string;
}

export interface MemoryWriter {
  uri: string;
  metadata: Record<string, string | number>;
}

export interface MemoryGovernance {
  provenance?: {
    created_by?: MemoryWriter;
    updated_by?: MemoryWriter;
  };
  lifecycle?: {
    status?: KiLifecycleStatus;
  };
}

export interface MemoryPermissions {
  kibana?: {
    privileges?: Array<{
      space?: string;
      name?: string[];
      count?: number;
    }>;
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
  permissions?: MemoryPermissions;
}

export const createMemoryWriter = ({
  source,
  runId,
  agentId,
}: {
  source: string;
  runId: string;
  agentId?: string;
}): MemoryWriter => ({
  uri: source,
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
