/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import type { AnalyticsServiceStart } from '@kbn/core/server';
import type { Connector } from '@kbn/actions-plugin/server';
import type { Logger } from '@kbn/logging';
import { MessageRole, type Message } from '../../../../common';
import { toolCallEventType } from '../../../analytics/tool_call';
import { executeFunctionAndCatchError } from './continue_conversation';
import { createMockConnector } from '@kbn/actions-plugin/server/application/connector/mocks';

const testMessages: Message[] = [
  {
    '@timestamp': new Date().toISOString(),
    message: { role: MessageRole.User, content: 'Execute the test tool' },
  },
];

const mockConnector: Connector = createMockConnector({
  id: 'test-connector-id',
  name: 'Test GenAI Connector',
  actionTypeId: '.gen-ai',
  config: { apiProvider: 'OpenAI' },
});

describe('executeFunctionAndCatchError', () => {
  const mockLogger = { error: jest.fn(), debug: jest.fn(), trace: jest.fn() } as unknown as Logger;
  const mockAnalytics = { reportEvent: jest.fn() } as unknown as AnalyticsServiceStart;
  const mockFunctionClient = {
    executeFunction: jest.fn(),
  };
  const mockChat = jest.fn();
  const signal = new AbortController().signal;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports analytics with the correct structure', async () => {
    mockFunctionClient.executeFunction.mockResolvedValue({
      content: { result: 'success' },
    });

    const result$ = executeFunctionAndCatchError({
      name: 'my_test_tool',
      args: '{"param": "value"}',
      functionClient: mockFunctionClient as any,
      messages: testMessages,
      chat: mockChat,
      signal,
      logger: mockLogger,
      connectorId: 'test-connector-id',
      simulateFunctionCalling: false,
      analytics: mockAnalytics,
      connector: mockConnector,
      scopes: ['observability'],
    });

    await firstValueFrom(result$);

    expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
      toolCallEventType,
      expect.objectContaining({
        toolName: 'my_test_tool',
        scopes: ['observability'],
        connector: expect.objectContaining({
          connectorId: 'test-connector-id',
          name: 'Test GenAI Connector',
        }),
      })
    );
  });

  it('does not report analytics when function execution fails', async () => {
    mockFunctionClient.executeFunction.mockRejectedValue(new Error('Function execution failed'));

    const result$ = executeFunctionAndCatchError({
      name: 'failing_tool',
      args: '{}',
      functionClient: mockFunctionClient as any,
      messages: testMessages,
      chat: mockChat,
      signal,
      logger: mockLogger,
      connectorId: 'test-connector-id',
      simulateFunctionCalling: false,
      analytics: mockAnalytics,
      connector: mockConnector,
      scopes: [],
    });

    await firstValueFrom(result$);

    expect(mockAnalytics.reportEvent).not.toHaveBeenCalled();
  });

  it('handles missing connector gracefully', async () => {
    mockFunctionClient.executeFunction.mockResolvedValue({
      content: { result: 'success' },
    });

    const result$ = executeFunctionAndCatchError({
      name: 'tool_without_connector',
      args: '{}',
      functionClient: mockFunctionClient as any,
      messages: testMessages,
      chat: mockChat,
      signal,
      logger: mockLogger,
      connectorId: 'test-connector-id',
      simulateFunctionCalling: false,
      analytics: mockAnalytics,
      connector: undefined,
      scopes: ['all'],
    });

    await firstValueFrom(result$);

    expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
      toolCallEventType,
      expect.objectContaining({
        toolName: 'tool_without_connector',
        connector: undefined,
        scopes: ['all'],
      })
    );
  });
});
