/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchServiceStart,
  KibanaRequest,
  Logger,
  SecurityServiceStart,
} from '@kbn/core/server';
import { validateAgentId } from '@kbn/agent-builder-common/agents';
import {
  createAgentNotFoundError,
  createBadRequestError,
  type ToolSelection,
  type UserIdAndName,
} from '@kbn/agent-builder-common';
import { getUserFromRequest } from '../../../utils';
import type {
  AgentCreateRequest,
  AgentDeleteRequest,
  AgentListOptions,
  AgentUpdateRequest,
} from '../../../../../common/agents';
import type { ToolsServiceStart } from '../../../tools';
import { createSpaceDslFilter } from '../../../../utils/spaces';
import type { PersistedAgentDefinition } from '../types';
import type { AgentProfileStorage } from './storage';
import { createStorage } from './storage';
import { createRequestToEs, type Document, fromEs, updateRequestToEs } from './converters';
import { validateToolSelection } from './utils';

export interface AgentClient {
  has(agentId: string): Promise<boolean>;
  get(agentId: string): Promise<PersistedAgentDefinition>;
  create(profile: AgentCreateRequest): Promise<PersistedAgentDefinition>;
  update(agentId: string, profile: AgentUpdateRequest): Promise<PersistedAgentDefinition>;
  list(options?: AgentListOptions): Promise<PersistedAgentDefinition[]>;
  delete(options: AgentDeleteRequest): Promise<boolean>;
}

export const createClient = async ({
  space,
  request,
  elasticsearch,
  security,
  toolsService,
  logger,
}: {
  space: string;
  request: KibanaRequest;
  security: SecurityServiceStart;
  elasticsearch: ElasticsearchServiceStart;
  toolsService: ToolsServiceStart;
  logger: Logger;
}): Promise<AgentClient> => {
  const user = getUserFromRequest(request, security);
  const esClient = elasticsearch.client.asScoped(request).asInternalUser;
  const storage = createStorage({ logger, esClient });

  return new AgentClientImpl({ storage, user, request, space, toolsService });
};

class AgentClientImpl implements AgentClient {
  private readonly space: string;
  private readonly request: KibanaRequest;
  private readonly storage: AgentProfileStorage;
  private readonly toolsService: ToolsServiceStart;
  private readonly user: UserIdAndName;

  constructor({
    storage,
    toolsService,
    user,
    request,
    space,
  }: {
    storage: AgentProfileStorage;
    toolsService: ToolsServiceStart;
    user: UserIdAndName;
    request: KibanaRequest;
    space: string;
  }) {
    this.storage = storage;
    this.toolsService = toolsService;
    this.request = request;
    this.user = user;
    this.space = space;
  }

  async get(agentId: string): Promise<PersistedAgentDefinition> {
    const document = await this._get(agentId);
    if (!document) {
      throw createAgentNotFoundError({ agentId });
    }

    if (!hasAccess({ document, user: this.user })) {
      throw createAgentNotFoundError({ agentId });
    }

    return fromEs(document);
  }

  async has(agentId: string): Promise<boolean> {
    const document = await this._get(agentId);
    return document !== undefined;
  }

  async list(options: AgentListOptions = {}): Promise<PersistedAgentDefinition[]> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1000,
      query: {
        bool: {
          filter: [createSpaceDslFilter(this.space)],
        },
      },
    });

    return response.hits.hits.map((hit) => fromEs(hit as Document));
  }

  async create(profile: AgentCreateRequest): Promise<PersistedAgentDefinition> {
    const now = new Date();

    const validationError = validateAgentId({ agentId: profile.id, builtIn: false });
    if (validationError) {
      throw createBadRequestError(`Invalid agent id: "${profile.id}": ${validationError}`);
    }

    if (await this.exists(profile.id)) {
      throw createBadRequestError(`Agent with id ${profile.id} already exists.`);
    }

    await this.validateAgentToolSelection(profile.configuration.tools);

    const attributes = createRequestToEs({
      profile,
      space: this.space,
      creationDate: now,
    });

    await this.storage.getClient().index({
      document: attributes,
    });

    return this.get(profile.id);
  }

  async update(
    agentId: string,
    profileUpdate: AgentUpdateRequest
  ): Promise<PersistedAgentDefinition> {
    const document = await this._get(agentId);
    if (!document) {
      throw createAgentNotFoundError({
        agentId,
      });
    }

    if (!hasAccess({ document, user: this.user })) {
      throw createAgentNotFoundError({ agentId });
    }

    if (profileUpdate.configuration?.tools) {
      await this.validateAgentToolSelection(profileUpdate.configuration.tools);
    }

    const updatedConversation = updateRequestToEs({
      agentId,
      currentProps: document._source!,
      update: profileUpdate,
      updateDate: new Date(),
    });

    await this.storage.getClient().index({
      id: document._id,
      document: updatedConversation,
    });

    return this.get(agentId);
  }

  async delete(options: AgentDeleteRequest): Promise<boolean> {
    const { id } = options;

    const document = await this._get(id);
    if (!document) {
      throw createAgentNotFoundError({ agentId: id });
    }

    if (!hasAccess({ document, user: this.user })) {
      throw createAgentNotFoundError({ agentId: id });
    }

    const deleteResponse = await this.storage.getClient().delete({ id: document._id });
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
    const document = await this._get(agentId);
    return !!document;
  }

  private async _get(agentId: string): Promise<Document | undefined> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      query: {
        bool: {
          filter: [
            createSpaceDslFilter(this.space),
            {
              bool: {
                // BWC compatibility with M1 - agentId was stored as the _id
                should: [{ term: { id: agentId } }, { term: { _id: agentId } }],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
    });
    if (response.hits.hits.length === 0) {
      return undefined;
    } else {
      return response.hits.hits[0] as Document;
    }
  }
}

const hasAccess = ({
  document,
  user,
}: {
  document: Pick<Document, '_source'>;
  user: UserIdAndName;
}) => {
  // no access control for now
  return true;
};
