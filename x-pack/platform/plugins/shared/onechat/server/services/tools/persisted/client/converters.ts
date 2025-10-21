/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolCreateParams, ToolTypeUpdateParams } from '../../tool_provider';
import type { ToolProperties } from './storage';
import type { ToolDocument, ToolPersistedDefinition } from './types';

export const fromEs = <TConfig extends object = {}>(
  document: ToolDocument
): ToolPersistedDefinition<TConfig> => {
  if (!document._source) {
    throw new Error('No source found on get conversation response');
  }

  // Migration: prefer legacy 'configuration' field, fallback to new 'config' field
  const configuration = document._source.configuration ?? document._source.config;

  return {
    id: document._source.id,
    type: document._source.type,
    description: document._source.description,
    tags: document._source.tags,
    configuration: configuration as TConfig,
    updated_at: document._source.updated_at,
    created_at: document._source.created_at,
  };
};

export const createAttributes = ({
  createRequest,
  space,
  creationDate = new Date(),
}: {
  createRequest: ToolCreateParams;
  space: string;
  creationDate?: Date;
}): ToolProperties => {
  return {
    id: createRequest.id,
    type: createRequest.type,
    space,
    description: createRequest.description ?? '',
    tags: createRequest.tags ?? [],
    config: createRequest.configuration,
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
  // Migration: read from legacy 'configuration' or new 'config', write to 'config'
  const currentConfig = current.configuration ?? current.config;

  return {
    ...current,
    ...update,
    // Explicitly omit configuration to ensure migration
    configuration: undefined,
    config: {
      ...currentConfig,
      ...update.configuration,
    },
    updated_at: updateDate.toISOString(),
  };
};
