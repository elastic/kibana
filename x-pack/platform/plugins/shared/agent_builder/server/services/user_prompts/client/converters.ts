/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserPromptDocument } from './types';
import type { UserPromptProperties } from './storage';
import type {
  CreateUserPromptPayload as UserPromptCreateParams,
  UpdateUserPromptPayload as UserPromptUpdateParams,
  UserPrompt,
} from '../../../../common/http_api/user_prompts';

export const fromEs = (document: UserPromptDocument): UserPrompt => {
  if (!document._source) {
    throw new Error('No source found on user prompt document');
  }
  return {
    id: document._source.id,
    name: document._source.name,
    content: document._source.content,
    created_at: document._source.created_at,
    updated_at: document._source.updated_at,
    created_by: document._source.created_by,
    updated_by: document._source.updated_by,
  };
};

export const createAttributes = ({
  createRequest,
  space,
  username,
  creationDate = new Date(),
}: {
  createRequest: UserPromptCreateParams;
  space: string;
  username: string;
  creationDate?: Date;
}): UserPromptProperties => {
  return {
    id: createRequest.id,
    name: createRequest.name,
    content: createRequest.content,
    space,
    created_at: creationDate.toISOString(),
    updated_at: creationDate.toISOString(),
    created_by: username,
    updated_by: username,
  };
};

export const updateDocument = ({
  current,
  update,
  username,
  updateDate = new Date(),
}: {
  current: UserPromptProperties;
  update: UserPromptUpdateParams;
  username: string;
  updateDate?: Date;
}): UserPromptProperties => {
  return {
    ...current,
    ...(update.name !== undefined && { name: update.name }),
    ...(update.content !== undefined && { content: update.content }),
    updated_at: updateDate.toISOString(),
    updated_by: username,
  };
};
