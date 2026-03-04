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
  isAgentNotFoundError,
  type ToolSelection,
  type UserIdAndName,
} from '@kbn/agent-builder-common';
import { getIsSuperuserFromRequest, getUserFromRequest } from '../../../utils';
import type {
  AgentCreateRequest,
  AgentDeleteRequest,
  AgentListOptions,
  AgentUpdateRequest,
} from '../../../../../common/agents';
import type { ToolsServiceStart } from '../../../tools';
import { createSpaceDslFilter } from '../../../../utils/spaces';
import type { AgentsUsingToolsResult, PersistedAgentDefinition } from '../types';
import type { AgentProfileStorage, AgentProperties } from './storage';
import { createStorage } from './storage';
import { createRequestToEs, type Document, fromEs, updateRequestToEs } from './converters';
import { validateToolSelection } from '../utils/tools';
import { runToolRefCleanup } from '../tool_reference_cleanup';
import {
  buildVisibilityReadFilter,
  hasReadAccess,
  validateVisibilityUpdateAccess,
  hasWriteAccess,
} from '../utils/access_control';

export interface AgentClient {
  has(agentId: string): Promise<boolean>;
  get(agentId: string): Promise<PersistedAgentDefinition>;
  create(profile: AgentCreateRequest): Promise<PersistedAgentDefinition>;
  update(agentId: string, profile: AgentUpdateRequest): Promise<PersistedAgentDefinition>;
  list(options?: AgentListOptions): Promise<PersistedAgentDefinition[]>;
  delete(options: AgentDeleteRequest): Promise<boolean>;
  getAgentsUsingTools(params: { toolIds: string[] }): Promise<AgentsUsingToolsResult>;
  removeToolRefsFromAgents(params: { toolIds: string[] }): Promise<AgentsUsingToolsResult>;
}

type StoredDocument = Omit<Document, '_source'> & { _source: AgentProperties };

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
  const scopedClient = elasticsearch.client.asScoped(request);
  const user = await getUserFromRequest({
    request,
    security,
    esClient: scopedClient.asCurrentUser,
  });
  const isSuperuser = await getIsSuperuserFromRequest({
    request,
    security,
    esClient: scopedClient.asCurrentUser,
  });
  const esClient = scopedClient.asInternalUser;
  const storage = createStorage({ logger, esClient });

  return new AgentClientImpl({
    storage,
    user,
    isSuperuser,
    request,
    space,
    toolsService,
    logger,
  });
};

class AgentClientImpl implements AgentClient {
  private readonly space: string;
  private readonly request: KibanaRequest;
  private readonly storage: AgentProfileStorage;
  private readonly toolsService: ToolsServiceStart;
  private readonly user: UserIdAndName;
  private readonly isSuperuser: boolean;
  private readonly logger: Logger;

  constructor({
    storage,
    toolsService,
    user,
    isSuperuser,
    request,
    space,
    logger,
  }: {
    storage: AgentProfileStorage;
    toolsService: ToolsServiceStart;
    user: UserIdAndName;
    isSuperuser: boolean;
    request: KibanaRequest;
    space: string;
    logger: Logger;
  }) {
    this.storage = storage;
    this.toolsService = toolsService;
    this.request = request;
    this.user = user;
    this.isSuperuser = isSuperuser;
    this.space = space;
    this.logger = logger;
  }

  async getAgentsUsingTools(params: { toolIds: string[] }): Promise<AgentsUsingToolsResult> {
    return runToolRefCleanup({
      storage: this.storage,
      spaceId: this.space,
      toolIds: params.toolIds,
      logger: this.logger,
      checkOnly: true,
    });
  }

  async removeToolRefsFromAgents(params: { toolIds: string[] }): Promise<AgentsUsingToolsResult> {
    return runToolRefCleanup({
      storage: this.storage,
      spaceId: this.space,
      toolIds: params.toolIds,
      logger: this.logger,
    });
  }

  async get(agentId: string): Promise<PersistedAgentDefinition> {
    const document = await this.getDocumentWithAccess({ agentId, access: 'read' });

    return fromEs(document);
  }

  async has(agentId: string): Promise<boolean> {
    try {
      await this.getDocumentWithAccess({ agentId, access: 'read' });
      return true;
    } catch (error) {
      if (isAgentNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  async list(options: AgentListOptions = {}): Promise<PersistedAgentDefinition[]> {
    const filters = [createSpaceDslFilter(this.space)];
    if (!this.isSuperuser) {
      filters.push(buildVisibilityReadFilter({ user: this.user }));
    }

    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1000,
      query: {
        bool: {
          filter: filters,
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

    // Intentionally skipping access checks.
    // We don't support duplicated agent ids in the same space.
    if ((await this._get(profile.id)) !== undefined) {
      throw createBadRequestError(`Agent with id ${profile.id} already exists.`);
    }

    await this.validateAgentToolSelection(profile.configuration.tools);

    const attributes = createRequestToEs({
      profile,
      user: this.user,
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
    const document = await this.getDocumentWithAccess({ agentId, access: 'write' });
    const source = document._source;

    if (
      !validateVisibilityUpdateAccess({
        source,
        update: profileUpdate,
        user: this.user,
        isSuperuser: this.isSuperuser,
      })
    ) {
      throw createAgentNotFoundError({ agentId });
    }

    if (profileUpdate.configuration?.tools) {
      await this.validateAgentToolSelection(profileUpdate.configuration.tools);
    }

    const updatedConversation = updateRequestToEs({
      agentId,
      currentProps: document._source,
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

    const document = await this.getDocumentWithAccess({ agentId: id, access: 'write' });

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

  private async getDocumentWithAccess({
    agentId,
    access,
  }: {
    agentId: string;
    access: 'read' | 'write';
  }): Promise<StoredDocument> {
    const document = await this._get(agentId);
    if (!document || !document._source) {
      throw createAgentNotFoundError({ agentId });
    }

    const hasRequestedAccess =
      access === 'read'
        ? hasReadAccess({
            source: document._source,
            user: this.user,
            isSuperuser: this.isSuperuser,
          })
        : hasWriteAccess({
            source: document._source,
            user: this.user,
            isSuperuser: this.isSuperuser,
          });

    if (!hasRequestedAccess) {
      throw createAgentNotFoundError({ agentId });
    }

    return document as StoredDocument;
  }

  /**
   * Get the document for the given agent id.
   * It doesn't check for access. Please use {@link getDocumentWithAccess} instead.
   */
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
