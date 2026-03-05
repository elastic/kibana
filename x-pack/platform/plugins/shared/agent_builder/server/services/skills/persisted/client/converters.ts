/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PersistedSkillCreateRequest,
  PersistedSkillUpdateRequest,
} from '@kbn/agent-builder-common';
import type { SkillProperties } from './storage';
import type { SkillDocument, SkillPersistedDefinition } from './types';

export const fromEs = (document: SkillDocument): SkillPersistedDefinition => {
  if (!document._source) {
    throw new Error('No source found on skill document');
  }
  return {
    id: document._source.id,
    name: document._source.name,
    description: document._source.description,
    content: document._source.content,
    referenced_content: document._source.referenced_content,
    tool_ids: document._source.tool_ids ?? [],
    created_at: document._source.created_at,
    updated_at: document._source.updated_at,
  };
};

export const createAttributes = ({
  createRequest,
  space,
  creationDate = new Date(),
}: {
  createRequest: PersistedSkillCreateRequest;
  space: string;
  creationDate?: Date;
}): SkillProperties => {
  return {
    id: createRequest.id,
    name: createRequest.name,
    space,
    description: createRequest.description,
    content: createRequest.content,
    referenced_content: createRequest.referenced_content,
    tool_ids: createRequest.tool_ids ?? [],
    created_at: creationDate.toISOString(),
    updated_at: creationDate.toISOString(),
  };
};

export const updateDocument = ({
  current,
  update,
  updateDate = new Date(),
}: {
  current: SkillProperties;
  update: PersistedSkillUpdateRequest;
  updateDate?: Date;
}): SkillProperties => {
  return {
    ...current,
    ...(update.name !== undefined && { name: update.name }),
    ...(update.description !== undefined && { description: update.description }),
    ...(update.content !== undefined && { content: update.content }),
    ...(update.referenced_content !== undefined && {
      referenced_content: update.referenced_content,
    }),
    ...(update.tool_ids !== undefined && { tool_ids: update.tool_ids }),
    updated_at: updateDate.toISOString(),
  };
};
