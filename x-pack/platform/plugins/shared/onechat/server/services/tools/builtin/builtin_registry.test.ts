/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import type { BuiltinToolRegistry } from './builtin_registry';
import { createBuiltinToolRegistry } from './builtin_registry';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';

describe('BuiltinToolRegistry', () => {
  let registry: BuiltinToolRegistry;

  beforeEach(() => {
    registry = createBuiltinToolRegistry();
  });

  const mockTool: BuiltinToolDefinition = {
    id: 'test-tool',
    description: 'A test tool',
    schema: z.object({}),
    tags: [],
    handler: async () => ({
      results: [{ type: ToolResultType.other, data: { someProp: 'someValue' } }],
    }),
  };

  describe('register', () => {
    it('should register a tool', async () => {
      registry.register(mockTool);
      expect(registry.list()).toEqual([mockTool]);
    });

    it('should throw if the tool id is not valid', async () => {
      expect(() =>
        registry.register({
          ...mockTool,
          id: '.invalid_id' as any,
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid tool id: \\".invalid_id\\": Tool ids must start and end with a letter or number, and can only contain lowercase letters, numbers, dots, hyphens and underscores"`
      );
    });
  });

  describe('has', () => {
    it('should return true when tool exists', async () => {
      registry.register(mockTool);
      const exists = registry.has('test-tool');
      expect(exists).toBe(true);
    });

    it('should return false when tool does not exist', async () => {
      registry.register(mockTool);
      const exists = registry.has('non-existent-tool');
      expect(exists).toBe(false);
    });
  });

  describe('get', () => {
    it('should return the tool when it exists', async () => {
      registry.register(mockTool);
      const tool = registry.get('test-tool');
      expect(tool).toEqual(mockTool);
    });

    it('should return undefined when tool does not exist', async () => {
      registry.register(mockTool);
      expect(registry.get('non-existent-tool')).toBeUndefined();
    });
  });

  describe('list', () => {
    it('should return all registered tools', async () => {
      const mockTool1: BuiltinToolDefinition = {
        id: 'test-tool-1',
        description: 'A test tool',
        tags: [],
        schema: z.object({}),
        handler: async () => ({
          results: [{ type: ToolResultType.other, data: { value: 'test1' } }],
        }),
      };

      const mockTool2: BuiltinToolDefinition = {
        id: 'test-tool-2',
        description: 'Another test tool',
        tags: [],
        schema: z.object({}),
        handler: async () => ({
          results: [{ type: ToolResultType.other, data: { value: 'test1' } }],
        }),
      };

      registry.register(mockTool1);
      registry.register(mockTool2);

      const tools = registry.list();
      expect(tools).toEqual([mockTool1, mockTool2]);
    });

    it('should return empty array when no tools are registered', async () => {
      const tools = registry.list();
      expect(tools).toEqual([]);
    });
  });
});
