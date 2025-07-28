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

const mockOwner = 'observability' as const;

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
    owner: mockOwner,
    tools: { mockTool },
    handlers: { mockHandler },
  };

  it('registers a context definition successfully', () => {
    registry.register(mockContext);
    expect(registry.get('mockContext', mockOwner)).toEqual(mockContext);
  });

  it('throws an error when registering a duplicate context definition for the same owner', () => {
    registry.register(mockContext);
    expect(() => registry.register(mockContext)).toThrow(
      `Context type 'mockContext' is already registered for owner '${mockOwner}'.`
    );
  });

  it('retrieves a tool successfully for a specific owner', () => {
    registry.register(mockContext);
    expect(registry.getTool('mockTool', mockOwner)).toEqual(mockTool);
  });

  it('throws an error when registering a duplicate tool for the same owner', () => {
    registry.register(mockContext);
    const duplicateContext = {
      ...mockContext,
      key: 'duplicateContext',
    };
    expect(() => registry.register(duplicateContext)).toThrow(
      `Tool 'mockTool' is already registered for context type 'duplicateContext' under owner '${mockOwner}'.`
    );
  });

  it('retrieves a tool handler successfully for a specific owner', () => {
    registry.register(mockContext);
    expect(registry.getToolHandler('mockHandler', mockOwner)).toBe(mockHandler);
  });

  it('throws an error when registering a duplicate tool handler for the same owner', () => {
    registry.register(mockContext);
    const duplicateContext = {
      ...mockContext,
      tools: { mockTool2: mockTool },
      key: 'duplicateContextWithoutDuplicateTool',
    };
    expect(() => registry.register(duplicateContext)).toThrow(
      `Handler 'mockHandler' is already registered for context type 'duplicateContextWithoutDuplicateTool' under owner '${mockOwner}'.`
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

  it('returns an empty array when no handlers are registered for the owner', async () => {
    const result = await registry.getContextForOwner({}, mockOwner);
    expect(result).toEqual([]);
  });

  it('calls all registered handlers for the owner and returns their results', async () => {
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
      owner: mockOwner, // Updated to a single owner
      tools: { mockTool1: mockTool, mockTool2: mockTool },
      handlers: { mockHandler1, mockHandler2 },
    };

    registry.register(mockContext);

    const result = await registry.getContextForOwner({}, mockOwner);
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

  it('throws an error when the context key is not found for the owner', async () => {
    await expect(
      registry.getContextByKey({ key: 'nonExistentKey', context: {}, owner: mockOwner })
    ).rejects.toThrow(
      `Context with key 'nonExistentKey' is not registered for owner '${mockOwner}'.`
    );
  });

  it('throws an error when no handlers are registered for the context under the owner', async () => {
    const mockContext = {
      key: 'mockContext',
      owner: mockOwner, // Updated to a single owner
      tools: {},
      handlers: {},
    };

    registry.register(mockContext);

    await expect(
      registry.getContextByKey({ key: 'mockContext', context: {}, owner: mockOwner })
    ).rejects.toThrow(
      `No handlers registered for context with key 'mockContext' under owner '${mockOwner}'.`
    );
  });

  it('calls a specific handler when handlerName is provided for the owner', async () => {
    const mockHandler = jest.fn(async () => ({
      key: 'mockTool',
      description: 'Specific handler',
      data: [{ payload: { example: 'specificData' }, description: 'Specific payload' }],
    }));

    const mockContext = {
      key: 'mockContext',
      owner: mockOwner, // Updated to a single owner
      tools: { mockTool },
      handlers: { mockHandler },
    };

    registry.register(mockContext);

    const result = await registry.getContextByKey({
      key: 'mockContext',
      handlerName: 'mockHandler',
      context: {},
      owner: mockOwner,
    });

    expect(result).toHaveLength(1);
    expect(mockHandler).toHaveBeenCalled();
  });

  it('calls all handlers when handlerName is not provided for the owner', async () => {
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
      owner: mockOwner, // Updated to a single owner
      tools: { mockTool1: mockTool, mockTool2: mockTool },
      handlers: { mockHandler1, mockHandler2 },
    };

    registry.register(mockContext);

    const result = await registry.getContextByKey({
      key: 'mockContext',
      context: {},
      owner: mockOwner,
    });
    expect(result).toHaveLength(2);
    expect(mockHandler1).toHaveBeenCalled();
    expect(mockHandler2).toHaveBeenCalled();
  });
});
