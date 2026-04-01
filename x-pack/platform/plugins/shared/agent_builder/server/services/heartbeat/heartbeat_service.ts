/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchServiceStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { getCurrentSpaceId } from '../../utils/spaces';
import type { ConversationService } from '../conversation';
import { createClient, type HeartbeatClient } from './client';

export interface HeartbeatServiceStart {
  /**
   * Returns a heartbeat client scoped to the current request (space + user credentials).
   * Use this in route handlers.
   */
  getScopedClient(options: { request: KibanaRequest }): HeartbeatClient;
}

interface HeartbeatServiceDeps {
  logger: Logger;
  elasticsearch: ElasticsearchServiceStart;
  conversationService: ConversationService;
  taskManager: TaskManagerStartContract;
  spaces?: SpacesPluginStart;
}

export class HeartbeatService {
  private readonly logger: Logger;
  private readonly elasticsearch: ElasticsearchServiceStart;
  private readonly conversationService: ConversationService;
  private readonly taskManager: TaskManagerStartContract;
  private readonly spaces?: SpacesPluginStart;

  constructor({ logger, elasticsearch, conversationService, taskManager, spaces }: HeartbeatServiceDeps) {
    this.logger = logger;
    this.elasticsearch = elasticsearch;
    this.conversationService = conversationService;
    this.taskManager = taskManager;
    this.spaces = spaces;
  }

  getScopedClient({ request }: { request: KibanaRequest }): HeartbeatClient {
    const space = getCurrentSpaceId({ request, spaces: this.spaces });
    const esClient = this.elasticsearch.client.asInternalUser;

    return createClient({
      space,
      request,
      esClient,
      conversationService: this.conversationService,
      taskManager: this.taskManager,
      logger: this.logger,
    });
  }
}
