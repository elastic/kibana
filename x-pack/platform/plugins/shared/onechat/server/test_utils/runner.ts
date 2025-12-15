/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  elasticsearchServiceMock,
  httpServerMock,
  securityServiceMock,
} from '@kbn/core/server/mocks';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';
import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  WritableToolResultStore,
  AgentHandlerContext,
  ScopedRunner,
  ToolProvider,
} from '@kbn/onechat-server';
import type { AttachmentsService } from '@kbn/onechat-server/runner/attachments_service';
import type { AttachmentServiceStart } from '../services/attachments';
import type { CreateScopedRunnerDeps, CreateRunnerDeps } from '../services/runner/runner';
import type { ModelProviderMock, ModelProviderFactoryMock } from './model_provider';
import { createModelProviderMock, createModelProviderFactoryMock } from './model_provider';
import type { ToolsServiceStartMock } from './tools';
import { createToolsServiceStartMock } from './tools';
import type { AgentsServiceStartMock } from './agents';
import { createAgentsServiceStartMock } from './agents';

export type ToolResultStoreMock = jest.Mocked<WritableToolResultStore>;
export type AttachmentsServiceStartMock = jest.Mocked<AttachmentServiceStart>;
export type ToolProviderMock = jest.Mocked<ToolProvider>;
export type AttachmentsServiceMock = jest.Mocked<AttachmentsService>;

export const createToolProviderMock = (): ToolProviderMock => {
  return {
    has: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
  };
};

export const createToolResultStoreMock = (): ToolResultStoreMock => {
  return {
    has: jest.fn(),
    get: jest.fn(),
    add: jest.fn(),
    delete: jest.fn(),
    asReadonly: jest.fn(),
  };
};

export const createAttachmentsServiceStartMock = (): AttachmentsServiceStartMock => {
  return {
    validate: jest.fn(),
    getTypeDefinition: jest.fn(),
  };
};

export const createAttachmentsService = (): AttachmentsServiceMock => {
  return {
    getTypeDefinition: jest.fn(),
    convertAttachmentTool: jest.fn(),
  };
};

export interface CreateScopedRunnerDepsMock extends CreateScopedRunnerDeps {
  elasticsearch: ReturnType<typeof elasticsearchServiceMock.createStart>;
  security: ReturnType<typeof securityServiceMock.createStart>;
  modelProvider: ModelProviderMock;
  toolsService: ToolsServiceStartMock;
  agentsService: AgentsServiceStartMock;
  logger: MockedLogger;
  request: KibanaRequest;
}

export interface CreateRunnerDepsMock extends CreateRunnerDeps {
  elasticsearch: ReturnType<typeof elasticsearchServiceMock.createStart>;
  security: ReturnType<typeof securityServiceMock.createStart>;
  modelProviderFactory: ModelProviderFactoryMock;
  toolsService: ToolsServiceStartMock;
  agentsService: AgentsServiceStartMock;
  logger: MockedLogger;
}

export interface AgentHandlerContextMock extends AgentHandlerContext {
  toolProvider: ToolProviderMock;
  resultStore: ToolResultStoreMock;
  attachments: AttachmentsServiceMock;
}

export const createAgentHandlerContextMock = (): AgentHandlerContextMock => {
  return {
    request: httpServerMock.createKibanaRequest(),
    spaceId: 'default',
    esClient: elasticsearchServiceMock.createScopedClusterClient(),
    modelProvider: createModelProviderMock(),
    toolProvider: createToolProviderMock(),
    runner: createScopedRunnerMock(),
    attachments: createAttachmentsService(),
    resultStore: createToolResultStoreMock(),
    events: {
      emit: jest.fn(),
    },
    logger: loggerMock.create(),
  };
};

export const createScopedRunnerMock = (): jest.Mocked<ScopedRunner> => {
  return {
    runTool: jest.fn(),
    runInternalTool: jest.fn(),
    runAgent: jest.fn(),
  };
};

export const createScopedRunnerDepsMock = (): CreateScopedRunnerDepsMock => {
  return {
    elasticsearch: elasticsearchServiceMock.createStart(),
    security: securityServiceMock.createStart(),
    spaces: spacesMock.createStart(),
    modelProvider: createModelProviderMock(),
    toolsService: createToolsServiceStartMock(),
    agentsService: createAgentsServiceStartMock(),
    logger: loggerMock.create(),
    request: httpServerMock.createKibanaRequest(),
    resultStore: createToolResultStoreMock(),
    attachmentsService: createAttachmentsServiceStartMock(),
  };
};

export const createRunnerDepsMock = (): CreateRunnerDepsMock => {
  return {
    elasticsearch: elasticsearchServiceMock.createStart(),
    security: securityServiceMock.createStart(),
    spaces: spacesMock.createStart(),
    modelProviderFactory: createModelProviderFactoryMock(),
    toolsService: createToolsServiceStartMock(),
    agentsService: createAgentsServiceStartMock(),
    logger: loggerMock.create(),
    attachmentsService: createAttachmentsServiceStartMock(),
  };
};
