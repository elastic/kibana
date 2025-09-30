/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import type {
  ExecutableTool,
  ExecutableToolHandlerFn,
  BuiltinToolDefinition,
  ToolProvider,
  ToolHandlerFn,
} from '@kbn/onechat-server';
import type { ToolsServiceStart } from '../services/tools/types';
import type { ToolRegistry } from '../services/tools/tool_registry';
import type { InternalToolDefinition } from '../services/tools/tool_provider';

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
    getToolTypeInfo: jest.fn(),
    getRegistry: jest.fn().mockImplementation(() => createToolRegistryMock()),
  };
};

export type MockedTool = Omit<InternalToolDefinition, 'handler'> & {
  handler: jest.MockedFunction<ToolHandlerFn>;
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
    schema: z.object({}),
    tags: ['tag-1', 'tag-2'],
    handler: jest.fn(parts.handler),
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
    schema: () => z.object({}),
    configuration: {},
    tags: ['tag-1', 'tag-2'],
    ...parts,
    execute: jest.fn(parts.execute),
  };
};
