/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { AgentProfile } from '@kbn/onechat-common';
import { createBadRequestError } from '@kbn/onechat-common/base/errors';
import type { KibanaRequest } from '@kbn/core/server';
import type {
  AgentProfileCreateRequest,
  AgentProfileUpdateRequest,
  AgentProfileListOptions,
  AgentProfileDeleteRequest,
} from '../../../../common/agent_profiles';
import type { AgentProfileClient } from './client';
import type { ToolsServiceStart } from '../../tools';
import { validateToolSelection } from './utils';

export interface AgentProfileService {
  has(agentId: string): Promise<boolean>;
  get(agentId: string): Promise<AgentProfile>;
  create(profile: AgentProfileCreateRequest): Promise<AgentProfile>;
  update(profile: AgentProfileUpdateRequest): Promise<AgentProfile>;
  list(options?: AgentProfileListOptions): Promise<AgentProfile[]>;
  delete(options: AgentProfileDeleteRequest): Promise<boolean>;
}

export interface AgentProfileServiceOptions {
  client: AgentProfileClient;
  toolsService: ToolsServiceStart;
  logger: Logger;
  request: KibanaRequest;
}

export const createAgentProfileService = (
  options: AgentProfileServiceOptions
): AgentProfileService => {
  return new AgentProfileServiceImpl(options);
};

class AgentProfileServiceImpl implements AgentProfileService {
  private readonly client: AgentProfileClient;
  private readonly toolsService: ToolsServiceStart;
  private readonly logger: Logger;
  private readonly request: KibanaRequest;

  constructor({ client, toolsService, logger, request }: AgentProfileServiceOptions) {
    this.client = client;
    this.toolsService = toolsService;
    this.logger = logger;
    this.request = request;
  }

  async has(agentId: string): Promise<boolean> {
    return this.client.has(agentId);
  }

  async get(agentId: string): Promise<AgentProfile> {
    return this.client.get(agentId);
  }

  async create(profile: AgentProfileCreateRequest): Promise<AgentProfile> {
    this.logger.debug('Creating agent profile');
    await this.validateAgentToolSelection(profile.toolSelection);
    return this.client.create(profile);
  }

  async update(profile: AgentProfileUpdateRequest): Promise<AgentProfile> {
    this.logger.debug('Updating agent profile');
    if (profile.toolSelection) {
      await this.validateAgentToolSelection(profile.toolSelection);
    }
    return this.client.update(profile);
  }

  // Agent tool selection validation helper
  private async validateAgentToolSelection(
    toolSelection: AgentProfileCreateRequest['toolSelection']
  ) {
    const errors = await validateToolSelection({
      toolRegistry: this.toolsService.registry,
      request: this.request,
      toolSelection,
    });
    if (errors.length > 0) {
      throw createBadRequestError(
        `Agent tool selection validation failed:\n` + errors.map((e) => `- ${e}`).join('\n')
      );
    }
  }

  async list(options?: AgentProfileListOptions): Promise<AgentProfile[]> {
    return this.client.list(options);
  }

  async delete(options: AgentProfileDeleteRequest): Promise<boolean> {
    return this.client.delete(options);
  }
}
