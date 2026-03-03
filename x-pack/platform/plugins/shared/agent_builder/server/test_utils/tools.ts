/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import type {
  BuiltinToolDefinition,
  ExecutableTool,
  ExecutableToolHandlerFn,
  ToolHandlerFn,
  ToolProvider,
  InternalToolDefinition,
  ToolRegistry,
} from '@kbn/agent-builder-server';
import type { ToolsServiceStart } from '../services/tools/types';

export type ToolProviderMock = jest.Mocked<ToolProvider>;
export type ToolRegistryMock = jest.Mocked<ToolRegistry>;

export type ToolsServiceStartMock = jest.Mocked<ToolsServiceStart>;

export const createToolProviderMock = (): ToolProviderMock => {
  return {
    has: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
  };
};

export const createToolRegistryMock = (): ToolRegistryMock => {
  return {
    has: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    execute: jest.fn(),
  };
};

export const createToolsServiceStartMock = (): ToolsServiceStartMock => {
  return {
    getToolDefinitions: jest.fn().mockImplementation(() => []),
    getRegistry: jest.fn().mockImplementation(() => createToolRegistryMock()),
    getHealthClient: jest.fn(),
  };
};

export type MockedTool = Omit<InternalToolDefinition, 'getHandler' | 'getSchema'> & {
  getHandler: jest.MockedFunction<() => ToolHandlerFn>;
  getSchema: jest.MockedFunction<() => any>;
};

export type MockedExecutableTool = Omit<ExecutableTool, 'execute'> & {
  execute: jest.MockedFunction<ExecutableToolHandlerFn>;
};

export type MockedBuiltinTool = Omit<BuiltinToolDefinition, 'handler'> & {
  handler: jest.MockedFunction<ToolHandlerFn>;
};

export const createMockedBuiltinTool = (
  parts: Partial<MockedBuiltinTool> = {}
): MockedBuiltinTool => {
  return {
    id: 'test-tool',
    type: ToolType.builtin,
    description: 'test description',
    schema: z.object({}),
    tags: ['tag-1', 'tag-2'],
    handler: jest.fn(parts.handler),
    ...parts,
  };
};

export const createMockedTool = (parts: Partial<MockedTool> = {}): MockedTool => {
  return {
    id: 'test-tool',
    type: ToolType.builtin,
    description: 'test description',
    configuration: {},
    readonly: false,
    tags: ['tag-1', 'tag-2'],
    getSchema: jest.fn(async () => z.object({})),
    getHandler: jest.fn(parts.getHandler),
    isAvailable: jest.fn(),
    ...parts,
  };
};

export const createMockedExecutableTool = (
  parts: Partial<ExecutableTool> = {}
): MockedExecutableTool => {
  return {
    id: 'test-tool',
    type: ToolType.builtin,
    description: 'test description',
    readonly: false,
    getSchema: () => z.object({}),
    configuration: {},
    tags: ['tag-1', 'tag-2'],
    ...parts,
    execute: jest.fn(parts.execute),
  };
};
