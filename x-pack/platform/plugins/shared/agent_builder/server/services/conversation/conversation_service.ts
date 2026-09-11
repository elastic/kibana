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
import { v4 as uuidv4 } from 'uuid';
import {
  TimelineEventType,
  createInternalError,
  isEventsNativeVersion,
} from '@kbn/agent-builder-common';
import type { ConversationRoundAuthor, CurrentUser } from '@kbn/agent-builder-common';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import type { ExecutionConversationOrigin } from '@kbn/agent-builder-server/execution';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { getUserFromRequest } from '../utils';
import { getCurrentSpaceId } from '../../utils/spaces';
import type { AgentsServiceStart } from '../agents';
import type { AttachmentServiceStart } from '../attachments/types';
import type { ConversationClient } from './client';
import { createClient } from './client';
import { userMessageActor } from './client/rounds_to_events';
import type { ConversationWithPermissions } from '../../../common/http_api/conversations';
import type { ConversationEventBus } from '../../workflows/triggers/conversation_event_bus';

export interface AppendContextMessageOptions {
  request: KibanaRequest;
  conversationId: string;
  message?: string;
  attachments?: AttachmentInput[];
}

export interface ConversationService {
  getScopedClient(options: { request: KibanaRequest }): Promise<ConversationClient>;
  getConversationRoundAuthor(options: {
    request: KibanaRequest;
    origin?: ExecutionConversationOrigin;
  }): Promise<ConversationRoundAuthor | undefined>;
  appendContextMessage(options: AppendContextMessageOptions): Promise<ConversationWithPermissions>;
}

interface ConversationServiceDeps {
  logger: Logger;
  security: SecurityServiceStart;
  elasticsearch: ElasticsearchServiceStart;
  spaces?: SpacesPluginStart;
  agents: AgentsServiceStart;
  attachments: AttachmentServiceStart;
  eventBus?: ConversationEventBus;
}

export class ConversationServiceImpl implements ConversationService {
  private readonly logger: Logger;
  private readonly security: SecurityServiceStart;
  private readonly elasticsearch: ElasticsearchServiceStart;
  private readonly spaces?: SpacesPluginStart;
  private readonly agents: AgentsServiceStart;
  private readonly attachments: AttachmentServiceStart;
  private readonly eventBus?: ConversationEventBus;

  constructor({
    logger,
    security,
    elasticsearch,
    spaces,
    agents,
    attachments,
    eventBus,
  }: ConversationServiceDeps) {
    this.logger = logger;
    this.security = security;
    this.elasticsearch = elasticsearch;
    this.spaces = spaces;
    this.agents = agents;
    this.attachments = attachments;
    this.eventBus = eventBus;
  }

  async getScopedClient({ request }: { request: KibanaRequest }): Promise<ConversationClient> {
    const user = await this.getCurrentUser({ request });
    const esClient = this.getScopedEsClient(request).asInternalUser;
    const space = getCurrentSpaceId({ request, spaces: this.spaces });
    const agentRegistry = await this.agents.getRegistry({ request });
    const eventBus = this.eventBus;

    return createClient({
      user,
      esClient,
      logger: this.logger,
      space,
      agentRegistry,
      onMetadataPatched: eventBus
        ? (payload) => eventBus.emitMetadataPatched(request, payload)
        : undefined,
    });
  }

  async appendContextMessage({
    request,
    conversationId,
    message = '',
    attachments = [],
  }: AppendContextMessageOptions): Promise<ConversationWithPermissions> {
    const client = await this.getScopedClient({ request });
    const conversation = await client.get(conversationId);

    if (!isEventsNativeVersion(conversation.schema_version)) {
      throw createInternalError('Standalone messages require canonical event storage');
    }

    const snapshot = conversation.attachments ?? [];
    const stateManager = this.attachments.createStateManager(snapshot);

    await this.attachments.mergeInputs({
      stateManager,
      inputs: attachments,
      request,
      actor: ATTACHMENT_REF_ACTOR.user,
    });

    const user = await this.getCurrentUser({ request });
    const author = await this.getConversationRoundAuthor({ request });

    await client.appendEvents({
      id: conversationId,
      events: [
        {
          id: uuidv4(),
          type: TimelineEventType.userMessage,
          created_at: new Date().toISOString(),
          actor: userMessageActor({ user }, { author }),
          data: { message, attachment_refs: stateManager.getAccessedRefs() },
        },
      ],
      attachments: { snapshot, produced: stateManager.getAll() },
    });

    return client.get(conversationId);
  }

  /**
   * Returns the author of a conversation round: the origin's own author if it provides one,
   * otherwise the authenticated Kibana user's profile id. Every round is attributed, whatever the
   * conversation's access mode, since authorship cannot be reconstructed once a conversation is
   * shared. No author is assigned when the user has no profile id (e.g. some API key callers) —
   * the username is not a stable identifier and must not be stored as one.
   */
  async getConversationRoundAuthor({
    request,
    origin,
  }: {
    request: KibanaRequest;
    origin?: ExecutionConversationOrigin;
  }): Promise<ConversationRoundAuthor | undefined> {
    if (origin?.author) {
      return origin.author;
    }

    const user = await this.getCurrentUser({ request });

    if (user.id === undefined) {
      return undefined;
    }

    return { id: user.id, username: user.username };
  }

  private async getCurrentUser({ request }: { request: KibanaRequest }): Promise<CurrentUser> {
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
