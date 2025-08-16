/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ToolDefinition } from '@kbn/inference-common';
import {
  CaseSuggestionRegistryServer,
  CaseSuggestionDefinitionServer,
} from './case_suggestion_registry_server';
import { loggingSystemMock } from '@kbn/core/server/mocks';

const mockTool: ToolDefinition = {
  description: 'A mock tool',
};

const mockOwner = 'observability' as const;

describe('CaseSuggestionRegistry', () => {
  let registry: CaseSuggestionRegistryServer;
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    mockLogger = loggingSystemMock.createLogger();
    registry = new CaseSuggestionRegistryServer(mockLogger);
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

  const mockCaseSuggestion: CaseSuggestionDefinitionServer = {
    key: 'mockCaseSuggestion',
    owner: mockOwner,
    tools: { mockTool },
    handlers: { mockHandler },
  };

  it('registers a context definition successfully', () => {
    registry.register(mockCaseSuggestion);
    expect(registry.get('mockCaseSuggestion', mockOwner)).toEqual(mockCaseSuggestion);
  });

  it('throws an error when registering a duplicate context definition for the same owner', () => {
    registry.register(mockCaseSuggestion);
    expect(() => registry.register(mockCaseSuggestion)).toThrow(
      `CaseSuggestion type 'mockCaseSuggestion' is already registered for owner '${mockOwner}'.`
    );
  });

  it('retrieves a tool successfully for a specific owner', () => {
    registry.register(mockCaseSuggestion);
    expect(registry.getTool('mockTool', mockOwner)).toEqual(mockTool);
  });

  it('throws an error when registering a duplicate tool for the same owner', () => {
    registry.register(mockCaseSuggestion);
    const duplicateCaseSuggestion = {
      ...mockCaseSuggestion,
      key: 'duplicateCaseSuggestion',
    };
    expect(() => registry.register(duplicateCaseSuggestion)).toThrow(
      `Tool 'mockTool' is already registered for context type 'duplicateCaseSuggestion' under owner '${mockOwner}'.`
    );
  });

  it('retrieves a tool handler successfully for a specific owner', () => {
    registry.register(mockCaseSuggestion);
    expect(registry.getToolHandler('mockHandler', mockOwner)).toBe(mockHandler);
  });

  it('throws an error when registering a duplicate tool handler for the same owner', () => {
    registry.register(mockCaseSuggestion);
    const duplicateCaseSuggestion = {
      ...mockCaseSuggestion,
      tools: { mockTool2: mockTool },
      key: 'duplicateCaseSuggestionWithoutDuplicateTool',
    };
    expect(() => registry.register(duplicateCaseSuggestion)).toThrow(
      `Handler 'mockHandler' is already registered for context type 'duplicateCaseSuggestionWithoutDuplicateTool' under owner '${mockOwner}'.`
    );
  });
});

describe('getCaseSuggestion', () => {
  let registry: CaseSuggestionRegistryServer;
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    mockLogger = loggingSystemMock.createLogger();
    registry = new CaseSuggestionRegistryServer(mockLogger);
  });

  it('returns an empty array when no handlers are registered for the owner', async () => {
    const result = await registry.getCaseSuggestionForOwner({}, mockOwner);
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

    const mockCaseSuggestion = {
      key: 'mockCaseSuggestion',
      owner: mockOwner, // Updated to a single owner
      tools: { mockTool1: mockTool, mockTool2: mockTool },
      handlers: { mockHandler1, mockHandler2 },
    };

    registry.register(mockCaseSuggestion);

    const result = await registry.getCaseSuggestionForOwner({}, mockOwner);
    expect(result).toHaveLength(2);
    expect(mockHandler1).toHaveBeenCalled();
    expect(mockHandler2).toHaveBeenCalled();
  });
});

describe('getCaseSuggestionByKey', () => {
  let registry: CaseSuggestionRegistryServer;
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    mockLogger = loggingSystemMock.createLogger();
    registry = new CaseSuggestionRegistryServer(mockLogger);
  });

  it('throws an error when the context key is not found for the owner', async () => {
    await expect(
      registry.getCaseSuggestionByKey({ key: 'nonExistentKey', context: {}, owner: mockOwner })
    ).rejects.toThrow(
      `CaseSuggestion with key 'nonExistentKey' is not registered for owner '${mockOwner}'.`
    );
  });

  it('throws an error when no handlers are registered for the context under the owner', async () => {
    const mockCaseSuggestion = {
      key: 'mockCaseSuggestion',
      owner: mockOwner, // Updated to a single owner
      tools: {},
      handlers: {},
    };

    registry.register(mockCaseSuggestion);

    await expect(
      registry.getCaseSuggestionByKey({ key: 'mockCaseSuggestion', context: {}, owner: mockOwner })
    ).rejects.toThrow(
      `No handlers registered for context with key 'mockCaseSuggestion' under owner '${mockOwner}'.`
    );
  });

  it('calls a specific handler when handlerName is provided for the owner', async () => {
    const mockHandler = jest.fn(async () => ({
      key: 'mockTool',
      description: 'Specific handler',
      data: [{ payload: { example: 'specificData' }, description: 'Specific payload' }],
    }));

    const mockCaseSuggestion = {
      key: 'mockCaseSuggestion',
      owner: mockOwner, // Updated to a single owner
      tools: { mockTool },
      handlers: { mockHandler },
    };

    registry.register(mockCaseSuggestion);

    const result = await registry.getCaseSuggestionByKey({
      key: 'mockCaseSuggestion',
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

    const mockCaseSuggestion = {
      key: 'mockCaseSuggestion',
      owner: mockOwner, // Updated to a single owner
      tools: { mockTool1: mockTool, mockTool2: mockTool },
      handlers: { mockHandler1, mockHandler2 },
    };

    registry.register(mockCaseSuggestion);

    const result = await registry.getCaseSuggestionByKey({
      key: 'mockCaseSuggestion',
      context: {},
      owner: mockOwner,
    });
    expect(result).toHaveLength(2);
    expect(mockHandler1).toHaveBeenCalled();
    expect(mockHandler2).toHaveBeenCalled();
  });
});
