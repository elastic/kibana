/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { AlertingServerStart } from '@kbn/alerting-plugin/server';
import type { SessionsStart, SessionClient } from '@kbn/agent-builder-server';
import type { AgentExecutionService } from '@kbn/agent-builder-server/execution';
import type { ConversationService } from '../conversation';
import { getCurrentSpaceId } from '../../utils/spaces';
import { SessionClientImpl } from './session_client';

export interface SessionServiceDeps {
  logger: Logger;
  esClient: ElasticsearchClient;
  taskManager: TaskManagerStartContract;
  security: SecurityServiceStart;
  spaces?: SpacesPluginStart;
  conversationService: ConversationService;
  getExecutionService: () => AgentExecutionService;
  getActionsStart: () => ActionsPluginStart;
  getAlertingStart: (() => AlertingServerStart) | undefined;
}

export class SessionServiceImpl implements SessionsStart {
  private readonly deps: SessionServiceDeps;

  constructor(deps: SessionServiceDeps) {
    this.deps = deps;
  }

  getScopedClient({ request }: { request: KibanaRequest }): SessionClient {
    const {
      logger,
      esClient,
      taskManager,
      security,
      spaces,
      conversationService,
      getExecutionService,
      getActionsStart,
      getAlertingStart,
    } = this.deps;
    const space = getCurrentSpaceId({ request, spaces });

    return new SessionClientImpl({
      esClient,
      taskManager,
      logger,
      request,
      space,
      security,
      conversationService,
      getExecutionService,
      getActionsStart,
      getAlertingStart,
    });
  }
}
