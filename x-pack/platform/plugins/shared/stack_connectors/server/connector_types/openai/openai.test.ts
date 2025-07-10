/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosError } from 'axios';
import { OpenAIConnector } from './openai';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import {
  DEFAULT_OPENAI_MODEL,
  DEFAULT_TIMEOUT_MS,
  OPENAI_CONNECTOR_ID,
  OpenAiProviderType,
} from '../../../common/openai/constants';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { RunActionResponseSchema, StreamingResponseSchema } from '../../../common/openai/schema';
import { initDashboard } from '../lib/gen_ai/create_gen_ai_dashboard';
import { PassThrough, Transform } from 'stream';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import { TaskErrorSource, getErrorSource } from '@kbn/task-manager-plugin/server/task_running';

const DEFAULT_OTHER_OPENAI_MODEL = 'local-model';

jest.mock('../lib/gen_ai/create_gen_ai_dashboard');
const mockTee = jest.fn();

const mockCreate = jest.fn().mockImplementation(() => ({
  tee: mockTee.mockReturnValue([jest.fn(), jest.fn()]),
}));
const mockDefaults = {
  timeout: DEFAULT_TIMEOUT_MS,
  url: 'https://api.openai.com/v1/chat/completions',
  method: 'post',
  responseSchema: RunActionResponseSchema,
};
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    api_key: '123',
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  })),
}));

