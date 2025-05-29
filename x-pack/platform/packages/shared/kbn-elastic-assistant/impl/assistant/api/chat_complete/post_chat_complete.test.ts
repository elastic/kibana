/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { postChatComplete, PostChatCompleteParams } from './post_chat_complete';
import { HttpSetup } from '@kbn/core-http-browser';
import { API_VERSIONS } from '@kbn/elastic-assistant-common';

const mockHttpFetch = jest.fn();

const mockHttp: HttpSetup = {
  fetch: mockHttpFetch,
} as unknown as HttpSetup;

describe('postChatComplete', () => {
  const defaultParams: PostChatCompleteParams = {
    actionTypeId: '.gen-ai',
    connectorId: 'mock-connector-id',
    http: mockHttp,
    message: 'test message',
    replacements: {},
    signal: undefined,
    query: undefined,
    traceOptions: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a successful response when the API call succeeds', async () => {
    const mockResponse = {
      status: 'ok',
      data: 'mock-response',
      trace_data: {
        transaction_id: 'mock-transaction-id',
        trace_id: 'mock-trace-id',
      },
    };

    mockHttpFetch.mockResolvedValue(mockResponse);

    const result = await postChatComplete(defaultParams);

    expect(mockHttpFetch).toHaveBeenCalledWith(
      '/internal/elastic_assistant/actions/connector/mock-connector-id/_execute',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          actionTypeId: '.gen-ai',
          alertsIndexPattern: undefined,
          langSmithProject: undefined,
          langSmithApiKey: undefined,
          message: 'test message',
          promptIds: undefined,
          replacements: {},
          subAction: 'invokeAI',
        }),
        signal: undefined,
        query: undefined,
        version: API_VERSIONS.internal.v1,
      })
    );

    expect(result).toEqual({
      response: 'mock-response',
      isError: false,
      isStream: false,
      traceData: {
        transactionId: 'mock-transaction-id',
        traceId: 'mock-trace-id',
      },
    });
  });

  it('should return an error response when the API call fails', async () => {
    const mockError = new Error('API error');
    mockHttpFetch.mockRejectedValue(mockError);

    const result = await postChatComplete(defaultParams);

    expect(result).toEqual({
      response: 'An error occurred sending your message.\n\nAPI error',
      isError: true,
      isStream: false,
    });
  });

  it('should return an error response when the API response status is not "ok"', async () => {
    const mockResponse = {
      status: 'error',
      service_message: 'Service error message',
    };

    mockHttpFetch.mockResolvedValue(mockResponse);

    const result = await postChatComplete(defaultParams);

    expect(result).toEqual({
      response: 'An error occurred sending your message.\n\nService error message',
      isError: true,
      isStream: false,
    });
  });

  it('should handle missing trace data gracefully', async () => {
    const mockResponse = {
      status: 'ok',
      data: 'mock-response',
    };

    mockHttpFetch.mockResolvedValue(mockResponse);

    const result = await postChatComplete(defaultParams);

    expect(result).toEqual({
      response: 'mock-response',
      isError: false,
      isStream: false,
      traceData: undefined,
    });
  });

  it('should include trace options in the request body if provided', async () => {
    const paramsWithTraceOptions: PostChatCompleteParams = {
      ...defaultParams,
      traceOptions: {
        langSmithProject: 'mock-project',
        langSmithApiKey: 'mock-api-key',
        apmUrl: 'mock-apm-url',
      },
    };

    const mockResponse = {
      status: 'ok',
      data: 'mock-response',
    };

    mockHttpFetch.mockResolvedValue(mockResponse);

    const result = await postChatComplete(paramsWithTraceOptions);

    expect(mockHttpFetch).toHaveBeenCalledWith(
      '/internal/elastic_assistant/actions/connector/mock-connector-id/_execute',
      expect.objectContaining({
        body: JSON.stringify({
          actionTypeId: '.gen-ai',
          alertsIndexPattern: undefined,
          langSmithProject: 'mock-project',
          langSmithApiKey: 'mock-api-key',
          message: 'test message',
          promptIds: undefined,
          replacements: {},
          subAction: 'invokeAI',
        }),
      })
    );

    expect(result).toEqual({
      response: 'mock-response',
      isError: false,
      isStream: false,
      traceData: undefined,
    });
  });
});
