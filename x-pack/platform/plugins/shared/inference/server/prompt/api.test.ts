/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, isObservable, firstValueFrom, toArray } from 'rxjs';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core/server/mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { createRegexWorkerServiceMock } from '../test_utils';
import {
  MessageRole,
  type PromptAPI,
  type PromptOptions,
  getConnectorFamily,
  getConnectorProvider,
  getConnectorModel,
  createPrompt,
  Message,
  ChatCompletionEventType,
} from '@kbn/inference-common';
import { z } from '@kbn/zod';

import {
  ChatCompleteApiWithCallback,
  ChatCompleteApiWithCallbackCallback,
  createChatCompleteCallbackApi,
} from '../chat_complete/callback_api';
import { promptToMessageOptions } from '../../common/prompt/prompt_to_message_options';
import { createPromptApi } from './api';
import { createInferenceExecutorMock, createInferenceConnectorMock } from '../test_utils';

jest.mock('../chat_complete/callback_api');
jest.mock('../../common/prompt/prompt_to_message_options', () => {
  const actual = jest.requireActual<typeof import('../../common/prompt/prompt_to_message_options')>(
    '../../common/prompt/prompt_to_message_options'
  );
  return {
    __esModule: true,
    ...actual,
    promptToMessageOptions: jest.fn(actual.promptToMessageOptions),
  };
});
const mockEsClient = {
  ml: {
    inferTrainedModel: jest.fn(),
  },
} as any;

const mockCreateChatCompleteCallbackApi = jest.mocked(createChatCompleteCallbackApi);
const mockPromptToMessageOptions = jest.mocked(promptToMessageOptions);

const mockPrompt = createPrompt({
  name: 'test-prompt',
  description: 'My test prompt',
  input: z.object({ query: z.string() }),
})
  .version({
    template: { mustache: { template: 'Hello {{query}}' } },
  })
  .get();

