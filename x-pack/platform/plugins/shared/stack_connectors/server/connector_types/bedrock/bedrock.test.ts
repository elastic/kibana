/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import aws from 'aws4';
import { PassThrough, Transform } from 'stream';
import { BedrockConnector } from './bedrock';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import {
  CONNECTOR_ID,
  DEFAULT_MODEL,
  DEFAULT_URL,
  DEFAULT_TOKEN_LIMIT,
  DEFAULT_TIMEOUT_MS,
  RunActionResponseSchema,
  RunApiLatestResponseSchema,
  StreamingResponseSchema,
  ConverseResponseSchema,
} from '@kbn/connector-schemas/bedrock';
import { DEFAULT_BODY } from '../../../public/connector_types/bedrock/constants';
import { initDashboard } from '../lib/gen_ai/create_gen_ai_dashboard';
import type { AxiosError } from 'axios';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
jest.mock('../lib/gen_ai/create_gen_ai_dashboard');

// @ts-ignore
const mockSigner = jest.spyOn(aws, 'sign').mockReturnValue({ signed: true });
const mockSend = jest.fn();
const encodedModel = encodeURIComponent(DEFAULT_MODEL);

const DEFAULT_MESSAGES = [
  {
    role: 'user',
    content: 'Hello world',
  },
];

const DEFAULT_SYSTEM_MESSAGE = {
  role: 'system',
  content: 'Be a good chatbot',
};

const DEFAULT_ASSISTANT_MESSAGE = {
  role: 'assistant',
  content: 'Hi, I am a good chatbot',
};

const DEFAULT_USER_FOLLOWUP = {
  role: 'user',
  content: 'What is 2+2?',
};

const DEFAULT_PAYLOAD = {
  messages: DEFAULT_MESSAGES,
  stopSequences: ['\n\nHuman:'],
};

const DEFAULT_CONVERSE_REQUEST_PAYLOAD = {
  messages: DEFAULT_MESSAGES,
  inferenceConfig: { stopSequences: ['\n\nHuman:'] },
  toolConfig: {},
  modelId: DEFAULT_MODEL,
};

const DEFAULT_CONVERSE_STREAM_REQUEST_PAYLOAD = {
  messages: DEFAULT_MESSAGES,
  inferenceConfig: { stopSequences: ['\n\nHuman:'] },
  toolConfig: {},
  modelId: DEFAULT_MODEL,
};

