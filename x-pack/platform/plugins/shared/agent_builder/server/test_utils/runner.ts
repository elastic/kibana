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
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  WritableToolResultStore,
  AgentHandlerContext,
  ScopedRunner,
  ToolProvider,
} from '@kbn/agent-builder-server';
import type { AttachmentsService } from '@kbn/agent-builder-server/runner/attachments_service';
import type { ConversationStateManager, PromptManager } from '@kbn/agent-builder-server/runner';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
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
export type AttachmentStateManagerMock = jest.Mocked<AttachmentStateManager>;
export type PromptManagerMock = jest.Mocked<PromptManager>;
export type StateManagerMock = jest.Mocked<ConversationStateManager>;

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

export const createPromptManagerMock = (): PromptManagerMock => {
  return {
    set: jest.fn(),
    get: jest.fn(),
    dump: jest.fn(),
    getConfirmationStatus: jest.fn(),
    clear: jest.fn(),
    forTool: jest.fn(),
  };
};

export const createStateManagerMock = (): StateManagerMock => {
  return {
    getToolStateManager: jest.fn(),
  };
};

export const createAttachmentStateManagerMock = (): AttachmentStateManagerMock => {
  return {
    get: jest.fn(),
    getLatest: jest.fn(),
    getVersion: jest.fn(),
    getActive: jest.fn(),
    getAll: jest.fn(),
    getDiff: jest.fn(),
    add: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    restore: jest.fn(),
    permanentDelete: jest.fn(),
    rename: jest.fn(),
    resolveRefs: jest.fn(),
    getTotalTokenEstimate: jest.fn(),
    hasChanges: jest.fn(),
    markClean: jest.fn(),
  };
};

export interface CreateScopedRunnerDepsMock extends CreateScopedRunnerDeps {
  elasticsearch: ReturnType<typeof elasticsearchServiceMock.createStart>;
  security: ReturnType<typeof securityServiceMock.createStart>;
  modelProvider: ModelProviderMock;
  toolsService: ToolsServiceStartMock;
  agentsService: AgentsServiceStartMock;
  promptManager: PromptManagerMock;
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
    attachmentStateManager: createAttachmentStateManagerMock(),
    events: {
      emit: jest.fn(),
    },
    logger: loggerMock.create(),
    promptManager: createPromptManagerMock(),
    stateManager: createStateManagerMock(),
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
    actions: actionsMock.createStart(),
    modelProvider: createModelProviderMock(),
    toolsService: createToolsServiceStartMock(),
    agentsService: createAgentsServiceStartMock(),
    logger: loggerMock.create(),
    request: httpServerMock.createKibanaRequest(),
    resultStore: createToolResultStoreMock(),
    attachmentStateManager: createAttachmentStateManagerMock(),
    attachmentsService: createAttachmentsServiceStartMock(),
    promptManager: createPromptManagerMock(),
    stateManager: createStateManagerMock(),
  };
};

export const createRunnerDepsMock = (): CreateRunnerDepsMock => {
  return {
    elasticsearch: elasticsearchServiceMock.createStart(),
    security: securityServiceMock.createStart(),
    spaces: spacesMock.createStart(),
    actions: actionsMock.createStart(),
    modelProviderFactory: createModelProviderFactoryMock(),
    toolsService: createToolsServiceStartMock(),
    agentsService: createAgentsServiceStartMock(),
    logger: loggerMock.create(),
    attachmentsService: createAttachmentsServiceStartMock(),
  };
};
