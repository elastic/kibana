/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetResponse } from '@elastic/elasticsearch/lib/api/types';
import { type AgentProfile, AgentType } from '@kbn/onechat-common';
import type {
  AgentProfileCreateRequest,
  AgentProfileUpdateRequest,
} from '../../../../common/agent_profiles';
import { AgentProfileProperties } from './storage';

export type Document = Pick<GetResponse<AgentProfileProperties>, '_source' | '_id'>;

export const fromEs = (document: Document): AgentProfile => {
  if (!document._source) {
    throw new Error('No source found on get conversation response');
  }

  return {
    id: document._id,
    name: document._source.name,
    description: document._source.description,
    customInstructions: document._source.configuration.custom_instructions,
    toolSelection: document._source.configuration.tool_selection,
    createdAt: document._source.created_at,
    updatedAt: document._source.updated_at,
  };
};

export const toEs = (profile: AgentProfile): AgentProfileProperties => {
  return {
    name: profile.name,
    type: AgentType.conversational,
    description: profile.description,
    configuration: {
      custom_instructions: profile.customInstructions,
      tool_selection: profile.toolSelection,
    },
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
  };
};

export const createRequestToEs = ({
  profile,
  creationDate,
}: {
  profile: AgentProfileCreateRequest;
  creationDate: Date;
}): AgentProfileProperties => {
  return {
    name: profile.name,
    type: AgentType.conversational,
    description: profile.description,
    configuration: {
      custom_instructions: profile.customInstructions,
      tool_selection: profile.toolSelection,
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
  profile: AgentProfile;
  update: AgentProfileUpdateRequest;
  updateDate: Date;
}) => {
  const updated = {
    ...profile,
    ...update,
    updatedAt: updateDate.toISOString(),
  };

  return updated;
};
