/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { AgentParams } from '@kbn/onechat-server/agents/provider';
import { taskTypes } from './task_definitions';
import { createAgentExecutionRepository, createExecutionEventRepository } from './persistence';
import type { AgentExecution } from './types';

export class AgentExecutor {
  private readonly taskManager: TaskManagerStartContract;
  private readonly elasticsearch: ElasticsearchServiceStart;
  private readonly logger: Logger;

  constructor({
    taskManager,
    elasticsearch,
    logger,
  }: {
    taskManager: TaskManagerStartContract;
    elasticsearch: ElasticsearchServiceStart;
    logger: Logger;
  }) {
    this.taskManager = taskManager;
    this.elasticsearch = elasticsearch;
    this.logger = logger;
  }

  executeAgent = async ({
    request,
    agentId,
    conversationId,
    agentParams,
    defaultConnectorId,
  }: {
    agentId: string;
    conversationId?: string;
    request: KibanaRequest;
    agentParams: AgentParams;
    defaultConnectorId?: string;
  }) => {
    // TODO: get space from request
    const spaceId = 'default';

    const executionRepository = createAgentExecutionRepository({
      logger: this.logger,
      esClient: this.elasticsearch.client.asInternalUser,
    });

    const executionInstance: AgentExecution = {
      executionId: uuidv4(),
      agentId,
      conversationId,
      spaceId,
      agentParams,
      defaultConnectorId,
    };

    await executionRepository.create(executionInstance);

    await scheduleExecution({
      executionId: executionInstance.executionId,
      request,
      taskManager: this.taskManager,
    });

    const eventRepository = createExecutionEventRepository({
      logger: this.logger,
      esClient: this.elasticsearch.client.asInternalUser,
    });

    // TODO: follow events
  };
}

export const scheduleExecution = async ({
  executionId,
  request,
  taskManager,
}: {
  executionId: string;
  request: KibanaRequest;
  taskManager: TaskManagerStartContract;
}) => {
  await taskManager.schedule(
    {
      id: `agent-${executionId}`,
      taskType: taskTypes.runAgent,
      params: {
        executionId,
      },
      scope: ['agent-builder'],
      enabled: true,
      state: {},
    },
    { request }
  );
};

