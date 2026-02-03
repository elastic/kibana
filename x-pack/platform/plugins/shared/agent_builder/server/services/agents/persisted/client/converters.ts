/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetResponse } from '@elastic/elasticsearch/lib/api/types';
import { AgentType } from '@kbn/agent-builder-common';
import type { AgentCreateRequest, AgentUpdateRequest } from '../../../../../common/agents';
import type { AgentProperties, AgentConfigurationProperties } from './storage';
import type { PersistedAgentDefinition } from '../types';

export type Document = Pick<GetResponse<AgentProperties>, '_id' | '_source'>;

const defaultAgentType = AgentType.chat;

export const fromEs = (document: Document): PersistedAgentDefinition => {
  if (!document._source) {
    throw new Error('No source found on get conversation response');
  }

  const configuration: AgentConfigurationProperties =
    document._source.configuration ?? document._source.config;

  return {
    // backward compatibility with M1 - we check the document id.
    id: document._source.id ?? document._id,
    type: document._source.type,
    name: document._source.name,
    description: document._source.description,
    labels: document._source.labels,
    avatar_color: document._source.avatar_color,
    avatar_symbol: document._source.avatar_symbol,
    configuration: {
      instructions: configuration.instructions,
      tools: configuration.tools,
    },
  };
};

export const createRequestToEs = ({
  profile,
  space,
  creationDate,
}: {
  profile: AgentCreateRequest;
  space: string;
  creationDate: Date;
}): AgentProperties => {
  return {
    id: profile.id,
    name: profile.name,
    type: defaultAgentType,
    space,
    description: profile.description,
    labels: profile.labels,
    avatar_color: profile.avatar_color,
    avatar_symbol: profile.avatar_symbol,
    config: {
      instructions: profile.configuration.instructions,
      tools: profile.configuration.tools,
    },
    created_at: creationDate.toISOString(),
    updated_at: creationDate.toISOString(),
  };
};

export const updateRequestToEs = ({
  agentId,
  currentProps,
  update,
  updateDate,
}: {
  agentId: string;
  currentProps: AgentProperties;
  update: AgentUpdateRequest;
  updateDate: Date;
}): AgentProperties => {
  const currentConfig = currentProps.configuration ?? currentProps.config;

  const updated: AgentProperties = {
    ...currentProps,
    ...update,
    id: agentId,
    // Explicitly omit configuration to ensure migration
    configuration: undefined,
    config: {
      ...currentConfig,
      ...update.configuration,
    },
    updated_at: updateDate.toISOString(),
  };

  return updated;
};
