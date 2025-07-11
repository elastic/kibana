/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { KibanaRequest } from '@kbn/core-http-server';
import { ToolDescriptor, ToolType } from '@kbn/onechat-common';
import type { ExecutableTool, ExecutableToolHandlerFn, ToolProvider } from '@kbn/onechat-server';
import type { ToolsServiceStart } from '../services/tools/types';
import type { ToolRegistry } from '../services/tools/tool_registry';

export type ToolProviderMock = jest.Mocked<ToolProvider>;
export type ToolRegistryMock = jest.Mocked<ToolRegistry>;

export type ToolsServiceStartMock = ToolsServiceStart & {
  getRegistry(opts: { request: KibanaRequest }): Promise<ToolRegistryMock>;
};

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
    getRegistry: jest.fn().mockImplementation(() => createToolRegistryMock()),
  };
};

export type MockedTool = ToolDescriptor;

export type MockedExecutableTool = Omit<ExecutableTool, 'execute'> & {
  execute: jest.MockedFunction<ExecutableToolHandlerFn>;
};

export const createMockedTool = (parts: Partial<MockedTool> = {}): MockedTool => {
  return {
    id: 'test-tool',
    type: ToolType.builtin,
    description: 'test description',
    configuration: {},
    tags: ['tag-1', 'tag-2'],
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
    schema: z.object({}),
    configuration: {},
    tags: ['tag-1', 'tag-2'],
    ...parts,
    execute: jest.fn(parts.execute),
  };
};
