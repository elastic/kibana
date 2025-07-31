/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, MockedLogger } from '@kbn/logging-mocks';
import {
  elasticsearchServiceMock,
  httpServerMock,
  securityServiceMock,
} from '@kbn/core/server/mocks';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { CreateScopedRunnerDeps } from '../services/runner/runner';
import { ModelProviderFactoryMock, createModelProviderFactoryMock } from './model_provider';
import { ToolsServiceStartMock, createToolsServiceStartMock } from './tools';
import { AgentsServiceStartMock, createAgentsServiceStartMock } from './agents';

export interface CreateScopedRunnerDepsMock extends CreateScopedRunnerDeps {
  elasticsearch: ReturnType<typeof elasticsearchServiceMock.createStart>;
  security: ReturnType<typeof securityServiceMock.createStart>;
  modelProviderFactory: ModelProviderFactoryMock;
  toolsService: ToolsServiceStartMock;
  agentsService: AgentsServiceStartMock;
  logger: MockedLogger;
  request: KibanaRequest;
}

export const createScopedRunnerDepsMock = (): CreateScopedRunnerDepsMock => {
  return {
    elasticsearch: elasticsearchServiceMock.createStart(),
    security: securityServiceMock.createStart(),
    modelProviderFactory: createModelProviderFactoryMock(),
    toolsService: createToolsServiceStartMock(),
    agentsService: createAgentsServiceStartMock(),
    logger: loggerMock.create(),
    request: httpServerMock.createKibanaRequest(),
  };
};
