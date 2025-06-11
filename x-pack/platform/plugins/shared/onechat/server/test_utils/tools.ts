/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { builtinToolProviderId } from '@kbn/onechat-common';
import type {
  ToolProvider,
  ToolHandlerFn,
  ExecutableTool,
  ExecutableToolHandlerFn,
} from '@kbn/onechat-server';
import type {
  ToolsServiceStart,
  InternalToolRegistry,
  ScopedPublicToolRegistry,
  ScopedPublicToolRegistryFactoryFn,
  RegisteredToolWithMeta,
} from '../services/tools/types';
import { ChangeReturnType } from './common';

export type ToolProviderMock = jest.Mocked<ToolProvider>;
export type ScopedPublicToolRegistryMock = jest.Mocked<ScopedPublicToolRegistry>;
export type ScopedPublicToolRegistryFactoryFnMock = jest.MockedFn<
  ChangeReturnType<ScopedPublicToolRegistryFactoryFn, ScopedPublicToolRegistryMock>
>;
export type InternalToolRegistryMock = jest.Mocked<InternalToolRegistry>;

export type ToolsServiceStartMock = ToolsServiceStart & {
  registry: InternalToolRegistryMock;
};

export const createToolProviderMock = (): ToolProviderMock => {
  return {
    has: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
  };
};

export const createInternalToolRegistryMock = (): InternalToolRegistryMock => {
  return {
    has: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
    asPublicRegistry: jest.fn().mockImplementation(() => createToolProviderMock()),
    asScopedPublicRegistry: jest
      .fn()
      .mockImplementation(() => createScopedPublicToolRegistryMock()),
  };
};

export const createScopedPublicToolRegistryMock = (): ScopedPublicToolRegistryMock => {
  return {
    has: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
  };
};

export const createToolsServiceStartMock = (): ToolsServiceStartMock => {
  return {
    registry: createInternalToolRegistryMock(),
  };
};

export type MockedTool = Omit<RegisteredToolWithMeta, 'handler'> & {
  handler: jest.MockedFunction<ToolHandlerFn>;
};

export type MockedExecutableTool = Omit<ExecutableTool, 'execute'> & {
  execute: jest.MockedFunction<ExecutableToolHandlerFn>;
};

export const createMockedTool = (parts: Partial<RegisteredToolWithMeta> = {}): MockedTool => {
  return {
    id: 'test-tool',
    description: 'test description',
    schema: z.object({}),
    meta: {
      providerId: builtinToolProviderId,
      tags: ['tag-1', 'tag-2'],
    },
    ...parts,
    handler: jest.fn(parts.handler),
  };
};

export const createMockedExecutableTool = (
  parts: Partial<ExecutableTool> = {}
): MockedExecutableTool => {
  return {
    id: 'test-tool',
    description: 'test description',
    schema: z.object({}),
    meta: {
      providerId: builtinToolProviderId,
      tags: ['tag-1', 'tag-2'],
    },
    ...parts,
    execute: jest.fn(parts.execute),
  };
};
