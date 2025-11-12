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
import type { KibanaRequest } from '@kbn/core-http-server';
import type { WritableToolResultStore } from '@kbn/onechat-server';
import type { CheckpointerService } from '@kbn/langgraph-checkpoint-saver';
import type { AttachmentServiceStart } from '../services/attachments';
import type { CreateScopedRunnerDeps } from '../services/runner/runner';
import type { ModelProviderFactoryMock } from './model_provider';
import { createModelProviderFactoryMock } from './model_provider';
import type { ToolsServiceStartMock } from './tools';
import { createToolsServiceStartMock } from './tools';
import type { AgentsServiceStartMock } from './agents';
import { createAgentsServiceStartMock } from './agents';

export type ToolResultStoreMock = jest.Mocked<WritableToolResultStore>;
export type AttachmentsServiceMock = jest.Mocked<AttachmentServiceStart>;
export type CheckpointerServiceMock = jest.Mocked<CheckpointerService>;

export const createToolResultStoreMock = (): ToolResultStoreMock => {
  return {
    has: jest.fn(),
    get: jest.fn(),
    add: jest.fn(),
    delete: jest.fn(),
    asReadonly: jest.fn(),
  };
};

export const createAttachmentsServiceMock = (): AttachmentsServiceMock => {
  return {
    validate: jest.fn(),
    format: jest.fn(),
  };
};

export const createCheckpointerServiceMock = (): CheckpointerServiceMock => {
  return {
    getCheckpointer: jest.fn(),
  };
};

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
    resultStore: createToolResultStoreMock(),
    attachmentsService: createAttachmentsServiceMock(),
    checkpointerService: createCheckpointerServiceMock(),
  };
};
