/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as esErrors } from '@elastic/elasticsearch';
import {
  type UserIdAndName,
  type AgentProfile,
  createAgentNotFoundError,
  createBadRequestError,
  isAgentNotFoundError,
  oneChatDefaultAgentId,
} from '@kbn/onechat-common';
import type {
  AgentProfileListOptions,
  AgentProfileCreateRequest,
  AgentProfileUpdateRequest,
  AgentProfileDeleteRequest,
} from '../../../../common/agent_profiles';
import { AgentProfileStorage } from './storage';
import { fromEs, toEs, createRequestToEs, updateProfile, type Document } from './converters';
import { ensureValidId } from './utils';

export interface AgentProfileClient {
  has(agentId: string): Promise<boolean>;
  get(agentId: string): Promise<AgentProfile>;
  create(profile: AgentProfileCreateRequest): Promise<AgentProfile>;
  update(profile: AgentProfileUpdateRequest): Promise<AgentProfile>;
  list(options?: AgentProfileListOptions): Promise<AgentProfile[]>;
  delete(options: AgentProfileDeleteRequest): Promise<boolean>;
}

export const createClient = ({
  storage,
  user,
}: {
  storage: AgentProfileStorage;
  user: UserIdAndName;
}): AgentProfileClient => {
  return new AgentProfileClientImpl({ storage, user });
};

class AgentProfileClientImpl implements AgentProfileClient {
  private readonly storage: AgentProfileStorage;
  private readonly user: UserIdAndName;

  constructor({ storage, user }: { storage: AgentProfileStorage; user: UserIdAndName }) {
    this.storage = storage;
    this.user = user;
  }

  async get(agentId: string): Promise<AgentProfile> {
    let document: Document;
    try {
      document = await this.storage.getClient().get({ id: agentId });
    } catch (e) {
      if (e instanceof esErrors.ResponseError && e.statusCode === 404) {
        throw createAgentNotFoundError({ agentId });
      } else {
        throw e;
      }
    }

    if (!hasAccess({ profile: document, user: this.user })) {
      throw createAgentNotFoundError({ agentId });
    }

    return fromEs(document);
  }

  async has(agentId: string): Promise<boolean> {
    try {
      await this.get(agentId);
      return true;
    } catch (e) {
      if (isAgentNotFoundError(e)) {
        return false;
      }
      throw e;
    }
  }

  async list(options: AgentProfileListOptions = {}): Promise<AgentProfile[]> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1000,
      // no filtering options for now
      query: {
        match_all: {},
      },
    });

    return response.hits.hits.map((hit) => fromEs(hit as Document));
  }

  async create(profile: AgentProfileCreateRequest): Promise<AgentProfile> {
    const now = new Date();

    ensureValidId(profile.id);

    if (await this.exists(profile.id)) {
      throw createBadRequestError(`Agent with id ${profile.id} already exists.`);
    }

    const attributes = createRequestToEs({
      profile,
      creationDate: now,
    });

    await this.storage.getClient().index({
      id: profile.id,
      document: attributes,
    });

    return this.get(profile.id);
  }

  async update(profileUpdate: AgentProfileUpdateRequest): Promise<AgentProfile> {
    const now = new Date();
    const document = await this.storage.getClient().get({ id: profileUpdate.id });

    if (!hasAccess({ profile: document, user: this.user })) {
      throw createAgentNotFoundError({ agentId: profileUpdate.id });
    }

    const storedProfile = fromEs(document);
    const updatedConversation = updateProfile({
      profile: storedProfile,
      update: profileUpdate,
      updateDate: now,
    });
    const attributes = toEs(updatedConversation);

    await this.storage.getClient().index({
      id: profileUpdate.id,
      document: attributes,
    });

    return this.get(profileUpdate.id);
  }

  async delete(options: AgentProfileDeleteRequest): Promise<boolean> {
    const { id } = options;
    let document: Document;
    try {
      document = await this.storage.getClient().get({ id });
    } catch (e) {
      if (e instanceof esErrors.ResponseError && e.statusCode === 404) {
        throw createAgentNotFoundError({ agentId: id });
      } else {
        throw e;
      }
    }

    if (!hasAccess({ profile: document, user: this.user })) {
      throw createAgentNotFoundError({ agentId: id });
    }

    const deleteResponse = await this.storage.getClient().delete({ id });
    return deleteResponse.result === 'deleted';
  }

  private async exists(agentId: string): Promise<boolean> {
    if (agentId === oneChatDefaultAgentId) {
      return true;
    }
    try {
      await this.storage.getClient().get({ id: agentId });
      return true;
    } catch (e) {
      if (e instanceof esErrors.ResponseError && e.statusCode === 404) {
        return false;
      } else {
        throw e;
      }
    }
  }
}

const hasAccess = ({
  profile,
  user,
}: {
  profile: Pick<Document, '_source'>;
  user: UserIdAndName;
}) => {
  // no access control for now
  return true;
};
