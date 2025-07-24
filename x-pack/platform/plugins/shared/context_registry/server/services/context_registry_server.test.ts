/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ToolDefinition } from '@kbn/inference-common';
import { ContextRegistryServer, ContextDefinitionServer } from './context_registry_server';
import { loggingSystemMock } from '@kbn/core/server/mocks';

const mockTool: ToolDefinition = {
  description: 'A mock tool',
};

describe('ContextRegistry', () => {
  let registry: ContextRegistryServer;
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    mockLogger = loggingSystemMock.createLogger();
    registry = new ContextRegistryServer(mockLogger);
  });

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

describe('getContext', () => {
  let registry: ContextRegistryServer;
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    mockLogger = loggingSystemMock.createLogger();
    registry = new ContextRegistryServer(mockLogger);
  });

  it('returns an empty array when no handlers are registered', async () => {
    const result = await registry.getContext({});
    expect(result).toEqual([]);
  });

  it('calls all registered handlers and returns their results', async () => {
    const mockHandler1 = jest.fn(async () => ({
      key: 'mockTool1',
      description: 'Handler 1',
      data: [{ payload: { example: 'data1' }, description: 'Payload 1' }],
    }));
    const mockHandler2 = jest.fn(async () => ({
      key: 'mockTool2',
      description: 'Handler 2',
      data: [{ payload: { example: 'data2' }, description: 'Payload 2' }],
    }));

    const mockContext = {
      key: 'mockContext',
      tools: { mockTool1: mockTool, mockTool2: mockTool },
      handlers: { mockHandler1, mockHandler2 },
    };

    registry.register(mockContext);

    const result = await registry.getContext({});
    expect(result).toHaveLength(2);
    expect(mockHandler1).toHaveBeenCalled();
    expect(mockHandler2).toHaveBeenCalled();
  });
});

describe('getContextByKey', () => {
  let registry: ContextRegistryServer;
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    mockLogger = loggingSystemMock.createLogger();
    registry = new ContextRegistryServer(mockLogger);
  });

  it('returns an empty array when the context key is not found', async () => {
    await expect(registry.getContextByKey({ key: 'nonExistentKey', context: {} })).rejects.toThrow(
      "Context with key 'nonExistentKey' is not registered."
    );
  });

  it('throws an error when no handlers are registered for the context', async () => {
    const mockContext = {
      key: 'mockContext',
      tools: {},
      handlers: {},
    };

    registry.register(mockContext);

    await expect(registry.getContextByKey({ key: 'mockContext', context: {} })).rejects.toThrow(
      "No handlers registered for context with key 'mockContext'. Please ensure the context is properly defined."
    );
  });

  it('calls a specific handler when handlerName is provided', async () => {
    const mockHandler = jest.fn(async () => ({
      key: 'mockTool',
      description: 'Specific handler',
      data: [{ payload: { example: 'specificData' }, description: 'Specific payload' }],
    }));

    const mockContext = {
      key: 'mockContext',
      tools: { mockTool },
      handlers: { mockHandler },
    };

    registry.register(mockContext);

    const result = await registry.getContextByKey({
      key: 'mockContext',
      handlerName: 'mockHandler',
      context: {},
    });

    expect(result).toHaveLength(1);
    expect(mockHandler).toHaveBeenCalled();
  });

  it('calls all handlers when handlerName is not provided', async () => {
    const mockHandler1 = jest.fn(async () => ({
      key: 'mockTool1',
      description: 'Handler 1',
      data: [{ payload: { example: 'data1' }, description: 'Payload 1' }],
    }));
    const mockHandler2 = jest.fn(async () => ({
      key: 'mockTool2',
      description: 'Handler 2',
      data: [{ payload: { example: 'data2' }, description: 'Payload 2' }],
    }));

    const mockContext = {
      key: 'mockContext',
      tools: { mockTool1: mockTool, mockTool2: mockTool },
      handlers: { mockHandler1, mockHandler2 },
    };

    registry.register(mockContext);

    const result = await registry.getContextByKey({ key: 'mockContext', context: {} });
    expect(result).toHaveLength(2);
    expect(mockHandler1).toHaveBeenCalled();
    expect(mockHandler2).toHaveBeenCalled();
  });
});