describe('BedrockConnector', () => {
  let mockRequest: jest.Mock;
  let mockError: jest.Mock;
  const mockResponseString = 'Hello! How can I assist you today?';
  const claude2Response = {
    completion: mockResponseString,
    stop_reason: 'stop_sequence',
  };
  const logger = loggingSystemMock.createLogger();

  const claude3Response = {
    id: 'compl_01E7D3vTBHdNdKWCe6zALmLH',
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: mockResponseString,
      },
    ],
    model: 'claude-2.1',
    stop_reason: 'stop_sequence',
    stop_sequence: null,
    usage: { input_tokens: 41, output_tokens: 64 },
  };
  const mockResponse = {
    headers: {},
    data: claude3Response,
  };
  let connectorUsageCollector: ConnectorUsageCollector;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = jest.fn().mockResolvedValue(mockResponse);
    mockError = jest.fn().mockImplementation(() => {
      throw new Error('API Error');
    });
    connectorUsageCollector = new ConnectorUsageCollector({
      logger,
      connectorId: 'test-connector-id',
    });
  });

  const connector = new BedrockConnector({
    configurationUtilities: actionsConfigMock.create(),
    connector: { id: '1', type: CONNECTOR_ID },
    config: {
      apiUrl: DEFAULT_URL,
      defaultModel: DEFAULT_MODEL,
    },
    secrets: { accessKey: '123', secret: 'secret' },
    logger,
    services: actionsMock.createServices(),
  });

  describe('Bedrock', () => {
    beforeEach(() => {
      // @ts-ignore
      connector.request = mockRequest;
      // @ts-ignore
      connector.bedrockClient.send = mockSend;
    });

    describe('runApi', () => {
      it('the aws signature has non-streaming headers', async () => {
        await connector.runApi(
          { body: DEFAULT_BODY },
          new ConnectorUsageCollector({
            logger,
            connectorId: 'test-connector-id',
          })
        );
        expect(mockSigner).toHaveBeenCalledWith(
          {
            body: DEFAULT_BODY,
            headers: {
              Accept: '*/*',
              'Content-Type': 'application/json',
            },
            host: 'bedrock-runtime.us-east-1.amazonaws.com',
            path: `/model/${encodedModel}/invoke`,
            service: 'bedrock',
          },
          { accessKeyId: '123', secretAccessKey: 'secret' }
        );
      });
      it('the Bedrock API call is successful with Claude 3 parameters; returns the response formatted for Claude 2 along with usage object', async () => {
        const response = await connector.runApi({ body: DEFAULT_BODY }, connectorUsageCollector);
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            signed: true,
            timeout: DEFAULT_TIMEOUT_MS,
            url: `${DEFAULT_URL}/model/${encodedModel}/invoke`,
            method: 'post',
            responseSchema: RunApiLatestResponseSchema,
            data: DEFAULT_BODY,
          },
          connectorUsageCollector
        );
        expect(response).toEqual({
          ...claude2Response,
          usage: claude3Response.usage,
        });
      });
      it('the Bedrock API call is successful with Claude 2 parameters; returns the response formatted for Claude 2 along with no usage object', async () => {
        const v2Body = JSON.stringify({
          prompt: `\n\nHuman: Hello world! \n\nAssistant:`,
          max_tokens_to_sample: DEFAULT_TOKEN_LIMIT,
          stop_sequences: [`\n\nHuman:`],
        });
        mockRequest = jest.fn().mockResolvedValue({
          headers: {},
          data: claude2Response,
        });
        // @ts-ignore
        connector.request = mockRequest;
        const response = await connector.runApi({ body: v2Body }, connectorUsageCollector);
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            signed: true,
            timeout: DEFAULT_TIMEOUT_MS,
            url: `${DEFAULT_URL}/model/${encodedModel}/invoke`,
            method: 'post',
            responseSchema: RunActionResponseSchema,
            data: v2Body,
          },
          connectorUsageCollector
        );
        expect(response).toEqual(claude2Response);
      });

      it('errors during API calls are properly handled', async () => {
        // @ts-ignore
        connector.request = mockError;

        await expect(
          connector.runApi(
            { body: DEFAULT_BODY },
            new ConnectorUsageCollector({
              logger,
              connectorId: 'test-connector-id',
            })
          )
        ).rejects.toThrow('API Error');
      });
    });

    describe('invokeStream', () => {
      let stream;
      beforeEach(() => {
        stream = createStreamMock();
        stream.write(new Uint8Array([1, 2, 3]));
        mockRequest = jest.fn().mockResolvedValue({ ...mockResponse, data: stream.transform });
        // @ts-ignore
        connector.request = mockRequest;
      });

      const aiAssistantBody = {
        messages: [
          {
            role: 'user',
            content: 'Hello world',
          },
        ],
        stopSequences: ['\n\nHuman:'],
      };

      it('the aws signature has streaming headers', async () => {
        await connector.invokeStream(aiAssistantBody, connectorUsageCollector);

        expect(mockSigner).toHaveBeenCalledWith(
          {
            body: JSON.stringify({ ...JSON.parse(DEFAULT_BODY), temperature: 0 }),
            headers: {
              accept: 'application/vnd.amazon.eventstream',
              'Content-Type': 'application/json',
              'x-amzn-bedrock-accept': '*/*',
            },
            host: 'bedrock-runtime.us-east-1.amazonaws.com',
            path: `/model/${encodedModel}/invoke-with-response-stream`,
            service: 'bedrock',
          },
          { accessKeyId: '123', secretAccessKey: 'secret' }
        );
      });

      it('the API call is successful with correct request parameters', async () => {
        await connector.invokeStream(aiAssistantBody, connectorUsageCollector);
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            signed: true,
            url: `${DEFAULT_URL}/model/${encodedModel}/invoke-with-response-stream`,
            method: 'post',
            responseSchema: StreamingResponseSchema,
            responseType: 'stream',
            data: JSON.stringify({ ...JSON.parse(DEFAULT_BODY), temperature: 0 }),
          },
          connectorUsageCollector
        );
      });

      it('signal and timeout is properly passed to streamApi', async () => {
        const signal = jest.fn();
        const timeout = 180000;
        await connector.invokeStream(
          { ...aiAssistantBody, timeout, signal },
          connectorUsageCollector
        );

        expect(mockRequest).toHaveBeenCalledWith(
          {
            signed: true,
            url: `${DEFAULT_URL}/model/${encodedModel}/invoke-with-response-stream`,
            method: 'post',
            responseSchema: StreamingResponseSchema,
            responseType: 'stream',
            data: JSON.stringify({ ...JSON.parse(DEFAULT_BODY), temperature: 0 }),
            timeout,
            signal,
          },
          connectorUsageCollector
        );
      });

      it('ensureMessageFormat - formats messages from user, assistant, and system', async () => {
        await connector.invokeStream(
          {
            messages: [
              {
                role: 'system',
                content: 'Be a good chatbot',
              },
              {
                role: 'user',
                content: 'Hello world',
              },
              {
                role: 'assistant',
                content: 'Hi, I am a good chatbot',
              },
              {
                role: 'user',
                content: 'What is 2+2?',
              },
            ],
          },
          connectorUsageCollector
        );
        expect(mockRequest).toHaveBeenCalledWith(
          {
            signed: true,
            responseType: 'stream',
            url: `${DEFAULT_URL}/model/${encodedModel}/invoke-with-response-stream`,
            method: 'post',
            responseSchema: StreamingResponseSchema,
            data: JSON.stringify({
              anthropic_version: 'bedrock-2023-05-31',
              system: 'Be a good chatbot',
              messages: [
                { content: 'Hello world', role: 'user' },
                { content: 'Hi, I am a good chatbot', role: 'assistant' },
                { content: 'What is 2+2?', role: 'user' },
              ],
              max_tokens: DEFAULT_TOKEN_LIMIT,
              temperature: 0,
            }),
          },
          connectorUsageCollector
        );
      });

      it('ensureMessageFormat - formats messages from when double user/assistant occurs', async () => {
        await connector.invokeStream(
          {
            messages: [
              {
                role: 'system',
                content: 'Be a good chatbot',
              },
              {
                role: 'assistant',
                content: 'Hi, I am a good chatbot',
              },
              {
                role: 'assistant',
                content: 'But I can be naughty',
              },
              {
                role: 'user',
                content: 'What is 2+2?',
              },
              {
                role: 'user',
                content: 'I can be naughty too',
              },
              {
                role: 'system',
                content: 'This is extra tricky',
              },
            ],
          },
          connectorUsageCollector
        );
        expect(mockRequest).toHaveBeenCalledWith(
          {
            signed: true,
            responseType: 'stream',
            url: `${DEFAULT_URL}/model/${encodedModel}/invoke-with-response-stream`,
            method: 'post',
            responseSchema: StreamingResponseSchema,
            data: JSON.stringify({
              anthropic_version: 'bedrock-2023-05-31',
              system: 'Be a good chatbot\nThis is extra tricky',
              messages: [
                { content: 'Hi, I am a good chatbot\nBut I can be naughty', role: 'assistant' },
                { content: 'What is 2+2?\nI can be naughty too', role: 'user' },
              ],
              max_tokens: DEFAULT_TOKEN_LIMIT,
              temperature: 0,
            }),
          },
          connectorUsageCollector
        );
      });

      it('formats the system message as a user message for claude<2.1', async () => {
        const modelOverride = 'anthropic.claude-v2';

        await connector.invokeStream(
          {
            messages: [
              {
                role: 'system',
                content: 'Be a good chatbot',
              },
              {
                role: 'user',
                content: 'Hello world',
              },
              {
                role: 'assistant',
                content: 'Hi, I am a good chatbot',
              },
              {
                role: 'user',
                content: 'What is 2+2?',
              },
            ],
            model: modelOverride,
          },
          connectorUsageCollector
        );
        expect(mockRequest).toHaveBeenCalledWith(
          {
            signed: true,
            responseType: 'stream',
            url: `${DEFAULT_URL}/model/${modelOverride}/invoke-with-response-stream`,
            method: 'post',
            responseSchema: StreamingResponseSchema,
            data: JSON.stringify({
              anthropic_version: 'bedrock-2023-05-31',
              system: 'Be a good chatbot',
              messages: [
                { content: 'Hello world', role: 'user' },
                { content: 'Hi, I am a good chatbot', role: 'assistant' },
                { content: 'What is 2+2?', role: 'user' },
              ],
              max_tokens: DEFAULT_TOKEN_LIMIT,
              temperature: 0,
            }),
          },
          connectorUsageCollector
        );
      });

      it('responds with a readable stream', async () => {
        const response = await connector.invokeStream(aiAssistantBody, connectorUsageCollector);
        expect(response instanceof PassThrough).toEqual(true);
      });

      it('errors during API calls are properly handled', async () => {
        // @ts-ignore
        connector.request = mockError;

        await expect(
          connector.invokeStream(aiAssistantBody, connectorUsageCollector)
        ).rejects.toThrow('API Error');
      });
    });

    describe('invokeAI', () => {
      const aiAssistantBody = {
        messages: [
          {
            role: 'user',
            content: 'Hello world',
          },
        ],
        stopSequences: ['\n\nHuman:'],
      };

      it('the API call is successful with correct parameters', async () => {
        const response = await connector.invokeAI(aiAssistantBody, connectorUsageCollector);
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            signed: true,
            timeout: DEFAULT_TIMEOUT_MS,
            url: `${DEFAULT_URL}/model/${encodedModel}/invoke`,
            method: 'post',
            responseSchema: RunApiLatestResponseSchema,
            data: JSON.stringify({
              ...JSON.parse(DEFAULT_BODY),
              messages: [{ content: 'Hello world', role: 'user' }],
              max_tokens: DEFAULT_TOKEN_LIMIT,
              temperature: 0,
            }),
          },
          connectorUsageCollector
        );
        expect(response.message).toEqual(mockResponseString);
      });

      it('formats messages from user, assistant, and system', async () => {
        const response = await connector.invokeAI(
          {
            messages: [
              {
                role: 'system',
                content: 'Be a good chatbot',
              },
              {
                role: 'user',
                content: 'Hello world',
              },
              {
                role: 'assistant',
                content: 'Hi, I am a good chatbot',
              },
              {
                role: 'user',
                content: 'What is 2+2?',
              },
            ],
          },
          connectorUsageCollector
        );
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            signed: true,
            timeout: DEFAULT_TIMEOUT_MS,
            url: `${DEFAULT_URL}/model/${encodedModel}/invoke`,
            method: 'post',
            responseSchema: RunApiLatestResponseSchema,
            data: JSON.stringify({
              anthropic_version: 'bedrock-2023-05-31',
              system: 'Be a good chatbot',
              messages: [
                { content: 'Hello world', role: 'user' },
                { content: 'Hi, I am a good chatbot', role: 'assistant' },
                { content: 'What is 2+2?', role: 'user' },
              ],
              max_tokens: DEFAULT_TOKEN_LIMIT,
              temperature: 0,
            }),
          },
          connectorUsageCollector
        );
        expect(response.message).toEqual(mockResponseString);
      });

      it('adds system message from argument', async () => {
        const response = await connector.invokeAI(
          {
            messages: [
              {
                role: 'user',
                content: 'Hello world',
              },
              {
                role: 'assistant',
                content: 'Hi, I am a good chatbot',
              },
              {
                role: 'user',
                content: 'What is 2+2?',
              },
            ],
            system: 'This is a system message',
          },
          connectorUsageCollector
        );
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            signed: true,
            timeout: DEFAULT_TIMEOUT_MS,
            url: `${DEFAULT_URL}/model/${encodedModel}/invoke`,
            method: 'post',
            responseSchema: RunApiLatestResponseSchema,
            data: JSON.stringify({
              anthropic_version: 'bedrock-2023-05-31',
              system: 'This is a system message',
              messages: [
                { content: 'Hello world', role: 'user' },
                { content: 'Hi, I am a good chatbot', role: 'assistant' },
                { content: 'What is 2+2?', role: 'user' },
              ],
              max_tokens: DEFAULT_TOKEN_LIMIT,
              temperature: 0,
            }),
          },
          connectorUsageCollector
        );
        expect(response.message).toEqual(mockResponseString);
      });

      it('combines argument system message with conversation system message', async () => {
        const response = await connector.invokeAI(
          {
            messages: [
              {
                role: 'system',
                content: 'Be a good chatbot',
              },
              {
                role: 'user',
                content: 'Hello world',
              },
              {
                role: 'assistant',
                content: 'Hi, I am a good chatbot',
              },
              {
                role: 'user',
                content: 'What is 2+2?',
              },
            ],
            system: 'This is a system message',
          },
          connectorUsageCollector
        );
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            signed: true,
            timeout: DEFAULT_TIMEOUT_MS,
            url: `${DEFAULT_URL}/model/${encodedModel}/invoke`,
            method: 'post',
            responseSchema: RunApiLatestResponseSchema,
            data: JSON.stringify({
              anthropic_version: 'bedrock-2023-05-31',
              system: 'This is a system message\nBe a good chatbot',
              messages: [
                { content: 'Hello world', role: 'user' },
                { content: 'Hi, I am a good chatbot', role: 'assistant' },
                { content: 'What is 2+2?', role: 'user' },
              ],
              max_tokens: DEFAULT_TOKEN_LIMIT,
              temperature: 0,
            }),
          },
          connectorUsageCollector
        );
        expect(response.message).toEqual(mockResponseString);
      });
      it('signal and timeout is properly passed to runApi', async () => {
        const signal = jest.fn();
        const timeout = 180000;
        await connector.invokeAI({ ...aiAssistantBody, timeout, signal }, connectorUsageCollector);

        expect(mockRequest).toHaveBeenCalledWith(
          {
            signed: true,
            url: `${DEFAULT_URL}/model/${encodedModel}/invoke`,
            method: 'post',
            responseSchema: RunApiLatestResponseSchema,
            data: JSON.stringify({
              ...JSON.parse(DEFAULT_BODY),
              messages: [{ content: 'Hello world', role: 'user' }],
              max_tokens: DEFAULT_TOKEN_LIMIT,
              temperature: 0,
            }),
            timeout,
            signal,
          },
          connectorUsageCollector
        );
      });
      it('errors during API calls are properly handled', async () => {
        // @ts-ignore
        connector.request = mockError;

        await expect(connector.invokeAI(aiAssistantBody, connectorUsageCollector)).rejects.toThrow(
          'API Error'
        );
      });
    });

    describe('bedrockClientSend', () => {
      it('should send the command and return the response', async () => {
        const command = { input: 'test' };
        const response = { result: 'success' };
        mockSend.mockResolvedValue(response);

        const result = await connector.bedrockClientSend(
          { signal: undefined, command },
          connectorUsageCollector
        );

        expect(mockSend).toHaveBeenCalledWith(command, { abortSignal: undefined });
        expect(result).toEqual(response);
      });

      it('should handle and split streaming response', async () => {
        const command = { input: 'test' };
        const stream = new PassThrough();
        const response = { stream };
        mockSend.mockResolvedValue(response);

        const result = (await connector.bedrockClientSend(
          { signal: undefined, command },
          connectorUsageCollector
        )) as unknown as {
          stream?: unknown;
          tokenStream?: unknown;
        };

        expect(mockSend).toHaveBeenCalledWith(command, { abortSignal: undefined });
        expect(result.stream).toBeDefined();
        expect(result.tokenStream).toBeDefined();
      });

      it('should handle non-streaming response', async () => {
        const command = { input: 'test' };
        const usage = { stats: 0 };
        const response = { usage };
        mockSend.mockResolvedValue(response);

        const result = (await connector.bedrockClientSend(
          { signal: undefined, command },
          connectorUsageCollector
        )) as unknown as {
          usage?: unknown;
        };
        expect(result.usage).toBeDefined();
      });

      it('should set modelId to connector.model if input.modelId is preconfigured', async () => {
        const preconfiguredCommand = { input: { modelId: 'preconfigured' } };
        const response = { some: 'response' };
        mockSend.mockResolvedValue(response);

        await connector.bedrockClientSend(
          { signal: undefined, command: preconfiguredCommand },
          connectorUsageCollector
        );
        expect(preconfiguredCommand.input.modelId).toBe(DEFAULT_MODEL);
      });
    });

    describe('converse', () => {
      const aiAssistantBody = DEFAULT_PAYLOAD;

      const converseResponse = {
        output: {
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: mockResponseString }],
          },
        },
        stopReason: 'end_turn',
        usage: { inputTokens: 41, outputTokens: 64 },
      };

      beforeEach(() => {
        mockRequest = jest.fn().mockResolvedValue({ headers: {}, data: converseResponse });
        // @ts-ignore
        connector.request = mockRequest;
      });

      it('the API call is successful with correct parameters', async () => {
        const response = await connector.converse(aiAssistantBody, connectorUsageCollector);
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            signed: true,
            timeout: DEFAULT_TIMEOUT_MS,
            url: `${DEFAULT_URL}/model/${encodedModel}/converse`,
            method: 'post',
            responseSchema: ConverseResponseSchema,
            data: JSON.stringify(DEFAULT_CONVERSE_REQUEST_PAYLOAD),
          },
          connectorUsageCollector
        );
        // @ts-expect-error shape is complex and linter forbid to use 'as any'
        expect(response.output.message!.content[0].text).toEqual(mockResponseString);
      });

      it('formats messages from user, assistant, and system', async () => {
        const response = await connector.converse(
          {
            messages: [
              DEFAULT_SYSTEM_MESSAGE,
              ...DEFAULT_MESSAGES,
              DEFAULT_ASSISTANT_MESSAGE,
              DEFAULT_USER_FOLLOWUP,
            ],
          },
          connectorUsageCollector
        );
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            signed: true,
            timeout: DEFAULT_TIMEOUT_MS,
            url: `${DEFAULT_URL}/model/${encodedModel}/converse`,
            method: 'post',
            responseSchema: ConverseResponseSchema,
            data: JSON.stringify({
              ...DEFAULT_CONVERSE_REQUEST_PAYLOAD,
              messages: [
                DEFAULT_SYSTEM_MESSAGE,
                ...DEFAULT_MESSAGES,
                DEFAULT_ASSISTANT_MESSAGE,
                DEFAULT_USER_FOLLOWUP,
              ],
              inferenceConfig: {},
            }),
            signal: undefined,
          },
          connectorUsageCollector
        );
        // @ts-expect-error shape is complex and linter forbid to use 'as any'
        expect(response.output.message.content[0].text).toEqual(mockResponseString);
      });

      it('adds system message from argument', async () => {
        const response = await connector.converse(
          {
            messages: [
              {
                role: 'user',
                content: 'Hello world',
              },
              {
                role: 'assistant',
                content: 'Hi, I am a good chatbot',
              },
              {
                role: 'user',
                content: 'What is 2+2?',
              },
            ],
            system: [{ type: 'text', text: 'This is a system message' }],
          },
          connectorUsageCollector
        );
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            signed: true,
            timeout: DEFAULT_TIMEOUT_MS,
            url: `${DEFAULT_URL}/model/${encodedModel}/converse`,
            method: 'post',
            responseSchema: ConverseResponseSchema,
            data: JSON.stringify({
              messages: [
                {
                  role: 'user',
                  content: 'Hello world',
                },
                {
                  role: 'assistant',
                  content: 'Hi, I am a good chatbot',
                },
                {
                  role: 'user',
                  content: 'What is 2+2?',
                },
              ],
              inferenceConfig: {},
              toolConfig: {},
              system: [{ type: 'text', text: 'This is a system message' }],
              modelId: DEFAULT_MODEL,
            }),
            signal: undefined,
          },
          connectorUsageCollector
        );
        // @ts-expect-error shape is complex and linter forbid to use 'as any'
        expect(response.output.message.content[0].text).toEqual(mockResponseString);
      });

      it('combines argument system message with conversation system message', async () => {
        const response = await connector.converse(
          {
            messages: [
              {
                role: 'system',
                content: 'Be a good chatbot',
              },
              {
                role: 'user',
                content: 'Hello world',
              },
              {
                role: 'assistant',
                content: 'Hi, I am a good chatbot',
              },
              {
                role: 'user',
                content: 'What is 2+2?',
              },
            ],
            system: [{ type: 'text', text: 'This is a system message' }],
          },
          connectorUsageCollector
        );
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            signed: true,
            timeout: DEFAULT_TIMEOUT_MS,
            url: `${DEFAULT_URL}/model/${encodedModel}/converse`,
            method: 'post',
            responseSchema: ConverseResponseSchema,
            data: JSON.stringify({
              messages: [
                {
                  role: 'system',
                  content: 'Be a good chatbot',
                },
                {
                  role: 'user',
                  content: 'Hello world',
                },
                {
                  role: 'assistant',
                  content: 'Hi, I am a good chatbot',
                },
                {
                  role: 'user',
                  content: 'What is 2+2?',
                },
              ],
              inferenceConfig: {},
              toolConfig: {},
              system: [{ type: 'text', text: 'This is a system message' }],
              modelId: DEFAULT_MODEL,
            }),
            signal: undefined,
          },
          connectorUsageCollector
        );
        // @ts-expect-error shape is complex and linter forbid to use 'as any'
        expect(response.output.message.content[0].text).toEqual(mockResponseString);
      });
      it('signal and timeout is properly passed to runApi', async () => {
        const signal = jest.fn();
        const timeout = 180000;
        await connector.converse({ ...aiAssistantBody, timeout, signal }, connectorUsageCollector);

        expect(mockRequest).toHaveBeenCalledWith(
          {
            signed: true,
            url: `${DEFAULT_URL}/model/${encodedModel}/converse`,
            method: 'post',
            responseSchema: ConverseResponseSchema,
            data: JSON.stringify({
              messages: [{ role: 'user', content: 'Hello world' }],
              inferenceConfig: { stopSequences: ['\n\nHuman:'] },
              toolConfig: {},
              modelId: DEFAULT_MODEL,
            }),
            timeout,
            signal,
          },
          connectorUsageCollector
        );
      });
      it('errors during API calls are properly handled', async () => {
        // @ts-ignore
        connector.request = mockError;

        await expect(connector.converse(aiAssistantBody, connectorUsageCollector)).rejects.toThrow(
          'API Error'
        );
      });
    });

    describe('converseStream', () => {
      let stream;
      beforeEach(() => {
        stream = createStreamMock();
        stream.write(new Uint8Array([1, 2, 3]));
        mockRequest = jest.fn().mockResolvedValue({ ...mockResponse, data: stream.transform });
        // @ts-ignore
        connector.request = mockRequest;
      });

      const aiAssistantBody = DEFAULT_PAYLOAD;

      it('the aws signature has streaming headers', async () => {
        await connector.converseStream(aiAssistantBody, connectorUsageCollector);

        expect(mockSigner).toHaveBeenCalledWith(
          {
            body: JSON.stringify(DEFAULT_CONVERSE_STREAM_REQUEST_PAYLOAD),
            headers: {
              accept: 'application/vnd.amazon.eventstream',
              'Content-Type': 'application/json',
              'x-amzn-bedrock-accept': '*/*',
            },
            host: 'bedrock-runtime.us-east-1.amazonaws.com',
            path: `/model/${encodedModel}/converse-stream`,
            service: 'bedrock',
          },
          { accessKeyId: '123', secretAccessKey: 'secret' }
        );
      });

      it('the API call is successful with correct request parameters', async () => {
        await connector.converseStream(aiAssistantBody, connectorUsageCollector);
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(
          {
            signed: true,
            url: `${DEFAULT_URL}/model/${encodedModel}/converse-stream`,
            method: 'post',
            responseSchema: StreamingResponseSchema,
            responseType: 'stream',
            timeout: 200000,
            signal: undefined,
            data: JSON.stringify(DEFAULT_CONVERSE_STREAM_REQUEST_PAYLOAD),
          },
          connectorUsageCollector
        );
      });

      it('signal and timeout is properly passed to streamApi', async () => {
        const signal = jest.fn();
        const timeout = 180000;
        await connector.converseStream(
          { ...aiAssistantBody, timeout, signal },
          connectorUsageCollector
        );

        expect(mockRequest).toHaveBeenCalledWith(
          {
            signed: true,
            url: `${DEFAULT_URL}/model/${encodedModel}/converse-stream`,
            method: 'post',
            responseSchema: StreamingResponseSchema,
            responseType: 'stream',
            data: JSON.stringify({
              messages: [
                {
                  role: 'user',
                  content: 'Hello world',
                },
              ],
              inferenceConfig: {
                stopSequences: ['\n\nHuman:'],
              },
              toolConfig: {},
              modelId: DEFAULT_MODEL,
            }),
            timeout,
            signal,
          },
          connectorUsageCollector
        );
      });

      it('ensureMessageFormat - formats messages from user, assistant, and system', async () => {
        await connector.converseStream(
          {
            messages: [
              DEFAULT_SYSTEM_MESSAGE,
              ...DEFAULT_MESSAGES,
              DEFAULT_ASSISTANT_MESSAGE,
              DEFAULT_USER_FOLLOWUP,
            ],
          },
          connectorUsageCollector
        );
        expect(mockRequest).toHaveBeenCalledWith(
          {
            signed: true,
            responseType: 'stream',
            url: `${DEFAULT_URL}/model/${encodedModel}/converse-stream`,
            method: 'post',
            responseSchema: StreamingResponseSchema,
            signal: undefined,
            timeout: 200000,
            data: JSON.stringify({
              ...DEFAULT_CONVERSE_STREAM_REQUEST_PAYLOAD,
              messages: [
                DEFAULT_SYSTEM_MESSAGE,
                ...DEFAULT_MESSAGES,
                DEFAULT_ASSISTANT_MESSAGE,
                DEFAULT_USER_FOLLOWUP,
              ],
              inferenceConfig: {},
            }),
          },
          connectorUsageCollector
        );
      });

      it('ensureMessageFormat - formats messages from when double user/assistant occurs', async () => {
        const doubleAssistantMessage = {
          role: 'assistant',
          content: 'But I can be naughty',
        };
        const doubleUserMessage = {
          role: 'user',
          content: 'I can be naughty too',
        };
        const extraSystemMessage = {
          role: 'system',
          content: 'This is extra tricky',
        };

        await connector.converseStream(
          {
            messages: [
              DEFAULT_SYSTEM_MESSAGE,
              DEFAULT_ASSISTANT_MESSAGE,
              doubleAssistantMessage,
              DEFAULT_USER_FOLLOWUP,
              doubleUserMessage,
              extraSystemMessage,
            ],
          },
          connectorUsageCollector
        );
        expect(mockRequest).toHaveBeenCalledWith(
          {
            signed: true,
            responseType: 'stream',
            url: `${DEFAULT_URL}/model/${encodedModel}/converse-stream`,
            method: 'post',
            responseSchema: StreamingResponseSchema,
            signal: undefined,
            timeout: 200000,
            data: JSON.stringify({
              ...DEFAULT_CONVERSE_STREAM_REQUEST_PAYLOAD,
              messages: [
                DEFAULT_SYSTEM_MESSAGE,
                DEFAULT_ASSISTANT_MESSAGE,
                doubleAssistantMessage,
                DEFAULT_USER_FOLLOWUP,
                doubleUserMessage,
                extraSystemMessage,
              ],
              inferenceConfig: {},
            }),
          },
          connectorUsageCollector
        );
      });

      it('formats the system message as a user message for claude<2.1', async () => {
        const modelOverride = 'anthropic.claude-v2';

        await connector.converseStream(
          {
            messages: [
              DEFAULT_SYSTEM_MESSAGE,
              ...DEFAULT_MESSAGES,
              DEFAULT_ASSISTANT_MESSAGE,
              DEFAULT_USER_FOLLOWUP,
            ],
            model: modelOverride,
          },
          connectorUsageCollector
        );
        expect(mockRequest).toHaveBeenCalledWith(
          {
            signed: true,
            responseType: 'stream',
            url: `${DEFAULT_URL}/model/${modelOverride}/converse-stream`,
            method: 'post',
            responseSchema: StreamingResponseSchema,
            timeout: 200000,
            signal: undefined,
            data: JSON.stringify({
              ...DEFAULT_CONVERSE_STREAM_REQUEST_PAYLOAD,
              messages: [
                DEFAULT_SYSTEM_MESSAGE,
                ...DEFAULT_MESSAGES,
                DEFAULT_ASSISTANT_MESSAGE,
                DEFAULT_USER_FOLLOWUP,
              ],
              inferenceConfig: {},
              modelId: modelOverride,
            }),
          },
          connectorUsageCollector
        );
      });

      it('should handle and split streaming response', async () => {
        const result = (await connector.converseStream(
          aiAssistantBody,
          connectorUsageCollector
        )) as unknown as {
          stream?: unknown;
          tokenStream?: unknown;
        };
        expect(result.stream instanceof PassThrough).toEqual(true);
        expect(result.tokenStream instanceof PassThrough).toEqual(true);
      });

      it('errors during API calls are properly handled', async () => {
        // @ts-ignore
        connector.request = mockError;

        await expect(
          connector.converseStream(aiAssistantBody, connectorUsageCollector)
        ).rejects.toThrow('API Error');
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
              message: 'Resource not found',
            },
          },
        } as AxiosError<{ message?: string }>;
        expect(
          // @ts-expect-error expects an axios error as the parameter
          connector.getResponseErrorMessage(err)
        ).toEqual(`API Error: Resource Not Found - Resource not found`);
      });

      it('returns authorization error', () => {
        const err = {
          response: {
            headers: {},
            status: 401,
            statusText: 'Auth error',
            data: {
              message: 'The api key was invalid.',
            },
          },
        } as AxiosError<{ message?: string }>;

        // @ts-expect-error expects an axios error as the parameter
        expect(connector.getResponseErrorMessage(err)).toEqual(
          `Unauthorized API Error: The api key was invalid.`
        );
      });

      it('returns endpoint error', () => {
        const err = {
          response: {
            headers: {},
            status: 400,
            statusText: 'Bad Request',
            data: {
              message: 'The requested operation is not recognized by the service.',
            },
          },
        } as AxiosError<{ message?: string }>;

        // @ts-expect-error expects an axios error as the parameter
        expect(connector.getResponseErrorMessage(err)).toEqual(
          `API Error: The requested operation is not recognized by the service.

The Kibana Connector in use may need to be reconfigured with an updated Amazon Bedrock endpoint, like \`bedrock-runtime\`.`
        );
      });
    });
  });

  describe('Token dashboard', () => {
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
});

function createStreamMock() {
  const transform: Transform = new Transform({});

  return {
    write: (data: Uint8Array) => {
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
