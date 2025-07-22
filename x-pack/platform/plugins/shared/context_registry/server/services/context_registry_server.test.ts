/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ToolDefinition } from '@kbn/inference-common';
import { ContextRegistryServer, ContextDefinitionServer } from './context_registry_server';

describe('ContextRegistry', () => {
  let registry: ContextRegistryServer;

  beforeEach(() => {
    registry = new ContextRegistryServer();
  });

  const mockTool: ToolDefinition = {
    description: 'A mock tool',
  };

  const mockHandler = async () => ({
    key: 'mockTool',
    description: 'A mock handler for the mock tool',
    data: [
      {
        payload: { example: 'data' },
        description: 'This is a mock payload for testing',
      },
    ],
  });

  const mockContext: ContextDefinitionServer = {
    key: 'mockContext',
    tools: { mockTool },
    handlers: { mockHandler },
  };

  it('registers a context definition successfully', () => {
    registry.register(mockContext);
    expect(registry.get('mockContext')).toEqual(mockContext);
  });

  it('throws an error when registering a duplicate context definition', () => {
    registry.register(mockContext);
    expect(() => registry.register(mockContext)).toThrow(
      "Context type 'mockContext' is already registered with server context registry."
    );
  });

  it('retrieves a tool successfully', () => {
    registry.register(mockContext);
    expect(registry.getTool('mockTool')).toEqual(mockTool);
  });

  it('throws an error when registering a duplicate tool', () => {
    registry.register(mockContext);
    const duplicateContext = {
      ...mockContext,
      key: 'duplicateContext',
    };
    expect(() => registry.register(duplicateContext)).toThrow(
      "Tool 'mockTool' is already registered for context type 'duplicateContext'."
    );
  });

  it('retrieves a tool handler successfully', () => {
    registry.register(mockContext);
    expect(registry.getToolHandler('mockHandler')).toBe(mockHandler);
  });

  it('throws an error when registering a duplicate tool handler', () => {
    registry.register(mockContext);
    const duplicateContext = {
      ...mockContext,
      tools: { mockTool2: mockTool },
      key: 'duplicateContextWithoutDuplicateTool',
    };
    expect(() => registry.register(duplicateContext)).toThrow(
      "Handler 'mockHandler' is already registered for context type 'duplicateContextWithoutDuplicateTool'."
    );
  });
});