describe('OpenAIConnector', () => {
  let mockRequest: jest.Mock;
  let mockError: jest.Mock;
  let connectorUsageCollector: ConnectorUsageCollector;

  const logger = loggingSystemMock.createLogger();
  const mockResponseString = 'Hello! How can I assist you today?';
  const mockResponse = {
    headers: {},
    data: {
      result: 'success',
      choices: [
        {
          message: {
            role: 'assistant',
            content: mockResponseString,
          },
          delta: {
            content: mockResponseString,
          },
          finish_reason: 'stop',
          index: 0,
        },
      ],
      usage: {
        prompt_tokens: 4,
        completion_tokens: 5,
        total_tokens: 9,
      },
    },
  };
  beforeEach(() => {
    connectorUsageCollector = new ConnectorUsageCollector({
      logger,
      connectorId: 'test-connector-id',
    });
    mockRequest = jest.fn().mockResolvedValue(mockResponse);
    mockError = jest.fn().mockImplementation(() => {
      throw new Error('API Error');
    });
  });

  describe('OpenAI', () => {
    const connector = new OpenAIConnector({
      configurationUtilities: actionsConfigMock.create(),
      connector: { id: '1', type: OPENAI_CONNECTOR_ID },
      config: {
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        apiProvider: OpenAiProviderType.OpenAi,
        defaultModel: DEFAULT_OPENAI_MODEL,
        headers: {
          'X-My-Custom-Header': 'foo',
          Authorization: 'override',
        },
      },
      secrets: { apiKey: '123' },
      logger,
      services: actionsMock.createServices(),
    });

    const sampleOpenAiBody = {
      messages: [
        {
          role: 'user',
          content: 'Hello world',
        },
      ],
    };

    beforeEach(() => {
      // @ts-ignore
      connector.request = mockRequest;
      jest.clearAllMocks();
    });

    describe('runApi', () => {
      it('uses the default model if none is supplied', async () => {
        const response = await connector.runApi(
          { body: JSON.stringify(sampleOpenAiBody) },
          connectorUsageCollector
        );
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            ...mockDefaults,
            data: JSON.stringify({
              ...sampleOpenAiBody,
              stream: false,
              model: DEFAULT_OPENAI_MODEL,
            }),
            headers: {
              Authorization: 'Bearer 123',
              'X-My-Custom-Header': 'foo',
              'content-type': 'application/json',
            },
          },
          connectorUsageCollector
        );
        expect(response).toEqual(mockResponse.data);
      });

      it('overrides the default model with the default model specified in the body', async () => {
        const requestBody = { model: 'gpt-3.5-turbo', ...sampleOpenAiBody };
        const response = await connector.runApi(
          { body: JSON.stringify(requestBody) },
          connectorUsageCollector
        );
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            ...mockDefaults,
            data: JSON.stringify({ ...requestBody, stream: false }),
            headers: {
              Authorization: 'Bearer 123',
              'X-My-Custom-Header': 'foo',
              'content-type': 'application/json',
            },
          },
          connectorUsageCollector
        );
        expect(response).toEqual(mockResponse.data);
      });

      it('the OpenAI API call is successful with correct parameters', async () => {
        const response = await connector.runApi(
          { body: JSON.stringify(sampleOpenAiBody) },
          connectorUsageCollector
        );
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            ...mockDefaults,
            data: JSON.stringify({
              ...sampleOpenAiBody,
              stream: false,
              model: DEFAULT_OPENAI_MODEL,
            }),
            headers: {
              Authorization: 'Bearer 123',
              'X-My-Custom-Header': 'foo',
              'content-type': 'application/json',
            },
          },
          connectorUsageCollector
        );
        expect(response).toEqual(mockResponse.data);
      });

      it('overrides stream parameter if set in the body', async () => {
        const body = {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: 'Hello world',
            },
          ],
        };
        const response = await connector.runApi(
          {
            body: JSON.stringify({
              ...body,
              stream: true,
            }),
          },
          connectorUsageCollector
        );
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            ...mockDefaults,
            data: JSON.stringify({
              ...body,
              stream: false,
            }),
            headers: {
              Authorization: 'Bearer 123',
              'X-My-Custom-Header': 'foo',
              'content-type': 'application/json',
            },
          },
          connectorUsageCollector
        );
        expect(response).toEqual(mockResponse.data);
      });

      it('errors during API calls are properly handled', async () => {
        // @ts-ignore
        connector.request = mockError;

        await expect(
          connector.runApi({ body: JSON.stringify(sampleOpenAiBody) }, connectorUsageCollector)
        ).rejects.toThrow('API Error');
      });

      it('passes timeout and signal to runApi', async () => {
        const signal = jest.fn();
        const timeout = 12345;
        await connector.runApi(
          { body: JSON.stringify({ messages: [] }), signal, timeout },
          new ConnectorUsageCollector({ logger, connectorId: 'test' })
        );
        expect(mockRequest).toHaveBeenCalledWith(
          expect.objectContaining({ signal, timeout }),
          expect.anything()
        );
      });
    });

    describe('streamApi', () => {
      it('the OpenAI API call is successful with correct parameters when stream = false', async () => {
        const response = await connector.streamApi(
          {
            body: JSON.stringify(sampleOpenAiBody),
            stream: false,
          },
          connectorUsageCollector
        );
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            url: 'https://api.openai.com/v1/chat/completions',
            method: 'post',
            responseSchema: RunActionResponseSchema,
            data: JSON.stringify({
              ...sampleOpenAiBody,
              stream: false,
              model: DEFAULT_OPENAI_MODEL,
            }),
            headers: {
              Authorization: 'Bearer 123',
              'X-My-Custom-Header': 'foo',
              'content-type': 'application/json',
            },
          },
          connectorUsageCollector
        );
        expect(response).toEqual(mockResponse.data);
      });

      it('the OpenAI API call is successful with correct parameters when stream = true', async () => {
        const response = await connector.streamApi(
          {
            body: JSON.stringify(sampleOpenAiBody),
            stream: true,
          },
          connectorUsageCollector
        );
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            responseType: 'stream',
            url: 'https://api.openai.com/v1/chat/completions',
            method: 'post',
            responseSchema: StreamingResponseSchema,
            data: JSON.stringify({
              ...sampleOpenAiBody,
              stream: true,
              stream_options: { include_usage: true },
              model: DEFAULT_OPENAI_MODEL,
            }),
            headers: {
              Authorization: 'Bearer 123',
              'X-My-Custom-Header': 'foo',
              'content-type': 'application/json',
            },
          },
          connectorUsageCollector
        );
        expect(response).toEqual({
          headers: { 'Content-Type': 'dont-compress-this' },
          ...mockResponse.data,
        });
      });

      it('overrides stream parameter if set in the body with explicit stream parameter', async () => {
        const body = {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: 'Hello world',
            },
          ],
        };
        const response = await connector.streamApi(
          {
            body: JSON.stringify({
              ...body,
              stream: false,
            }),
            stream: true,
          },
          connectorUsageCollector
        );
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            responseType: 'stream',
            url: 'https://api.openai.com/v1/chat/completions',
            method: 'post',
            responseSchema: StreamingResponseSchema,
            data: JSON.stringify({
              ...body,
              stream: true,
              stream_options: { include_usage: true },
            }),
            headers: {
              Authorization: 'Bearer 123',
              'X-My-Custom-Header': 'foo',
              'content-type': 'application/json',
            },
          },
          connectorUsageCollector
        );
        expect(response).toEqual({
          headers: { 'Content-Type': 'dont-compress-this' },
          ...mockResponse.data,
        });
      });

      it('errors during API calls are properly handled', async () => {
        // @ts-ignore
        connector.request = mockError;

        await expect(
          connector.streamApi(
            { body: JSON.stringify(sampleOpenAiBody), stream: true },
            connectorUsageCollector
          )
        ).rejects.toThrow('API Error');
      });
    });

    describe('invokeStream', () => {
      const mockStream = (
        dataToStream: string[] = [
          'data: {"object":"chat.completion.chunk","choices":[{"delta":{"content":"My"}}]}\ndata: {"object":"chat.completion.chunk","choices":[{"delta":{"content":" new"}}]}',
        ]
      ) => {
        const streamMock = createStreamMock();
        dataToStream.forEach((chunk) => {
          streamMock.write(chunk);
        });
        streamMock.complete();
        mockRequest = jest.fn().mockResolvedValue({ ...mockResponse, data: streamMock.transform });
        return mockRequest;
      };
      beforeEach(() => {
        // @ts-ignore
        connector.request = mockStream();
      });

      it('the API call is successful with correct request parameters', async () => {
        await connector.invokeStream(sampleOpenAiBody, connectorUsageCollector);
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            url: 'https://api.openai.com/v1/chat/completions',
            method: 'post',
            responseSchema: StreamingResponseSchema,
            responseType: 'stream',
            data: JSON.stringify({
              ...sampleOpenAiBody,
              stream: true,
              stream_options: { include_usage: true },
              model: DEFAULT_OPENAI_MODEL,
            }),
            headers: {
              Authorization: 'Bearer 123',
              'X-My-Custom-Header': 'foo',
              'content-type': 'application/json',
            },
          },
          connectorUsageCollector
        );
      });

      it('signal is properly passed to streamApi', async () => {
        const signal = jest.fn();
        await connector.invokeStream({ ...sampleOpenAiBody, signal }, connectorUsageCollector);

        expect(mockRequest).toHaveBeenCalledWith(
          {
            url: 'https://api.openai.com/v1/chat/completions',
            method: 'post',
            responseSchema: StreamingResponseSchema,
            responseType: 'stream',
            data: JSON.stringify({
              ...sampleOpenAiBody,
              stream: true,
              stream_options: { include_usage: true },
              model: DEFAULT_OPENAI_MODEL,
            }),
            headers: {
              Authorization: 'Bearer 123',
              'X-My-Custom-Header': 'foo',
              'content-type': 'application/json',
            },
            signal,
          },
          connectorUsageCollector
        );
      });

      it('timeout is properly passed to streamApi', async () => {
        const timeout = 180000;
        await connector.invokeStream({ ...sampleOpenAiBody, timeout }, connectorUsageCollector);

        expect(mockRequest).toHaveBeenCalledWith(
          {
            url: 'https://api.openai.com/v1/chat/completions',
            method: 'post',
            responseSchema: StreamingResponseSchema,
            responseType: 'stream',
            data: JSON.stringify({
              ...sampleOpenAiBody,
              stream: true,
              stream_options: { include_usage: true },
              model: DEFAULT_OPENAI_MODEL,
            }),
            headers: {
              Authorization: 'Bearer 123',
              'X-My-Custom-Header': 'foo',
              'content-type': 'application/json',
            },
            timeout,
          },
          connectorUsageCollector
        );
      });

      it('errors during API calls are properly handled', async () => {
        // @ts-ignore
        connector.request = mockError;

        await expect(
          connector.invokeStream(sampleOpenAiBody, connectorUsageCollector)
        ).rejects.toThrow('API Error');
      });

      it('responds with a readable stream', async () => {
        // @ts-ignore
        connector.request = mockStream();
        const response = await connector.invokeStream(sampleOpenAiBody, connectorUsageCollector);
        expect(response instanceof PassThrough).toEqual(true);
      });
    });

    describe('invokeAI', () => {
      it('the API call is successful with correct parameters', async () => {
        const response = await connector.invokeAI(sampleOpenAiBody, connectorUsageCollector);
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            ...mockDefaults,
            data: JSON.stringify({
              ...sampleOpenAiBody,
              stream: false,
              model: DEFAULT_OPENAI_MODEL,
            }),
            headers: {
              Authorization: 'Bearer 123',
              'X-My-Custom-Header': 'foo',
              'content-type': 'application/json',
            },
          },
          connectorUsageCollector
        );
        expect(response.message).toEqual(mockResponseString);
        expect(response.usage.total_tokens).toEqual(9);
      });

      it('signal is properly passed to runApi', async () => {
        const signal = jest.fn();
        await connector.invokeAI({ ...sampleOpenAiBody, signal }, connectorUsageCollector);

        expect(mockRequest).toHaveBeenCalledWith(
          {
            ...mockDefaults,
            data: JSON.stringify({
              ...sampleOpenAiBody,
              stream: false,
              model: DEFAULT_OPENAI_MODEL,
            }),
            headers: {
              Authorization: 'Bearer 123',
              'X-My-Custom-Header': 'foo',
              'content-type': 'application/json',
            },
            signal,
          },
          connectorUsageCollector
        );
      });

      it('timeout is properly passed to runApi', async () => {
        const timeout = 180000;
        await connector.invokeAI({ ...sampleOpenAiBody, timeout }, connectorUsageCollector);

        expect(mockRequest).toHaveBeenCalledWith(
          {
            ...mockDefaults,
            data: JSON.stringify({
              ...sampleOpenAiBody,
              stream: false,
              model: DEFAULT_OPENAI_MODEL,
            }),
            headers: {
              Authorization: 'Bearer 123',
              'X-My-Custom-Header': 'foo',
              'content-type': 'application/json',
            },
            timeout,
          },
          connectorUsageCollector
        );
      });

      it('errors during API calls are properly handled', async () => {
        // @ts-ignore
        connector.request = mockError;

        await expect(connector.invokeAI(sampleOpenAiBody, connectorUsageCollector)).rejects.toThrow(
          'API Error'
        );
      });
    });

    describe('invokeAsyncIterator', () => {
      it('the API call is successful with correct request parameters', async () => {
        await connector.invokeAsyncIterator(sampleOpenAiBody, connectorUsageCollector);
        expect(mockRequest).toBeCalledTimes(0);
        expect(mockCreate).toHaveBeenCalledWith(
          {
            ...sampleOpenAiBody,
            stream: true,
            model: DEFAULT_OPENAI_MODEL,
          },
          { signal: undefined }
        );
        expect(mockTee).toBeCalledTimes(1);
      });
      it('signal and timeout is properly passed', async () => {
        const timeout = 180000;
        const signal = jest.fn();
        await connector.invokeAsyncIterator(
          { ...sampleOpenAiBody, signal, timeout },
          connectorUsageCollector
        );
        expect(mockRequest).toBeCalledTimes(0);
        expect(mockCreate).toHaveBeenCalledWith(
          {
            ...sampleOpenAiBody,
            stream: true,
            model: DEFAULT_OPENAI_MODEL,
          },
          {
            signal,
            timeout,
          }
        );
        expect(mockTee).toBeCalledTimes(1);
      });

      it('errors during API calls are properly handled', async () => {
        mockCreate.mockImplementationOnce(() => {
          throw new Error('API Error');
        });

        await expect(
          connector.invokeAsyncIterator(sampleOpenAiBody, connectorUsageCollector)
        ).rejects.toThrow('API Error');
      });

      it('marks 429 errors as user errors', async () => {
        expect.assertions(1);

        mockCreate.mockImplementationOnce(() => {
          const error = new Error('API Error');
          // @ts-expect-error - adding status to error
          error.status = 429;

          throw error;
        });

        try {
          await connector.invokeAsyncIterator(sampleOpenAiBody, connectorUsageCollector);
        } catch (error) {
          expect(getErrorSource(error)).toBe(TaskErrorSource.USER);
        }
      });
    });
    describe('getResponseErrorMessage', () => {
      it('returns an unknown error message', () => {
        // @ts-expect-error expects an axios error as the parameter
        expect(connector.getResponseErrorMessage({})).toEqual(
          `Unexpected API Error:  - Unknown error`
        );
      });

      it('returns the error.message', () => {
        // @ts-expect-error expects an axios error as the parameter
        expect(connector.getResponseErrorMessage({ message: 'a message' })).toEqual(
          `Unexpected API Error:  - a message`
        );
      });

      it('returns the error.response.data.error.message', () => {
        const err = {
          response: {
            headers: {},
            status: 404,
            statusText: 'Resource Not Found',
            data: {
              error: {
                message: 'Resource not found',
              },
            },
          },
        } as AxiosError<{ error?: { message?: string } }>;
        expect(
          // @ts-expect-error expects an axios error as the parameter
          connector.getResponseErrorMessage(err)
        ).toEqual(`API Error: Resource Not Found - Resource not found`);
      });

      it('returns the error.response.data.error', () => {
        const err = {
          response: {
            headers: {},
            status: 404,
            statusText: 'Resource Not Found',
            data: {
              error: 'Resource not found',
            },
          },
        } as AxiosError<{ error?: string }>;
        expect(
          // @ts-expect-error expects an axios error as the parameter
          connector.getResponseErrorMessage(err)
        ).toEqual(`API Error: Resource Not Found - Resource not found`);
      });

      it('returns auhtorization error', () => {
        const err = {
          response: {
            headers: {},
            status: 401,
            statusText: 'Auth error',
            data: {
              error: {
                message: 'The api key was invalid.',
              },
            },
          },
        } as AxiosError<{ error?: { message?: string } }>;

        // @ts-expect-error expects an axios error as the parameter
        expect(connector.getResponseErrorMessage(err)).toEqual(
          `Unauthorized API Error - The api key was invalid.`
        );
      });
    });
  });
  describe('OpenAI with special headers', () => {
    const connector = new OpenAIConnector({
      configurationUtilities: actionsConfigMock.create(),
      connector: { id: '1', type: OPENAI_CONNECTOR_ID },
      config: {
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        apiProvider: OpenAiProviderType.OpenAi,
        defaultModel: DEFAULT_OPENAI_MODEL,
        organizationId: 'org-id',
        projectId: 'proj-id',
        headers: {
          'X-My-Custom-Header': 'foo',
          Authorization: 'override',
        },
      },
      secrets: { apiKey: '123' },
      logger,
      services: actionsMock.createServices(),
    });

    const sampleOpenAiBody = {
      messages: [
        {
          role: 'user',
          content: 'Hello world',
        },
      ],
    };

    beforeEach(() => {
      // @ts-ignore
      connector.request = mockRequest;
      jest.clearAllMocks();
    });

    it('the OpenAI API call is successful with correct parameters', async () => {
      const response = await connector.runApi(
        { body: JSON.stringify(sampleOpenAiBody) },
        connectorUsageCollector
      );
      expect(mockRequest).toBeCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith(
        {
          ...mockDefaults,
          data: JSON.stringify({
            ...sampleOpenAiBody,
            stream: false,
            model: DEFAULT_OPENAI_MODEL,
          }),
          headers: {
            'OpenAI-Organization': 'org-id',
            'OpenAI-Project': 'proj-id',
            Authorization: 'Bearer 123',
            'X-My-Custom-Header': 'foo',
            'content-type': 'application/json',
          },
        },
        connectorUsageCollector
      );
      expect(response).toEqual(mockResponse.data);
    });
  });

  describe('OpenAI without headers', () => {
    const connector = new OpenAIConnector({
      configurationUtilities: actionsConfigMock.create(),
      connector: { id: '1', type: OPENAI_CONNECTOR_ID },
      config: {
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        apiProvider: OpenAiProviderType.OpenAi,
        defaultModel: DEFAULT_OPENAI_MODEL,
      },
      secrets: { apiKey: '123' },
      logger: loggingSystemMock.createLogger(),
      services: actionsMock.createServices(),
    });

    const sampleOpenAiBody = {
      messages: [
        {
          role: 'user',
          content: 'Hello world',
        },
      ],
    };

    beforeEach(() => {
      // @ts-ignore
      connector.request = mockRequest;
      jest.clearAllMocks();
    });

    describe('runApi', () => {
      it('uses the default model if none is supplied', async () => {
        const response = await connector.runApi(
          { body: JSON.stringify(sampleOpenAiBody) },
          connectorUsageCollector
        );
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            ...mockDefaults,
            data: JSON.stringify({
              ...sampleOpenAiBody,
              stream: false,
              model: DEFAULT_OPENAI_MODEL,
            }),
            headers: {
              Authorization: 'Bearer 123',
              'content-type': 'application/json',
            },
          },
          connectorUsageCollector
        );
        expect(response).toEqual(mockResponse.data);
      });
    });
  });

  describe('Other OpenAI', () => {
    const connector = new OpenAIConnector({
      configurationUtilities: actionsConfigMock.create(),
      connector: { id: '1', type: OPENAI_CONNECTOR_ID },
      config: {
        apiUrl: 'http://localhost:1234/v1/chat/completions',
        apiProvider: OpenAiProviderType.Other,
        defaultModel: DEFAULT_OTHER_OPENAI_MODEL,
        headers: {
          'X-My-Custom-Header': 'foo',
          Authorization: 'override',
        },
      },
      secrets: { apiKey: '123' },
      logger,
      services: actionsMock.createServices(),
    });

    const sampleOpenAiBody = {
      model: DEFAULT_OTHER_OPENAI_MODEL,
      messages: [
        {
          role: 'user',
          content: 'Hello world',
        },
      ],
    };

    beforeEach(() => {
      // @ts-ignore
      connector.request = mockRequest;
      jest.clearAllMocks();
    });

    describe('runApi', () => {
      it('the Other OpenAI API call is successful with correct parameters', async () => {
        const response = await connector.runApi(
          { body: JSON.stringify(sampleOpenAiBody) },
          connectorUsageCollector
        );
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            ...mockDefaults,
            url: 'http://localhost:1234/v1/chat/completions',
            data: JSON.stringify({
              ...sampleOpenAiBody,
              stream: false,
              model: DEFAULT_OTHER_OPENAI_MODEL,
            }),
            headers: {
              Authorization: 'Bearer 123',
              'X-My-Custom-Header': 'foo',
              'content-type': 'application/json',
            },
          },
          connectorUsageCollector
        );
        expect(response).toEqual(mockResponse.data);
      });

      it('overrides stream parameter if set in the body', async () => {
        const body = {
          model: 'llama-3.1',
          messages: [
            {
              role: 'user',
              content: 'Hello world',
            },
          ],
        };
        const response = await connector.runApi(
          {
            body: JSON.stringify({
              ...body,
              stream: true,
            }),
          },
          connectorUsageCollector
        );
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            ...mockDefaults,
            url: 'http://localhost:1234/v1/chat/completions',
            data: JSON.stringify({
              ...body,
              stream: false,
            }),
            headers: {
              Authorization: 'Bearer 123',
              'X-My-Custom-Header': 'foo',
              'content-type': 'application/json',
            },
          },
          connectorUsageCollector
        );
        expect(response).toEqual(mockResponse.data);
      });

      it('errors during API calls are properly handled', async () => {
        // @ts-ignore
        connector.request = mockError;

        await expect(
          connector.runApi({ body: JSON.stringify(sampleOpenAiBody) }, connectorUsageCollector)
        ).rejects.toThrow('API Error');
      });
    });

    describe('streamApi', () => {
      it('the Other OpenAI API call is successful with correct parameters when stream = false', async () => {
        const response = await connector.streamApi(
          {
            body: JSON.stringify(sampleOpenAiBody),
            stream: false,
          },
          connectorUsageCollector
        );
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            url: 'http://localhost:1234/v1/chat/completions',
            method: 'post',
            responseSchema: RunActionResponseSchema,
            data: JSON.stringify({
              ...sampleOpenAiBody,
              stream: false,
            }),
            headers: {
              Authorization: 'Bearer 123',
              'X-My-Custom-Header': 'foo',
              'content-type': 'application/json',
            },
          },
          connectorUsageCollector
        );
        expect(response).toEqual(mockResponse.data);
      });

      it('the Other OpenAI API call is successful with correct parameters when stream = true', async () => {
        const response = await connector.streamApi(
          {
            body: JSON.stringify(sampleOpenAiBody),
            stream: true,
          },
          connectorUsageCollector
        );
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            responseType: 'stream',
            url: 'http://localhost:1234/v1/chat/completions',
            method: 'post',
            responseSchema: StreamingResponseSchema,
            data: JSON.stringify({
              ...sampleOpenAiBody,
              stream: true,
              model: DEFAULT_OTHER_OPENAI_MODEL,
            }),
            headers: {
              Authorization: 'Bearer 123',
              'X-My-Custom-Header': 'foo',
              'content-type': 'application/json',
            },
          },
          connectorUsageCollector
        );
        expect(response).toEqual({
          headers: { 'Content-Type': 'dont-compress-this' },
          ...mockResponse.data,
        });
      });

      it('overrides stream parameter if set in the body with explicit stream parameter', async () => {
        const body = {
          model: 'llama-3.1',
          messages: [
            {
              role: 'user',
              content: 'Hello world',
            },
          ],
        };
        const response = await connector.streamApi(
          {
            body: JSON.stringify({
              ...body,
              stream: false,
            }),
            stream: true,
          },
          connectorUsageCollector
        );
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            responseType: 'stream',
            url: 'http://localhost:1234/v1/chat/completions',
            method: 'post',
            responseSchema: StreamingResponseSchema,
            data: JSON.stringify({
              ...body,
              stream: true,
            }),
            headers: {
              Authorization: 'Bearer 123',
              'X-My-Custom-Header': 'foo',
              'content-type': 'application/json',
            },
          },
          connectorUsageCollector
        );
        expect(response).toEqual({
          headers: { 'Content-Type': 'dont-compress-this' },
          ...mockResponse.data,
        });
      });

      it('errors during API calls are properly handled', async () => {
        // @ts-ignore
        connector.request = mockError;

        await expect(
          connector.streamApi(
            { body: JSON.stringify(sampleOpenAiBody), stream: true },
            connectorUsageCollector
          )
        ).rejects.toThrow('API Error');
      });
    });

    describe('invokeStream', () => {
      const mockStream = (
        dataToStream: string[] = [
          'data: {"object":"chat.completion.chunk","choices":[{"delta":{"content":"My"}}]}\ndata: {"object":"chat.completion.chunk","choices":[{"delta":{"content":" new"}}]}',
        ]
      ) => {
        const streamMock = createStreamMock();
        dataToStream.forEach((chunk) => {
          streamMock.write(chunk);
        });
        streamMock.complete();
        mockRequest = jest.fn().mockResolvedValue({ ...mockResponse, data: streamMock.transform });
        return mockRequest;
      };
      beforeEach(() => {
        // @ts-ignore
        connector.request = mockStream();
      });

      it('the API call is successful with correct request parameters', async () => {
        await connector.invokeStream(sampleOpenAiBody, connectorUsageCollector);
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            url: 'http://localhost:1234/v1/chat/completions',
            method: 'post',
            responseSchema: StreamingResponseSchema,
            responseType: 'stream',
            data: JSON.stringify({
              ...sampleOpenAiBody,
              stream: true,
            }),
            headers: {
              Authorization: 'Bearer 123',
              'X-My-Custom-Header': 'foo',
              'content-type': 'application/json',
            },
          },
          connectorUsageCollector
        );
      });

      it('signal is properly passed to streamApi', async () => {
        const signal = jest.fn();
        await connector.invokeStream({ ...sampleOpenAiBody, signal }, connectorUsageCollector);

        expect(mockRequest).toHaveBeenCalledWith(
          {
            url: 'http://localhost:1234/v1/chat/completions',
            method: 'post',
            responseSchema: StreamingResponseSchema,
            responseType: 'stream',
            data: JSON.stringify({
              ...sampleOpenAiBody,
              stream: true,
            }),
            headers: {
              Authorization: 'Bearer 123',
              'X-My-Custom-Header': 'foo',
              'content-type': 'application/json',
            },
            signal,
          },
          connectorUsageCollector
        );
      });

      it('timeout is properly passed to streamApi', async () => {
        const timeout = 180000;
        await connector.invokeStream({ ...sampleOpenAiBody, timeout }, connectorUsageCollector);

        expect(mockRequest).toHaveBeenCalledWith(
          {
            url: 'http://localhost:1234/v1/chat/completions',
            method: 'post',
            responseSchema: StreamingResponseSchema,
            responseType: 'stream',
            data: JSON.stringify({
              ...sampleOpenAiBody,
              stream: true,
            }),
            headers: {
              Authorization: 'Bearer 123',
              'X-My-Custom-Header': 'foo',
              'content-type': 'application/json',
            },
            timeout,
          },
          connectorUsageCollector
        );
      });

      it('errors during API calls are properly handled', async () => {
        // @ts-ignore
        connector.request = mockError;

        await expect(
          connector.invokeStream(sampleOpenAiBody, connectorUsageCollector)
        ).rejects.toThrow('API Error');
      });

      it('responds with a readable stream', async () => {
        // @ts-ignore
        connector.request = mockStream();
        const response = await connector.invokeStream(sampleOpenAiBody, connectorUsageCollector);
        expect(response instanceof PassThrough).toEqual(true);
      });
    });

    describe('invokeAI', () => {
      it('the API call is successful with correct parameters', async () => {
        const response = await connector.invokeAI(sampleOpenAiBody, connectorUsageCollector);
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            ...mockDefaults,
            url: 'http://localhost:1234/v1/chat/completions',
            data: JSON.stringify({
              ...sampleOpenAiBody,
              stream: false,
              model: DEFAULT_OTHER_OPENAI_MODEL,
            }),
            headers: {
              Authorization: 'Bearer 123',
              'X-My-Custom-Header': 'foo',
              'content-type': 'application/json',
            },
          },
          connectorUsageCollector
        );
        expect(response.message).toEqual(mockResponseString);
        expect(response.usage.total_tokens).toEqual(9);
      });

      it('signal is properly passed to runApi', async () => {
        const signal = jest.fn();
        await connector.invokeAI({ ...sampleOpenAiBody, signal }, connectorUsageCollector);

        expect(mockRequest).toHaveBeenCalledWith(
          {
            ...mockDefaults,
            url: 'http://localhost:1234/v1/chat/completions',
            data: JSON.stringify({
              ...sampleOpenAiBody,
              stream: false,
              model: DEFAULT_OTHER_OPENAI_MODEL,
            }),
            headers: {
              Authorization: 'Bearer 123',
              'X-My-Custom-Header': 'foo',
              'content-type': 'application/json',
            },
            signal,
          },
          connectorUsageCollector
        );
      });

      it('timeout is properly passed to runApi', async () => {
        const timeout = 180000;
        await connector.invokeAI({ ...sampleOpenAiBody, timeout }, connectorUsageCollector);

        expect(mockRequest).toHaveBeenCalledWith(
          {
            ...mockDefaults,
            url: 'http://localhost:1234/v1/chat/completions',
            data: JSON.stringify({
              ...sampleOpenAiBody,
              stream: false,
              model: DEFAULT_OTHER_OPENAI_MODEL,
            }),
            headers: {
              Authorization: 'Bearer 123',
              'X-My-Custom-Header': 'foo',
              'content-type': 'application/json',
            },
            timeout,
          },
          connectorUsageCollector
        );
      });

      it('errors during API calls are properly handled', async () => {
        // @ts-ignore
        connector.request = mockError;

        await expect(connector.invokeAI(sampleOpenAiBody, connectorUsageCollector)).rejects.toThrow(
          'API Error'
        );
      });
    });
  });

  describe('AzureAI', () => {
    const connector = new OpenAIConnector({
      configurationUtilities: actionsConfigMock.create(),
      connector: { id: '1', type: OPENAI_CONNECTOR_ID },
      config: {
        apiUrl:
          'https://My-test-resource-123.openai.azure.com/openai/deployments/NEW-DEPLOYMENT-321/chat/completions?api-version=2023-05-15',
        apiProvider: OpenAiProviderType.AzureAi,
      },
      secrets: { apiKey: '123' },
      logger: loggingSystemMock.createLogger(),
      services: actionsMock.createServices(),
    });

    const sampleAzureAiBody = {
      messages: [
        {
          role: 'user',
          content: 'Hello world',
        },
      ],
    };

    beforeEach(() => {
      // @ts-ignore
      connector.request = mockRequest;
      jest.clearAllMocks();
    });

    describe('runApi', () => {
      it('test the AzureAI API call is successful with correct parameters', async () => {
        const response = await connector.runApi(
          { body: JSON.stringify(sampleAzureAiBody) },
          connectorUsageCollector
        );
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            ...mockDefaults,
            url: 'https://My-test-resource-123.openai.azure.com/openai/deployments/NEW-DEPLOYMENT-321/chat/completions?api-version=2023-05-15',
            data: JSON.stringify({ ...sampleAzureAiBody, stream: false }),
            headers: {
              'api-key': '123',
              'content-type': 'application/json',
            },
          },
          connectorUsageCollector
        );
        expect(response).toEqual(mockResponse.data);
      });

      it('overrides stream parameter if set in the body', async () => {
        const body = {
          messages: [
            {
              role: 'user',
              content: 'Hello world',
            },
          ],
        };
        const response = await connector.runApi(
          {
            body: JSON.stringify({ ...body, stream: true }),
          },
          connectorUsageCollector
        );
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            ...mockDefaults,
            url: 'https://My-test-resource-123.openai.azure.com/openai/deployments/NEW-DEPLOYMENT-321/chat/completions?api-version=2023-05-15',
            data: JSON.stringify({ ...sampleAzureAiBody, stream: false }),
            headers: {
              'api-key': '123',
              'content-type': 'application/json',
            },
          },
          connectorUsageCollector
        );
        expect(response).toEqual(mockResponse.data);
      });

      it('errors during API calls are properly handled', async () => {
        // @ts-ignore
        connector.request = mockError;

        await expect(
          connector.runApi({ body: JSON.stringify(sampleAzureAiBody) }, connectorUsageCollector)
        ).rejects.toThrow('API Error');
      });
    });

    describe('streamApi', () => {
      it('the AzureAI API call is successful with correct parameters when stream = false', async () => {
        const response = await connector.streamApi(
          {
            body: JSON.stringify(sampleAzureAiBody),
            stream: false,
          },
          connectorUsageCollector
        );
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            url: 'https://My-test-resource-123.openai.azure.com/openai/deployments/NEW-DEPLOYMENT-321/chat/completions?api-version=2023-05-15',
            method: 'post',
            responseSchema: RunActionResponseSchema,
            data: JSON.stringify({ ...sampleAzureAiBody, stream: false }),
            headers: {
              'api-key': '123',
              'content-type': 'application/json',
            },
          },
          connectorUsageCollector
        );
        expect(response).toEqual(mockResponse.data);
      });

      it('the AzureAI API call is successful with correct parameters when stream = true', async () => {
        const response = await connector.streamApi(
          {
            body: JSON.stringify(sampleAzureAiBody),
            stream: true,
          },
          connectorUsageCollector
        );
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            responseType: 'stream',
            url: 'https://My-test-resource-123.openai.azure.com/openai/deployments/NEW-DEPLOYMENT-321/chat/completions?api-version=2023-05-15',
            method: 'post',
            responseSchema: StreamingResponseSchema,
            data: JSON.stringify({
              ...sampleAzureAiBody,
              stream: true,
              stream_options: { include_usage: true },
            }),
            headers: {
              'api-key': '123',
              'content-type': 'application/json',
            },
          },
          connectorUsageCollector
        );
        expect(response).toEqual({
          headers: { 'Content-Type': 'dont-compress-this' },
          ...mockResponse.data,
        });
      });

      it('overrides stream parameter if set in the body with explicit stream parameter', async () => {
        const body = {
          messages: [
            {
              role: 'user',
              content: 'Hello world',
            },
          ],
        };
        const response = await connector.streamApi(
          {
            body: JSON.stringify({ ...body, stream: false }),
            stream: true,
          },
          connectorUsageCollector
        );
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            responseType: 'stream',
            url: 'https://My-test-resource-123.openai.azure.com/openai/deployments/NEW-DEPLOYMENT-321/chat/completions?api-version=2023-05-15',
            method: 'post',
            responseSchema: StreamingResponseSchema,
            data: JSON.stringify({
              ...body,
              stream: true,
              stream_options: { include_usage: true },
            }),
            headers: {
              'api-key': '123',
              'content-type': 'application/json',
            },
          },
          connectorUsageCollector
        );
        expect(response).toEqual({
          headers: { 'Content-Type': 'dont-compress-this' },
          ...mockResponse.data,
        });
      });

      it('errors during API calls are properly handled', async () => {
        // @ts-ignore
        connector.request = mockError;

        await expect(
          connector.streamApi(
            { body: JSON.stringify(sampleAzureAiBody), stream: true },
            connectorUsageCollector
          )
        ).rejects.toThrow('API Error');
      });
    });
  });

  describe('Token dashboard', () => {
    const connector = new OpenAIConnector({
      configurationUtilities: actionsConfigMock.create(),
      connector: { id: '1', type: OPENAI_CONNECTOR_ID },
      config: { apiUrl: 'https://example.com/api', apiProvider: OpenAiProviderType.AzureAi },
      secrets: { apiKey: '123' },
      logger: loggingSystemMock.createLogger(),
      services: actionsMock.createServices(),
    });
    const mockGenAi = initDashboard as jest.Mock;
    beforeEach(() => {
      // @ts-ignore
      connector.esClient.transport.request = mockRequest;
      mockRequest.mockResolvedValue({ has_all_requested: true });
      mockGenAi.mockResolvedValue({ success: true });
      jest.clearAllMocks();
    });
    it('the create dashboard API call returns available: true when user has correct permissions', async () => {
      const response = await connector.getDashboard({ dashboardId: '123' });
      expect(mockRequest).toBeCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith({
        path: '/_security/user/_has_privileges',
        method: 'POST',
        body: {
          index: [
            {
              names: ['.kibana-event-log-*'],
              allow_restricted_indices: true,
              privileges: ['read'],
            },
          ],
        },
      });
      expect(response).toEqual({ available: true });
    });
    it('the create dashboard API call returns available: false when user has correct permissions', async () => {
      mockRequest.mockResolvedValue({ has_all_requested: false });
      const response = await connector.getDashboard({ dashboardId: '123' });
      expect(mockRequest).toBeCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith({
        path: '/_security/user/_has_privileges',
        method: 'POST',
        body: {
          index: [
            {
              names: ['.kibana-event-log-*'],
              allow_restricted_indices: true,
              privileges: ['read'],
            },
          ],
        },
      });
      expect(response).toEqual({ available: false });
    });

    it('the create dashboard API call returns available: false when init dashboard fails', async () => {
      mockGenAi.mockResolvedValue({ success: false });
      const response = await connector.getDashboard({ dashboardId: '123' });
      expect(mockRequest).toBeCalledTimes(1);
      expect(mockRequest).toHaveBeenCalledWith({
        path: '/_security/user/_has_privileges',
        method: 'POST',
        body: {
          index: [
            {
              names: ['.kibana-event-log-*'],
              allow_restricted_indices: true,
              privileges: ['read'],
            },
          ],
        },
      });
      expect(response).toEqual({ available: false });
    });
  });

  describe('PKI/SSL overrides', () => {
    const config = {
      apiUrl: 'https://other-openai.local/v1/chat/completions',
      apiProvider: OpenAiProviderType.Other,
      defaultModel: DEFAULT_OTHER_OPENAI_MODEL,
      verificationMode: 'full' as const,
      headers: {},
    };
    const secrets = {
      certificateData: Buffer.from(
        '-----BEGIN CERTIFICATE-----cert-----END CERTIFICATE-----'
      ).toString('base64'),
      privateKeyData: Buffer.from(
        '-----BEGIN PRIVATE KEY-----key-----END PRIVATE KEY-----'
      ).toString('base64'),
      caData: Buffer.from('-----BEGIN CERTIFICATE-----ca-----END CERTIFICATE-----').toString(
        'base64'
      ),
    };
    it('should initialize PKI SSL overrides when PKI secrets are present', () => {
      const connector = new OpenAIConnector({
        configurationUtilities: actionsConfigMock.create(),
        connector: { id: '1', type: OPENAI_CONNECTOR_ID },
        config,
        secrets,
        logger,
        services: actionsMock.createServices(),
      });
      expect(connector).toBeDefined();
      // @ts-ignore
      expect(connector.sslOverrides).toBeDefined();
    });
    it('should throw and log error when PKI secrets are invalid', () => {
      const badSecrets = { ...secrets, certificateData: undefined };
      expect(() => {
        new OpenAIConnector({
          configurationUtilities: actionsConfigMock.create(),
          connector: { id: '1', type: OPENAI_CONNECTOR_ID },
          config,
          secrets: badSecrets,
          logger,
          services: actionsMock.createServices(),
        });
      }).toThrow();
    });
    it('should call runApi with sslOverrides when they exist', async () => {
      const connector = new OpenAIConnector({
        configurationUtilities: actionsConfigMock.create(),
        connector: { id: '1', type: OPENAI_CONNECTOR_ID },
        config,
        secrets,
        logger,
        services: actionsMock.createServices(),
      });
      // @ts-ignore
      connector.request = jest.fn().mockResolvedValue({ data: {} });
      // @ts-ignore
      connector.request = mockRequest;
      await connector.runApi(
        { body: JSON.stringify({ messages: [] }) },
        new ConnectorUsageCollector({ logger, connectorId: 'test' })
      );
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          sslOverrides: expect.objectContaining({
            verificationMode: 'full',
          }),
        }),
        expect.anything()
      );
    });
  });

  describe('Organization/Project headers', () => {
    it('should include OpenAI-Organization and OpenAI-Project headers if present', async () => {
      const connector = new OpenAIConnector({
        configurationUtilities: actionsConfigMock.create(),
        connector: { id: '1', type: OPENAI_CONNECTOR_ID },
        config: {
          apiUrl: 'https://api.openai.com/v1/chat/completions',
          apiProvider: OpenAiProviderType.OpenAi,
          defaultModel: DEFAULT_OPENAI_MODEL,
          organizationId: 'org-id',
          projectId: 'proj-id',
          headers: { 'X-My-Custom-Header': 'foo' },
        },
        secrets: { apiKey: '123' },
        logger,
        services: actionsMock.createServices(),
      });
      // @ts-ignore
      connector.request = jest.fn().mockResolvedValue({ data: {} });
      // @ts-ignore
      connector.request = mockRequest;
      await connector.runApi(
        { body: JSON.stringify({ messages: [] }) },
        new ConnectorUsageCollector({ logger, connectorId: 'test' })
      );
      const callArgs = mockRequest.mock.calls[0][0];
      expect(callArgs.headers['OpenAI-Organization']).toBe('org-id');
      expect(callArgs.headers['OpenAI-Project']).toBe('proj-id');
    });
  });

  describe('Enhanced error handling', () => {
    const connector = new OpenAIConnector({
      configurationUtilities: actionsConfigMock.create(),
      connector: { id: '1', type: OPENAI_CONNECTOR_ID },
      config: {
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        apiProvider: OpenAiProviderType.OpenAi,
        defaultModel: DEFAULT_OPENAI_MODEL,
        headers: {},
      },
      secrets: { apiKey: '123' },
      logger: loggingSystemMock.createLogger(),
      services: actionsMock.createServices(),
    });
    it('returns Azure function error message', () => {
      const err = { message: '404 Unrecognized request argument supplied: functions' };
      // @ts-ignore
      expect(connector.getResponseErrorMessage(err)).toContain(
        'Function support with Azure OpenAI API was added'
      );
    });
    it('returns LM Studio error message', () => {
      const err = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: { error: 'LM Studio error' },
        },
      };
      // @ts-ignore
      expect(connector.getResponseErrorMessage(err)).toContain('LM Studio error');
    });
    it('returns Unauthorized error message', () => {
      const err = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: { error: { message: 'Invalid key' } },
        },
      };
      // @ts-ignore
      expect(connector.getResponseErrorMessage(err)).toContain('Unauthorized API Error');
    });
  });
});

function createStreamMock() {
  const transform: Transform = new Transform({});

  return {
    write: (data: string) => {
      transform.push(data);
    },
    fail: () => {
      transform.emit('error', new Error('Stream failed'));
      transform.end();
    },
    transform,
    complete: () => {
      transform.end();
    },
  };
}
