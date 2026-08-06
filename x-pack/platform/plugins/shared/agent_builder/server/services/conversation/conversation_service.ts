/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KibanaRequest,
  Logger,
  SecurityServiceStart,
  ElasticsearchServiceStart,
} from '@kbn/core/server';
import type { ConversationRoundAuthor } from '@kbn/agent-builder-common';
import type { ExecutionConversationOrigin } from '@kbn/agent-builder-server/execution';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { getUserFromRequest } from '../utils';
import { getCurrentSpaceId } from '../../utils/spaces';
import type { AgentsServiceStart } from '../agents';
import type { ConversationClient } from './client';
import { createClient } from './client';

export interface ConversationService {
  getScopedClient(options: { request: KibanaRequest }): Promise<ConversationClient>;
  getConversationRoundAuthor(options: {
    request: KibanaRequest;
    origin?: ExecutionConversationOrigin;
  }): Promise<ConversationRoundAuthor>;
}

interface ConversationServiceDeps {
  logger: Logger;
  security: SecurityServiceStart;
  elasticsearch: ElasticsearchServiceStart;
  spaces?: SpacesPluginStart;
  agents: AgentsServiceStart;
}

export class ConversationServiceImpl implements ConversationService {
  private readonly logger: Logger;
  private readonly security: SecurityServiceStart;
  private readonly elasticsearch: ElasticsearchServiceStart;
  private readonly spaces?: SpacesPluginStart;
  private readonly agents: AgentsServiceStart;

  constructor({ logger, security, elasticsearch, spaces, agents }: ConversationServiceDeps) {
    this.logger = logger;
    this.security = security;
    this.elasticsearch = elasticsearch;
    this.spaces = spaces;
    this.agents = agents;
  }

  async getScopedClient({ request }: { request: KibanaRequest }): Promise<ConversationClient> {
    const user = await this.getCurrentUser({ request });
    const esClient = this.getScopedEsClient(request).asInternalUser;
    const space = getCurrentSpaceId({ request, spaces: this.spaces });
    const agentRegistry = await this.agents.getRegistry({ request });

    return createClient({ user, esClient, logger: this.logger, space, agentRegistry });
  }

  /**
   * Returns the author of a conversation round.
   * Every round is attributed, whatever the conversation's access mode: authorship is recorded when
   * the round is written and cannot be reconstructed later, so a conversation that starts private
   * and is shared afterwards would otherwise lose the authorship of everything said before sharing.
   * External origins (e.g. Slack) provide their own author and take precedence; otherwise the author
   * is the authenticated Kibana user that initiated the round, including rounds from an external
   * origin that omits `author`.
   */
  async getConversationRoundAuthor({
    request,
    origin,
  }: {
    request: KibanaRequest;
    origin?: ExecutionConversationOrigin;
  }): Promise<ConversationRoundAuthor> {
    if (origin?.author) {
      return origin.author;
    }

    const user = await this.getCurrentUser({ request });

    return { id: user.id ?? user.username, username: user.username };
  }

  private async getCurrentUser({ request }: { request: KibanaRequest }) {
    return getUserFromRequest({
      request,
      security: this.security,
      esClient: this.getScopedEsClient(request).asCurrentUser,
    });
  }

  private getScopedEsClient(request: KibanaRequest) {
    return this.elasticsearch.client.asScoped(request);
  }
}
