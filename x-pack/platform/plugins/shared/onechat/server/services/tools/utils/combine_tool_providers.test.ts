/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { ToolProviderId } from '@kbn/onechat-common';
import type { RegisteredTool } from '@kbn/onechat-server';
import { RegisteredToolProviderWithId, RegisteredToolWithMeta } from '../types';
import { combineToolProviders } from './combine_tool_providers';

describe('combineToolProviders', () => {
  let mockRequest: KibanaRequest;

  beforeEach(() => {
    mockRequest = httpServerMock.createKibanaRequest();
  });

  const createMockTool = (id: string): RegisteredTool => ({
    id,
    description: `Description for tool ${id}`,
    schema: z.object({}),
    handler: jest.fn(),
  });

  const createMockProvider = (
    tools: RegisteredTool[],
    providerId: string
  ): RegisteredToolProviderWithId => ({
    id: providerId,
    has: jest.fn().mockImplementation(async ({ toolId }) => {
      return tools.some((t) => t.id === toolId);
    }),
    get: jest.fn().mockImplementation(async ({ toolId }) => {
      const tool = tools.find((t) => t.id === toolId);
      if (!tool) {
        throw new Error(`Tool ${toolId} not found`);
      }
      return tool;
    }),
    list: jest.fn().mockResolvedValue(tools),
  });

  const addMeta = (tool: RegisteredTool, providerId: ToolProviderId): RegisteredToolWithMeta => {
    return {
      ...tool,
      meta: {
        ...tool.meta,
        tags: tool.meta?.tags ?? [],
        providerId,
      },
    };
  };

  it('should return a tool from the first provider that has it', async () => {
    const tool1 = createMockTool('tool1');
    const tool2 = createMockTool('tool2');
    const provider1 = createMockProvider([tool1], 'provider1');
    const provider2 = createMockProvider([tool2], 'provider2');

    const combined = combineToolProviders(provider1, provider2);
    const result = await combined.get({ toolId: 'tool1', request: mockRequest });

    expect(result).toEqual(addMeta(tool1, 'provider1'));
    expect(provider1.get).toHaveBeenCalledWith({ toolId: 'tool1', request: mockRequest });
    expect(provider2.get).not.toHaveBeenCalled();
  });

  it('should throw an error if no provider has the requested tool', async () => {
    const provider1 = createMockProvider([], 'provider1');
    const provider2 = createMockProvider([], 'provider2');

    const combined = combineToolProviders(provider1, provider2);

    await expect(combined.get({ toolId: 'nonexistent', request: mockRequest })).rejects.toThrow(
      'Tool with id nonexistent not found'
    );
  });

  it('should combine tools from all providers', async () => {
    const tool1 = createMockTool('tool1');
    const tool2 = createMockTool('tool2');
    const tool3 = createMockTool('tool3');
    const provider1 = createMockProvider([tool1, tool2], 'provider1');
    const provider2 = createMockProvider([tool2, tool3], 'provider2'); // tool2 is duplicated

    const combined = combineToolProviders(provider1, provider2);
    const result = await combined.list({ request: mockRequest });

    expect(result).toHaveLength(4);
    expect(result).toContainEqual(addMeta(tool1, 'provider1'));
    expect(result).toContainEqual(addMeta(tool2, 'provider1'));
    expect(result).toContainEqual(addMeta(tool2, 'provider2'));
    expect(result).toContainEqual(addMeta(tool3, 'provider2'));
  });

  it('should handle empty providers', async () => {
    const combined = combineToolProviders();
    const result = await combined.list({ request: mockRequest });
    expect(result).toHaveLength(0);
  });

  it('should handle providers with no tools', async () => {
    const provider1 = createMockProvider([], 'provider1');
    const provider2 = createMockProvider([], 'provider2');
    const combined = combineToolProviders(provider1, provider2);
    const result = await combined.list({ request: mockRequest });
    expect(result).toHaveLength(0);
  });

  it('should preserve tool order from providers', async () => {
    const tool1 = createMockTool('tool1');
    const tool2 = createMockTool('tool2');
    const tool3 = createMockTool('tool3');
    const provider1 = createMockProvider([tool1, tool2], 'provider1');
    const provider2 = createMockProvider([tool3], 'provider2');

    const combined = combineToolProviders(provider1, provider2);
    const result = await combined.list({ request: mockRequest });

    expect(result).toEqual([
      addMeta(tool1, 'provider1'),
      addMeta(tool2, 'provider1'),
      addMeta(tool3, 'provider2'),
    ]);
  });
});