describe('createPromptApi', () => {
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let logger: MockedLogger;
  let actions: ReturnType<typeof actionsMock.createStart>;
  let promptApi: PromptAPI;
  let mockCallbackApi: jest.MockedFn<ChatCompleteApiWithCallback>;
  let regexWorker: ReturnType<typeof createRegexWorkerServiceMock>;

  const mockInput = { query: 'world' };

  beforeEach(() => {
    request = httpServerMock.createKibanaRequest();
    logger = loggerMock.create();
    actions = actionsMock.createStart();
    regexWorker = createRegexWorkerServiceMock();

    mockCallbackApi = jest.fn();
    mockCreateChatCompleteCallbackApi.mockReturnValue(mockCallbackApi);

    promptApi = createPromptApi({
      request,
      actions,
      logger,
      anonymizationRulesPromise: Promise.resolve([]),
      regexWorker,
      esClient: mockEsClient,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('initializes createChatCompleteCallbackApi with correct options', () => {
    expect(mockCreateChatCompleteCallbackApi).toHaveBeenCalledWith({
      request,
      actions,
      logger,
      anonymizationRulesPromise: Promise.resolve([]),
      regexWorker,
      esClient: mockEsClient,
    });
  });

  it('calls the callback API with correct initial options', async () => {
    const promptOptions: PromptOptions = {
      prompt: mockPrompt,
      input: mockInput,
      connectorId: 'test-connector',
      stream: false,
    };
    await promptApi(promptOptions);

    expect(mockCallbackApi).toHaveBeenCalledWith(
      expect.objectContaining({
        connectorId: 'test-connector',
        stream: false,
      }),
      expect.any(Function)
    );
  });

  it('calls promptToMessageOptions with correct arguments derived from connector', async () => {
    const mockConnector = createInferenceConnectorMock({
      connectorId: 'test-connector-openai',
      type: 'openai' as any, // Using 'as any' if InferenceConnectorType.OpenAI is not directly available or for simplicity
      name: 'My OpenAI Connector',
      config: { model_id: 'gpt-4o-test' },
    });
    const mockExecutor = createInferenceExecutorMock({ connector: mockConnector });

    // Let the actual callback function execute with our mockExecutor
    mockCallbackApi.mockImplementationOnce((_opts, cb) => {
      cb(mockExecutor);
      return Promise.resolve({ content: '', toolCalls: [] });
    });

    const promptOptions: PromptOptions = {
      prompt: mockPrompt,
      input: mockInput,
      connectorId: 'test-connector-openai', // Ensure this matches the mockConnector
    };

    await promptApi(promptOptions);

    // Assert that promptToMessageOptions is called with the prompt, input,
    // and the family, provider, id derived from mockConnector
    expect(mockPromptToMessageOptions).toHaveBeenCalledWith(mockPrompt, mockInput, {
      family: getConnectorFamily(mockConnector), // Use actual function
      provider: getConnectorProvider(mockConnector), // Use actual function
      id: getConnectorModel(mockConnector), // Use actual function
    });
  });

  it('constructs messages correctly, including prevMessages', async () => {
    const mockExecutor = createInferenceExecutorMock({});
    let callbackFn: any;
    mockCallbackApi.mockImplementationOnce((_opts, callback) => {
      callbackFn = callback;
      return Promise.resolve({ content: 'response', toolCalls: [] });
    });

    const prevMessages: Message[] = [{ role: MessageRole.Assistant, content: 'Previous message' }];
    const promptOptions: PromptOptions<typeof mockPrompt> = {
      prompt: mockPrompt,
      input: mockInput,
      connectorId: 'test-connector',
      prevMessages,
    };

    await promptApi(promptOptions);
    const resultOptions = callbackFn(mockExecutor);

    expect(resultOptions.messages).toEqual([
      { role: MessageRole.User, content: 'Hello world' },
      { role: MessageRole.Assistant, content: 'Previous message' },
    ]);
  });

  it('generates correct metadata', async () => {
    const mockExecutor = createInferenceExecutorMock({});
    let callbackFn: ChatCompleteApiWithCallbackCallback | undefined;

    mockCallbackApi.mockImplementationOnce((_opts, callback) => {
      callbackFn = callback;
      return Promise.resolve({ content: 'response', toolCalls: [] });
    });

    const promptOptions: PromptOptions = {
      prompt: mockPrompt,
      input: mockInput,
      connectorId: 'test-connector',
      metadata: { attributes: { foo: 'bar' } },
    };

    await promptApi(promptOptions);
    const resultOptions = callbackFn!(mockExecutor);

    expect(resultOptions.metadata).toEqual({
      attributes: {
        foo: 'bar',
        'gen_ai.prompt.id': 'test-prompt',
        'gen_ai.prompt.template.template': 'Hello {{query}}',
        'gen_ai.prompt.template.variables': JSON.stringify(mockInput),
      },
    });
  });

  it('handles non-streaming (Promise) response', async () => {
    const promptOptions: PromptOptions = {
      prompt: mockPrompt,
      input: mockInput,
      connectorId: 'test-connector',
      stream: false,
    };

    mockCallbackApi.mockResolvedValueOnce({ content: 'response', toolCalls: [] });

    const response = promptApi(promptOptions);
    expect(response).toBeInstanceOf(Promise);
    await expect(response).resolves.toEqual({ content: 'response', toolCalls: [] });
  });

  it('handles streaming (Observable) response', async () => {
    mockCallbackApi.mockReturnValue(
      of(
        {
          type: ChatCompletionEventType.ChatCompletionChunk as const,
          content: 'chunk1',
          tool_calls: [],
        },
        {
          type: ChatCompletionEventType.ChatCompletionChunk as const,
          content: 'chunk2',
          tool_calls: [],
        }
      )
    );

    const promptOptions = {
      prompt: mockPrompt,
      input: mockInput,
      connectorId: 'test-connector',
      stream: true as const,
    };

    const response$ = promptApi(promptOptions);
    expect(isObservable(response$)).toBe(true);

    const events = await firstValueFrom(response$.pipe(toArray()));
    expect(events).toEqual([
      { type: ChatCompletionEventType.ChatCompletionChunk, content: 'chunk1', tool_calls: [] },
      { type: ChatCompletionEventType.ChatCompletionChunk, content: 'chunk2', tool_calls: [] },
    ]);
  });

  it('passes through other options like temperature', async () => {
    const mockExecutor = createInferenceExecutorMock({});
    let callbackFn: any;
    mockCallbackApi.mockImplementationOnce((_opts, callback) => {
      callbackFn = callback;
      return Promise.resolve({ content: 'response', toolCalls: [] });
    });

    const promptOptions: PromptOptions = {
      prompt: mockPrompt,
      input: mockInput,
      connectorId: 'test-connector',
      temperature: 0.5,
    };

    await promptApi(promptOptions);
    const resultOptions = callbackFn(mockExecutor);

    expect(resultOptions.temperature).toBe(0.5);
  });
});
