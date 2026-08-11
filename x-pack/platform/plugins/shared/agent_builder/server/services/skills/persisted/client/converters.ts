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
  const countField = document.fields?.referenced_content_count;
  const referencedContent = document._source.referenced_content ?? [];
  return {
    id: document._source.id,
    name: document._source.name,
    base_path: document._source.base_path,
    description: document._source.description,
    content: document._source.content ?? '',
    referenced_content: referencedContent,
    tool_ids: document._source.tool_ids ?? [],
    plugin_id: document._source.plugin_id,
    referenced_content_count:
      Array.isArray(countField) && countField.length > 0
        ? (countField[0] as number)
        : referencedContent.length,
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
    base_path: createRequest.base_path,
    space,
    description: createRequest.description,
    content: createRequest.content,
    referenced_content: createRequest.referenced_content,
    tool_ids: createRequest.tool_ids ?? [],
    plugin_id: createRequest.plugin_id,
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
    name: update.name ?? current.name,
    base_path: update.base_path ?? current.base_path,
    description: update.description ?? current.description,
    content: update.content ?? current.content,
    referenced_content: update.referenced_content ?? current.referenced_content,
    tool_ids: update.tool_ids ?? current.tool_ids,
    updated_at: updateDate.toISOString(),
  };
};
