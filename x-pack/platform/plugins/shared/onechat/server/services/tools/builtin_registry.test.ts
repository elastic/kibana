/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { RegisteredTool } from '@kbn/onechat-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { BuiltinToolRegistry, createBuiltinToolRegistry } from './builtin_registry';

describe('BuiltinToolRegistry', () => {
  let registry: BuiltinToolRegistry;
  let mockRequest: KibanaRequest;

  beforeEach(() => {
    registry = createBuiltinToolRegistry();
    mockRequest = httpServerMock.createKibanaRequest();
  });

  describe('register', () => {
    it('should register a tool', async () => {
      const mockTool: RegisteredTool = {
        id: 'test-tool',
        description: 'A test tool',
        schema: z.object({}),
        handler: async () => 'test',
      };

      registry.register(mockTool);
      await expect(registry.list({ request: mockRequest })).resolves.toEqual([mockTool]);
    });
  });

  describe('has', () => {
    it('should return true when tool exists', async () => {
      const mockTool: RegisteredTool = {
        id: 'test-tool',
        description: 'A test tool',
        schema: z.object({}),
        handler: async () => 'test',
      };

      registry.register(mockTool);
      const exists = await registry.has({ toolId: 'test-tool', request: mockRequest });
      expect(exists).toBe(true);
    });

    it('should return false when tool does not exist', async () => {
      const mockTool: RegisteredTool = {
        id: 'test-tool',
        description: 'A test tool',
        schema: z.object({}),
        handler: async () => 'test',
      };

      registry.register(mockTool);
      const exists = await registry.has({ toolId: 'non-existent-tool', request: mockRequest });
      expect(exists).toBe(false);
    });
  });

  describe('get', () => {
    it('should return the tool when it exists', async () => {
      const mockTool: RegisteredTool = {
        id: 'test-tool',
        description: 'A test tool',
        schema: z.object({}),
        handler: async () => 'test',
      };

      registry.register(mockTool);
      const tool = await registry.get({ toolId: 'test-tool', request: mockRequest });
      expect(tool).toEqual(mockTool);
    });

    it('should throw an error when tool does not exist', async () => {
      const mockTool: RegisteredTool = {
        id: 'test-tool',
        description: 'A test tool',
        schema: z.object({}),
        handler: async () => 'test',
      };

      registry.register(mockTool);
      await expect(
        registry.get({ toolId: 'non-existent-tool', request: mockRequest })
      ).rejects.toThrow(/not found/);
    });
  });

  describe('list', () => {
    it('should return all registered tools', async () => {
      const mockTool1: RegisteredTool = {
        id: 'test-tool-1',
        description: 'A test tool',
        schema: z.object({}),
        handler: async () => 'test1',
      };

      const mockTool2: RegisteredTool = {
        id: 'test-tool-2',
        description: 'Another test tool',
        schema: z.object({}),
        handler: async () => 'test2',
      };

      registry.register(mockTool1);
      registry.register(mockTool2);

      const tools = await registry.list({ request: mockRequest });
      expect(tools).toEqual([mockTool1, mockTool2]);
    });

    it('should return empty array when no tools are registered', async () => {
      const tools = await registry.list({ request: mockRequest });
      expect(tools).toEqual([]);
    });
  });
});
