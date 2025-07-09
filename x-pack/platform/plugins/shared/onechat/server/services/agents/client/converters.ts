/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetResponse } from '@elastic/elasticsearch/lib/api/types';
import { type AgentDefinition, AgentType } from '@kbn/onechat-common';
import type { AgentCreateRequest, AgentUpdateRequest } from '../../../../common/agents';
import { AgentProfileProperties } from './storage';

export type Document = Pick<GetResponse<AgentProfileProperties>, '_source' | '_id'>;

const defaultAgentType = AgentType.chat;

export const fromEs = (document: Document): AgentDefinition => {
  if (!document._source) {
    throw new Error('No source found on get conversation response');
  }

  return {
    id: document._id,
    type: document._source.type,
    name: document._source.name,
    description: document._source.description,
    configuration: {
      instructions: document._source.configuration.instructions,
      tools: document._source.configuration.tools,
    },
  };
};

export const createRequestToEs = ({
  profile,
  creationDate,
}: {
  profile: AgentCreateRequest;
  creationDate: Date;
}): AgentProfileProperties => {
  return {
    name: profile.name,
    type: defaultAgentType,
    description: profile.description,
    configuration: {
      instructions: profile.configuration.instructions,
      tools: profile.configuration.tools,
    },
    created_at: creationDate.toISOString(),
    updated_at: creationDate.toISOString(),
  };
};

export const updateProfile = ({
  profile,
  update,
  updateDate,
}: {
  profile: AgentProfileProperties;
  update: AgentUpdateRequest;
  updateDate: Date;
}): AgentProfileProperties => {
  const updated: AgentProfileProperties = {
    ...profile,
    ...update,
    configuration: {
      ...profile.configuration,
      ...update.configuration,
    },
    updated_at: updateDate.toISOString(),
  };

  return updated;
};
