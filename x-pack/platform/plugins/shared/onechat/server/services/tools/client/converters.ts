/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolCreateParams, ToolTypeUpdateParams } from '../tool_provider';
import type { ToolProperties } from './storage';
import type { ToolDocument, ToolPersistedDefinition } from './types';

export const fromEs = <TConfig extends object = {}>(
  document: ToolDocument
): ToolPersistedDefinition<TConfig> => {
  if (!document._source) {
    throw new Error('No source found on get conversation response');
  }
  return {
    id: document._id,
    type: document._source.type,
    description: document._source.description,
    tags: document._source.tags,
    configuration: document._source.configuration as TConfig,
    updated_at: document._source.updated_at,
    created_at: document._source.created_at,
  };
};

export const createAttributes = ({
  createRequest,
  creationDate = new Date(),
}: {
  createRequest: ToolCreateParams;
  creationDate?: Date;
}): ToolProperties => {
  return {
    id: createRequest.id,
    type: createRequest.type,
    description: createRequest.description ?? '',
    tags: createRequest.tags ?? [],
    configuration: createRequest.configuration,
    created_at: creationDate.toISOString(),
    updated_at: creationDate.toISOString(),
  };
};

export const updateDocument = ({
  current,
  update,
  updateDate = new Date(),
}: {
  current: ToolProperties;
  update: ToolTypeUpdateParams;
  updateDate?: Date;
}): ToolProperties => {
  return {
    ...current,
    ...update,
    configuration: {
      ...current.configuration,
      ...update.configuration,
    },
    updated_at: updateDate.toISOString(),
  };
};
