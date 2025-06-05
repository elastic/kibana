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
import {
  MessageRole,
  type PromptAPI,
  type PromptOptions,
  getConnectorFamily,
  getConnectorProvider,
  getConnectorModel,
  createPrompt,
  Message,
} from '@kbn/inference-common';
import { z } from '@kbn/zod';

import { createChatCompleteCallbackApi } from '../chat_complete/callback_api';
import { promptToMessageOptions } from '../../common/prompt/prompt_to_message_options';
import { createPromptApi } from './api';
import { createInferenceExecutorMock, createInferenceConnectorMock } from '../test_utils';

// Mock dependencies
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
jest.mock('@kbn/inference-common', () => {
  const originalModule = jest.requireActual('@kbn/inference-common');
  return {
    ...originalModule,
    // We will use the actual implementations of these, so no need to mock them here
    // getConnectorFamily: jest.fn(),
    // getConnectorProvider: jest.fn(),
    // getConnectorModel: jest.fn(),
  };
});

const mockCreateChatCompleteCallbackApi = jest.mocked(createChatCompleteCallbackApi);
const mockPromptToMessageOptions = jest.mocked(promptToMessageOptions); // Still need to assert it's called

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
  let mockCallbackApi: jest.Mock;

  const mockInput = { query: 'world' };

  beforeEach(() => {
    request = httpServerMock.createKibanaRequest();
    logger = loggerMock.create();
    actions = actionsMock.createStart();

    mockCallbackApi = jest.fn().mockReturnValue(Promise.resolve({ content: 'response' }));
    mockCreateChatCompleteCallbackApi.mockReturnValue(mockCallbackApi as any);

    // No longer mocking getConnectorFamily, getConnectorProvider, getConnectorModel directly
    promptApi = createPromptApi({ request, actions, logger });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('initializes createChatCompleteCallbackApi with correct options', () => {
    expect(mockCreateChatCompleteCallbackApi).toHaveBeenCalledWith({ request, actions, logger });
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
    mockCallbackApi.mockImplementationOnce((_opts, callback) => callback(mockExecutor));

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
      return Promise.resolve({ content: 'response' });
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
    let callbackFn: any;
    mockCallbackApi.mockImplementationOnce((_opts, callback) => {
      callbackFn = callback;
      return Promise.resolve({ content: 'response' });
    });

    const promptOptions: PromptOptions = {
      prompt: mockPrompt,
      input: mockInput,
      connectorId: 'test-connector',
      metadata: { attributes: { foo: 'bar' } },
    };

    await promptApi(promptOptions);
    const resultOptions = callbackFn(mockExecutor);

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

    const response = promptApi(promptOptions);
    expect(response).toBeInstanceOf(Promise);
    await expect(response).resolves.toEqual({ content: 'response' });
  });

  it('handles streaming (Observable) response', async () => {
    mockCallbackApi.mockReturnValue(of({ content: 'chunk1' }, { content: 'chunk2' }));

    const promptOptions = {
      prompt: mockPrompt,
      input: mockInput,
      connectorId: 'test-connector',
      stream: true as const,
    };

    const response$ = promptApi(promptOptions);
    expect(isObservable(response$)).toBe(true);

    const events = await firstValueFrom(response$.pipe(toArray()));
    expect(events).toEqual([{ content: 'chunk1' }, { content: 'chunk2' }]);
  });

  it('passes through other options like temperature', async () => {
    const mockExecutor = createInferenceExecutorMock({});
    let callbackFn: any;
    mockCallbackApi.mockImplementationOnce((_opts, callback) => {
      callbackFn = callback;
      return Promise.resolve({ content: 'response' });
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
