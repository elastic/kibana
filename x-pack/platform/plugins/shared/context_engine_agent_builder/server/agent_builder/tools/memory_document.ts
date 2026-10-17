/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MEMORY_READ_ACTION } from '@kbn/context-engine-plugin/common/memory';

interface MemoryReference {
  uri: string;
  relation?: string;
  description?: string;
}

interface MemoryWriter {
  uri: string;
  metadata: Record<string, string | number>;
}

interface MemoryKibanaPrivilegeGroup {
  space: string;
  name: string[];
  count: number;
}

interface MemoryPermissions {
  kibana: { privileges: MemoryKibanaPrivilegeGroup[] };
}

type MemoryLifecycleStatus = 'active' | 'deleted';

interface MemoryGovernance {
  provenance?: {
    created_by?: MemoryWriter;
    updated_by?: MemoryWriter;
  };
  lifecycle?: {
    status?: MemoryLifecycleStatus;
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
  /** Principals that may read the memory; absent means shared with everyone who can read the index. */
  scope_id?: string[];
  permissions?: MemoryPermissions;
}

export const createMemoryWriter = ({
  userScopeId,
  toolId,
  runId,
  agentId,
}: {
  userScopeId: string;
  toolId: string;
  runId: string;
  agentId?: string;
}): MemoryWriter => ({
  uri: userScopeId,
  metadata: {
    tool_id: toolId,
    run_id: runId,
    ...(agentId !== undefined && { agent_id: agentId }),
  },
});

export const createMemoryPermissions = (spaceId: string): MemoryPermissions => ({
  kibana: { privileges: [{ space: spaceId, name: [MEMORY_READ_ACTION], count: 1 }] },
});

export const isMemoryInScope = (
  document: Pick<StoredMemoryDocument, 'scope_id'>,
  scopeId: string
): boolean => document.scope_id === undefined || document.scope_id.includes(scopeId);

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
