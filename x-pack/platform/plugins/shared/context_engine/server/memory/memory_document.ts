/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { AI_INDEX_PRIVILEGES_PATH } from '../../common/space_filter';

export interface MemoryReference {
  uri: string;
  relation?: string;
  description?: string;
}

export interface MemoryWriter {
  uri: string;
  metadata: Record<string, string | number>;
}

export interface MemoryUser {
  id?: string;
  username?: string;
}

type MemoryLifecycleStatus = 'active' | 'deleted';

export interface MemoryGovernance {
  provenance?: {
    created_by?: MemoryWriter;
    updated_by?: MemoryWriter;
  };
  lifecycle?: {
    status?: MemoryLifecycleStatus;
  };
}

export interface MemoryPermissions {
  kibana: { privileges: Array<{ space: string; name: string[]; count: number }> };
}

export interface StoredMemoryDocument {
  '@timestamp': string;
  id: string;
  type: string;
  title: string;
  description?: string;
  content: string;
  tags?: string[];
  expires_at?: string;
  updated_at: string;
  references?: MemoryReference[];
  attributes?: Record<string, string | number | boolean | string[]>;
  governance?: MemoryGovernance;
  permissions?: MemoryPermissions;
}

/** Visible in one space only. No Kibana privileges are needed beyond reading the store. */
export const createSpacePermissions = (spaceId: string): MemoryPermissions => ({
  kibana: { privileges: [{ space: spaceId, name: [], count: 0 }] },
});

/** Matches memories written in exactly this space. */
export const buildMemorySpaceFilter = (spaceId: string): QueryDslQueryContainer => ({
  nested: {
    path: AI_INDEX_PRIVILEGES_PATH,
    query: { term: { [`${AI_INDEX_PRIVILEGES_PATH}.space`]: spaceId } },
  },
});

export const isDeletedMemory = ({ governance }: Pick<StoredMemoryDocument, 'governance'>) =>
  governance?.lifecycle?.status === 'deleted';

export const isActiveMemory = (
  document: Pick<StoredMemoryDocument, 'governance' | 'expires_at'>,
  now: Date
): boolean =>
  !isDeletedMemory(document) &&
  (document.expires_at === undefined || new Date(document.expires_at).getTime() > now.getTime());

/** Points at one knowledge indicator in an AI index. */
export const buildKiUri = (aiIndexId: string, id: string): string =>
  `ki://${aiIndexId}/${encodeURIComponent(id)}`;

export const createUserWriter = (user: MemoryUser, spaceId: string): MemoryWriter => ({
  uri: `user://${encodeURIComponent(user.id ?? user.username ?? 'unknown')}`,
  metadata: {
    ...(user.username !== undefined && { username: user.username }),
    space_id: spaceId,
  },
});

/** Adds the calling user to a writer supplied by another plugin, such as an agent tool. */
export const withUserId = (writer: MemoryWriter, user: MemoryUser): MemoryWriter =>
  user.id === undefined
    ? writer
    : { ...writer, metadata: { ...writer.metadata, user_id: user.id } };

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
