/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Tool } from '@kbn/onechat-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { BuiltinToolRegistry } from './builtin_registry';

describe('BuiltinToolRegistry', () => {
  let registry: BuiltinToolRegistry;
  let mockRequest: KibanaRequest;

  beforeEach(() => {
    registry = new BuiltinToolRegistry();
    mockRequest = httpServerMock.createKibanaRequest();
  });

  describe('register', () => {
    it('should register a direct tool', async () => {
      const mockTool: Tool = {
        id: 'test-tool',
        name: 'Test Tool',
        description: 'A test tool',
        schema: {},
        handler: async () => 'test',
      };

      registry.register(mockTool);
      await expect(registry.list({ request: mockRequest })).resolves.toEqual([mockTool]);
    });

    it('should register a tool registration function', async () => {
      const mockTool: Tool = {
        id: 'test-tool',
        name: 'Test Tool',
        description: 'A test tool',
        schema: {},
        handler: async () => 'test',
      };

      const registrationFn = () => Promise.resolve([mockTool]);
      registry.register(registrationFn);

      const tools = await registry.list({ request: mockRequest });
      expect(tools).toEqual([mockTool]);
    });
  });

  describe('has', () => {
    it('should return true when tool exists', async () => {
      const mockTool: Tool = {
        id: 'test-tool',
        name: 'Test Tool',
        description: 'A test tool',
        schema: {},
        handler: async () => 'test',
      };

      registry.register(mockTool);
      const exists = await registry.has({ toolId: 'test-tool', request: mockRequest });
      expect(exists).toBe(true);
    });

    it('should return false when tool does not exist', async () => {
      const mockTool: Tool = {
        id: 'test-tool',
        name: 'Test Tool',
        description: 'A test tool',
        schema: {},
        handler: async () => 'test',
      };

      registry.register(mockTool);
      const exists = await registry.has({ toolId: 'non-existent-tool', request: mockRequest });
      expect(exists).toBe(false);
    });
  });

  describe('get', () => {
    it('should return the tool when it exists', async () => {
      const mockTool: Tool = {
        id: 'test-tool',
        name: 'Test Tool',
        description: 'A test tool',
        schema: {},
        handler: async () => 'test',
      };

      registry.register(mockTool);
      const tool = await registry.get({ toolId: 'test-tool', request: mockRequest });
      expect(tool).toEqual(mockTool);
    });

    it('should throw an error when tool does not exist', async () => {
      const mockTool: Tool = {
        id: 'test-tool',
        name: 'Test Tool',
        description: 'A test tool',
        schema: {},
        handler: async () => 'test',
      };

      registry.register(mockTool);
      await expect(
        registry.get({ toolId: 'non-existent-tool', request: mockRequest })
      ).rejects.toThrow('Method not implemented.');
    });
  });

  describe('list', () => {
    it('should return all registered tools', async () => {
      const mockTool1: Tool = {
        id: 'test-tool-1',
        name: 'Test Tool 1',
        description: 'A test tool',
        schema: {},
        handler: async () => 'test1',
      };

      const mockTool2: Tool = {
        id: 'test-tool-2',
        name: 'Test Tool 2',
        description: 'Another test tool',
        schema: {},
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
