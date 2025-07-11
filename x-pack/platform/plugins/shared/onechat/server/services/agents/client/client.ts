/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as esErrors } from '@elastic/elasticsearch';
import type {
  ElasticsearchServiceStart,
  KibanaRequest,
  Logger,
  SecurityServiceStart,
} from '@kbn/core/server';
import {
  type AgentDefinition,
  AgentType,
  createAgentNotFoundError,
  createBadRequestError,
  isAgentNotFoundError,
  oneChatDefaultAgentId,
  allToolsSelectionWildcard as allTools,
  type ToolSelection,
  type UserIdAndName,
} from '@kbn/onechat-common';
import type {
  AgentCreateRequest,
  AgentDeleteRequest,
  AgentListOptions,
  AgentUpdateRequest,
} from '../../../../common/agents';
import type { ToolsServiceStart } from '../../tools';
import { AgentProfileStorage, createStorage } from './storage';
import { createRequestToEs, type Document, fromEs, updateProfile } from './converters';
import { ensureValidId, validateToolSelection } from './utils';

export interface AgentClient {
  has(agentId: string): Promise<boolean>;
  get(agentId: string): Promise<AgentDefinition>;
  create(profile: AgentCreateRequest): Promise<AgentDefinition>;
  update(agentId: string, profile: AgentUpdateRequest): Promise<AgentDefinition>;
  list(options?: AgentListOptions): Promise<AgentDefinition[]>;
  delete(options: AgentDeleteRequest): Promise<boolean>;
}

export const createClient = async ({
  request,
  elasticsearch,
  security,
  toolsService,
  logger,
}: {
  request: KibanaRequest;
  security: SecurityServiceStart;
  elasticsearch: ElasticsearchServiceStart;
  toolsService: ToolsServiceStart;
  logger: Logger;
}): Promise<AgentClient> => {
  const authUser = security.authc.getCurrentUser(request);
  if (!authUser) {
    throw new Error('No user bound to the provided request');
  }

  const esClient = elasticsearch.client.asScoped(request).asInternalUser;
  const storage = createStorage({ logger, esClient });
  const user = { id: authUser.profile_uid!, username: authUser.username };

  return new AgentClientImpl({ storage, user, request, toolsService });
};

class AgentClientImpl implements AgentClient {
  private readonly request: KibanaRequest;
  private readonly storage: AgentProfileStorage;
  private readonly toolsService: ToolsServiceStart;
  private readonly user: UserIdAndName;

  constructor({
    storage,
    toolsService,
    user,
    request,
  }: {
    storage: AgentProfileStorage;
    toolsService: ToolsServiceStart;
    user: UserIdAndName;
    request: KibanaRequest;
  }) {
    this.storage = storage;
    this.toolsService = toolsService;
    this.request = request;
    this.user = user;
  }

  async get(agentId: string): Promise<AgentDefinition> {
    let document: Document;
    try {
      document = await this.storage.getClient().get({ id: agentId });
    } catch (e) {
      if (e instanceof esErrors.ResponseError && e.statusCode === 404) {
        // if the config for the default agent isn't persisted, we return the default definition
        if (agentId === oneChatDefaultAgentId) {
          return createDefaultAgentDefinition();
        }
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
    // default agent is always present
    if (agentId === oneChatDefaultAgentId) {
      return true;
    }

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

  async list(options: AgentListOptions = {}): Promise<AgentDefinition[]> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1000,
      // no filtering options for now
      query: {
        match_all: {},
      },
    });

    const agents = response.hits.hits.map((hit) => fromEs(hit as Document));

    // if default agent not in the list, we add the definition
    if (!agents.find((a) => a.id === oneChatDefaultAgentId)) {
      agents.unshift(createDefaultAgentDefinition());
    }

    return agents;
  }

  async create(profile: AgentCreateRequest): Promise<AgentDefinition> {
    const now = new Date();

    ensureValidId(profile.id);

    if (await this.exists(profile.id)) {
      throw createBadRequestError(`Agent with id ${profile.id} already exists.`);
    }

    await this.validateAgentToolSelection(profile.configuration.tools);

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

  async update(agentId: string, profileUpdate: AgentUpdateRequest): Promise<AgentDefinition> {
    // temporary, until we enable default agent update
    if (agentId === oneChatDefaultAgentId) {
      throw createBadRequestError(`Default agent cannot be updated.`);
    }

    const now = new Date();
    const document = await this.storage.getClient().get({ id: agentId });

    if (!hasAccess({ profile: document, user: this.user })) {
      throw createAgentNotFoundError({ agentId });
    }

    if (profileUpdate.configuration?.tools) {
      await this.validateAgentToolSelection(profileUpdate.configuration.tools);
    }

    const updatedConversation = updateProfile({
      profile: document._source!,
      update: profileUpdate,
      updateDate: now,
    });

    await this.storage.getClient().index({
      id: agentId,
      document: updatedConversation,
    });

    return this.get(agentId);
  }

  async delete(options: AgentDeleteRequest): Promise<boolean> {
    const { id } = options;

    if (id === oneChatDefaultAgentId) {
      throw createBadRequestError(`Default agent cannot be deleted.`);
    }

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

  // Agent tool selection validation helper
  private async validateAgentToolSelection(toolSelection: ToolSelection[]) {
    const errors = await validateToolSelection({
      toolRegistry: await this.toolsService.getRegistry({ request: this.request }),
      request: this.request,
      toolSelection,
    });
    if (errors.length > 0) {
      throw createBadRequestError(
        `Agent tool selection validation failed:\n` + errors.map((e) => `- ${e}`).join('\n')
      );
    }
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

const createDefaultAgentDefinition = (): AgentDefinition => {
  return {
    id: oneChatDefaultAgentId,
    type: AgentType.chat,
    name: 'Onechat default agent',
    description: 'The default onechat agent',
    configuration: {
      tools: [{ tool_ids: [allTools] }],
    },
  };
};

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
