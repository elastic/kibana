/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { InferenceConnectorType, type InferenceConnector } from '@kbn/inference-common';

jest.mock('../utils/resolve_connector_id', () => ({
  resolveConnectorId: jest.fn(),
}));

jest.mock('../../../../common/steps/ai', () => ({
  AiPromptStepCommonDefinition: {
    id: 'ai.prompt',
    inputSchema: {},
    outputSchema: {},
  },
}));

jest.mock('@kbn/workflows-extensions/server', () => ({
  createServerStepDefinition: jest.fn((definition) => definition),
}));

import { aiPromptStepDefinition } from './step';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';

type ContextManager = StepHandlerContext<any>['contextManager'];
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { InferenceWorkflowsStartDeps } from '../../../types';
import { resolveConnectorId } from '../utils/resolve_connector_id';

const mockResolveConnectorId = resolveConnectorId as jest.MockedFunction<typeof resolveConnectorId>;
const mockCreateServerStepDefinition = createServerStepDefinition as jest.MockedFunction<
  typeof createServerStepDefinition
>;

describe('aiPromptStepDefinition', () => {
  let mockCoreSetup: jest.Mocked<CoreSetup<InferenceWorkflowsStartDeps>>;
  let mockInference: jest.Mocked<InferenceServerStart>;
  let mockSearchInferenceEndpoints: {
    features: { get: jest.Mock };
    endpoints: { getForFeature: jest.Mock };
  };
  let mockContextManager: jest.Mocked<ContextManager>;
  let mockContext: StepHandlerContext<any>;
  let mockChatModel: any;
  let mockRunnable: any;
  let mockAbortController: AbortController;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAbortController = new AbortController();

    mockRunnable = {
      invoke: jest.fn(),
    };

    mockChatModel = {
      invoke: jest.fn(),
      withStructuredOutput: jest.fn().mockReturnValue(mockRunnable),
    };

    mockInference = {
      getChatModel: jest.fn().mockResolvedValue(mockChatModel),
    } as any;

    mockSearchInferenceEndpoints = {
      features: { get: jest.fn() },
      endpoints: { getForFeature: jest.fn() },
    };

    mockContextManager = {
      getFakeRequest: jest.fn().mockReturnValue({} as KibanaRequest),
      getContext: jest.fn(),
      getScopedEsClient: jest.fn(),
      renderInputTemplate: jest.fn(),
      callKibanaApi: jest.fn(),
    };

    mockContext = {
      config: {
        'connector-id': 'test-connector-id',
      },
      input: {
        prompt: 'Test prompt',
        temperature: 0.7,
      },
      rawInput: {
        prompt: 'Test prompt',
        temperature: 0.7,
      },
      contextManager: mockContextManager,
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
      abortSignal: mockAbortController.signal,
      stepId: 'test-step-id',
      stepType: 'ai.prompt',
    };

    mockCoreSetup = {
      getStartServices: jest
        .fn()
        .mockResolvedValue([
          {},
          { inference: mockInference, searchInferenceEndpoints: mockSearchInferenceEndpoints },
        ]),
    } as any;

    mockResolveConnectorId.mockResolvedValue('resolved-connector-id');
    mockCreateServerStepDefinition.mockImplementation((def) => def);
  });

  describe('step definition creation', () => {
    it('should create a step definition with correct structure', () => {
      const stepDefinition = aiPromptStepDefinition(mockCoreSetup);

      expect(mockCreateServerStepDefinition).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'ai.prompt',
          inputSchema: {},
          outputSchema: {},
          handler: expect.any(Function),
        })
      );

      expect(stepDefinition).toBeDefined();
      expect(typeof stepDefinition.handler).toBe('function');
    });
  });

  describe('handler execution', () => {
    let stepDefinition: any;
    let handler: Function;

    beforeEach(() => {
      stepDefinition = aiPromptStepDefinition(mockCoreSetup);
      handler = stepDefinition.handler;
    });

    describe('with basic input (no output schema)', () => {
      it('should successfully execute AI prompt and return response', async () => {
        const mockResponse = {
          content: 'AI generated response',
          response_metadata: { model: 'gpt-3.5-turbo', usage: { tokens: 100 } },
        };

        mockChatModel.invoke.mockResolvedValue(mockResponse);
        mockContext.input.systemPrompt = 'You are a helpful assistant.';
        const result = await handler(mockContext);

        expect(mockCoreSetup.getStartServices).toHaveBeenCalledTimes(1);
        expect(mockResolveConnectorId).toHaveBeenCalledWith(
          'test-connector-id',
          mockInference,
          expect.any(Object),
          { featureId: 'ai_prompt', searchInferenceEndpoints: mockSearchInferenceEndpoints }
        );
        expect(mockInference.getChatModel).toHaveBeenCalledWith({
          connectorId: 'resolved-connector-id',
          request: expect.any(Object),
          chatModelOptions: {
            temperature: 0.7,
            maxRetries: 0,
          },
        });
        expect(mockChatModel.invoke).toHaveBeenCalledWith(
          [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Test prompt' },
          ],
          { signal: mockAbortController.signal }
        );

        expect(result).toEqual({
          output: {
            content: 'AI generated response',
            metadata: { model: 'gpt-3.5-turbo', usage: { tokens: 100 } },
          },
        });
      });

      it('should handle missing temperature in input', async () => {
        const contextWithoutTemperature = {
          ...mockContext,
          input: {
            prompt: 'Test prompt',
            connectorId: 'test-connector-id',
          },
        };

        const mockResponse = {
          content: 'AI response',
          response_metadata: {},
        };

        mockChatModel.invoke.mockResolvedValue(mockResponse);

        await handler(contextWithoutTemperature);

        expect(mockInference.getChatModel).toHaveBeenCalledWith({
          connectorId: 'resolved-connector-id',
          request: expect.any(Object),
          chatModelOptions: {
            temperature: undefined,
            maxRetries: 0,
          },
        });
      });

      it('should handle missing connectorId in input', async () => {
        const contextWithoutConnectorId = {
          ...mockContext,
          config: {
            ...mockContext.config,
            'connector-id': undefined,
          },
          input: {
            prompt: 'Test prompt',
            temperature: 0.5,
          },
        };

        const mockResponse = {
          content: 'AI response',
          response_metadata: {},
        };

        mockChatModel.invoke.mockResolvedValue(mockResponse);

        await handler(contextWithoutConnectorId);

        expect(mockResolveConnectorId).toHaveBeenCalledWith(
          undefined,
          mockInference,
          expect.any(Object),
          { featureId: 'ai_prompt', searchInferenceEndpoints: mockSearchInferenceEndpoints }
        );
      });
    });

    describe('with structured output schema', () => {
      it('should use structured output when outputSchema is provided', async () => {
        const contextWithSchema = {
          ...mockContext,
          input: {
            ...mockContext.input,
            schema: {
              type: 'object',
              properties: {
                summary: { type: 'string' },
                sentiment: { type: 'string' },
              },
            },
          },
        };

        const mockStructuredResponse = {
          response: {
            summary: 'This is a summary',
            sentiment: 'positive',
          },
        };

        mockRunnable.invoke.mockResolvedValue({
          parsed: mockStructuredResponse,
          raw: {
            response_metadata: { tokens_used: 150 },
          },
        });

        const result = await handler(contextWithSchema);

        expect(mockChatModel.withStructuredOutput).toHaveBeenCalledWith(
          {
            type: 'object',
            properties: {
              response: {
                type: 'object',
                properties: {
                  summary: { type: 'string' },
                  sentiment: { type: 'string' },
                },
              },
            },
          },
          {
            name: 'extract_structured_response',
            includeRaw: true,
            method: 'jsonMode',
          }
        );

        expect(mockRunnable.invoke).toHaveBeenCalledWith(
          [{ role: 'user', content: 'Test prompt' }],
          { signal: mockAbortController.signal }
        );

        expect(result).toEqual({
          output: {
            content: {
              summary: 'This is a summary',
              sentiment: 'positive',
            },
            metadata: { tokens_used: 150 },
          },
        });

        expect(mockChatModel.invoke).not.toHaveBeenCalled();
      });

      it('should handle array output schema by wrapping in response object', async () => {
        const contextWithArraySchema = {
          ...mockContext,
          input: {
            ...mockContext.input,
            schema: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        };

        const mockStructuredResponse = {
          response: ['item1', 'item2', 'item3'],
        };

        mockRunnable.invoke.mockResolvedValue({
          parsed: mockStructuredResponse,
          raw: {
            response_metadata: { tokens_used: 150 },
          },
        });

        const result = await handler(contextWithArraySchema);

        expect(mockChatModel.withStructuredOutput).toHaveBeenCalledWith(
          {
            type: 'object',
            properties: {
              response: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
          {
            name: 'extract_structured_response',
            includeRaw: true,
            method: 'jsonMode',
          }
        );

        expect(result).toEqual({
          output: expect.objectContaining({
            content: ['item1', 'item2', 'item3'],
          }),
        });
      });
    });

    describe('error handling', () => {
      it('should propagate errors from resolveConnectorId', async () => {
        const error = new Error('Connector resolution failed');
        mockResolveConnectorId.mockRejectedValue(error);

        await expect(handler(mockContext)).rejects.toThrow('Connector resolution failed');
      });

      it('should propagate errors from getChatModel', async () => {
        const error = new Error('Chat model initialization failed');
        mockInference.getChatModel.mockRejectedValue(error);

        await expect(handler(mockContext)).rejects.toThrow('Chat model initialization failed');
      });

      it('should propagate errors from chat model invoke', async () => {
        const error = new Error('AI model invocation failed');
        mockChatModel.invoke.mockRejectedValue(error);

        await expect(handler(mockContext)).rejects.toThrow('AI model invocation failed');
      });

      it('should propagate errors from structured output invoke', async () => {
        const contextWithSchema = {
          ...mockContext,
          input: {
            ...mockContext.input,
            schema: { type: 'object', properties: {} },
          },
        };

        const error = new Error('Structured output invocation failed');
        mockRunnable.invoke.mockRejectedValue(error);

        await expect(handler(contextWithSchema)).rejects.toThrow(
          'Structured output invocation failed'
        );
      });

      it('should handle abortion via abortSignal', async () => {
        mockAbortController.abort();

        const error = new Error('Aborted');
        error.name = 'AbortError';
        mockChatModel.invoke.mockRejectedValue(error);

        await expect(handler(mockContext)).rejects.toThrow('Aborted');
      });
    });

    describe('reasoning-level validation', () => {
      const createConnector = (parts: Partial<InferenceConnector>): InferenceConnector => ({
        type: InferenceConnectorType.Inference,
        name: 'Claude Haiku',
        connectorId: '.anthropic-claude-haiku-chat_completion',
        config: {},
        capabilities: {},
        isInferenceEndpoint: true,
        isPreconfigured: true,
        isEis: true,
        ...parts,
      });

      const withReasoningLevel = (reasoningLevel: string) => ({
        ...mockContext,
        config: { ...mockContext.config, 'reasoning-level': reasoningLevel },
      });

      beforeEach(() => {
        mockChatModel.invoke.mockResolvedValue({ content: 'response', response_metadata: {} });
      });

      it('does not inspect the connector when no reasoning level is set', async () => {
        mockChatModel.getConnector = jest.fn();

        await handler(mockContext);

        expect(mockChatModel.getConnector).not.toHaveBeenCalled();
        expect(mockChatModel.invoke).toHaveBeenCalled();
      });

      it('invokes the model when the EIS endpoint supports the level', async () => {
        mockChatModel.getConnector = jest.fn().mockReturnValue(
          createConnector({
            metadata: { capabilities: { reasoning: { supported_effort_levels: ['high', 'low'] } } },
          })
        );

        await handler(withReasoningLevel('high'));

        expect(mockChatModel.invoke).toHaveBeenCalled();
      });

      it('invokes the model for non-EIS connectors', async () => {
        mockChatModel.getConnector = jest
          .fn()
          .mockReturnValue(createConnector({ type: InferenceConnectorType.OpenAI, isEis: false }));

        await handler(withReasoningLevel('xhigh'));

        expect(mockChatModel.invoke).toHaveBeenCalled();
      });

      it('rejects a level the EIS endpoint does not support, before invoking the model', async () => {
        mockChatModel.getConnector = jest.fn().mockReturnValue(
          createConnector({
            metadata: { capabilities: { reasoning: { supported_effort_levels: ['high', 'low'] } } },
          })
        );

        await expect(handler(withReasoningLevel('xhigh'))).rejects.toThrow(
          'Reasoning level "xhigh" is not supported by model "Claude Haiku" (.anthropic-claude-haiku-chat_completion). Supported levels: high, low.'
        );
        expect(mockChatModel.invoke).not.toHaveBeenCalled();
      });

      it('invokes the model when the EIS endpoint advertises no reasoning control', async () => {
        mockChatModel.getConnector = jest.fn().mockReturnValue(
          createConnector({
            metadata: { capabilities: { context_window: { max_input_tokens: 1000 } } },
          })
        );

        await handler(withReasoningLevel('low'));

        expect(mockChatModel.invoke).toHaveBeenCalled();
      });
    });

    describe('service integration', () => {
      it('should pass correct parameters to all services', async () => {
        const mockResponse = {
          content: 'Test response',
          response_metadata: {},
        };

        mockChatModel.invoke.mockResolvedValue(mockResponse);

        await handler(mockContext);

        expect(mockCoreSetup.getStartServices).toHaveBeenCalledTimes(1);
        expect(mockContextManager.getFakeRequest).toHaveBeenCalledTimes(2);
        expect(mockResolveConnectorId).toHaveBeenCalledWith(
          'test-connector-id',
          mockInference,
          expect.any(Object),
          { featureId: 'ai_prompt', searchInferenceEndpoints: mockSearchInferenceEndpoints }
        );
        expect(mockInference.getChatModel).toHaveBeenCalledWith({
          connectorId: 'resolved-connector-id',
          request: expect.any(Object),
          chatModelOptions: {
            temperature: 0.7,
            maxRetries: 0,
          },
        });
        expect(mockChatModel.invoke).toHaveBeenCalledWith(
          [{ role: 'user', content: 'Test prompt' }],
          { signal: mockAbortController.signal }
        );
      });

      it('should use the same fake request for connector resolution and chat model', async () => {
        const mockFakeRequest = { headers: {}, auth: {} } as KibanaRequest;
        mockContextManager.getFakeRequest.mockReturnValue(mockFakeRequest);

        const mockResponse = {
          content: 'Test response',
          response_metadata: {},
        };

        mockChatModel.invoke.mockResolvedValue(mockResponse);

        await handler(mockContext);

        expect(mockResolveConnectorId).toHaveBeenCalledWith(
          'test-connector-id',
          mockInference,
          mockFakeRequest,
          { featureId: 'ai_prompt', searchInferenceEndpoints: mockSearchInferenceEndpoints }
        );

        expect(mockInference.getChatModel).toHaveBeenCalledWith({
          connectorId: 'resolved-connector-id',
          request: mockFakeRequest,
          chatModelOptions: {
            temperature: 0.7,
            maxRetries: 0,
          },
        });
      });
    });

    describe('connector-id-by-feature routing', () => {
      it('resolves the connector via the feature endpoint when connector-id-by-feature is set', async () => {
        const contextWithFeature = {
          ...mockContext,
          config: { 'connector-id-by-feature': 'context_engine_prompt' },
          input: { prompt: 'Test prompt', temperature: 0.5 },
        };

        mockSearchInferenceEndpoints.features.get.mockReturnValue({ taskType: 'chat_completion' });
        mockSearchInferenceEndpoints.endpoints.getForFeature.mockResolvedValue({
          endpoints: [{ connectorId: 'gemini-flash-connector' }],
        });
        mockChatModel.invoke.mockResolvedValue({ content: 'ok', response_metadata: {} });

        await handler(contextWithFeature);

        expect(mockSearchInferenceEndpoints.endpoints.getForFeature).toHaveBeenCalledWith(
          'context_engine_prompt',
          expect.any(Object)
        );
        expect(mockResolveConnectorId).not.toHaveBeenCalled();
        expect(mockInference.getChatModel).toHaveBeenCalledWith(
          expect.objectContaining({ connectorId: 'gemini-flash-connector' })
        );
      });

      it('throws when both connector-id and connector-id-by-feature are specified', async () => {
        const contextWithBoth = {
          ...mockContext,
          config: {
            'connector-id': 'explicit-connector',
            'connector-id-by-feature': 'context_engine_prompt',
          },
        };

        await expect(handler(contextWithBoth)).rejects.toThrow(
          'Cannot specify both connector-id and connector-id-by-feature'
        );
        expect(mockResolveConnectorId).not.toHaveBeenCalled();
      });

      it('throws when the feature resolves to no endpoints', async () => {
        const contextWithFeature = {
          ...mockContext,
          config: { 'connector-id-by-feature': 'context_engine_prompt' },
        };

        mockSearchInferenceEndpoints.features.get.mockReturnValue({ taskType: 'chat_completion' });
        mockSearchInferenceEndpoints.endpoints.getForFeature.mockResolvedValue({ endpoints: [] });

        await expect(handler(contextWithFeature)).rejects.toThrow(
          'No connector available for feature "context_engine_prompt"'
        );
      });

      it('throws when the feature is registered with a non-chat-completion task type', async () => {
        const contextWithFeature = {
          ...mockContext,
          config: { 'connector-id-by-feature': 'context_engine_embed' },
        };

        mockSearchInferenceEndpoints.features.get.mockReturnValue({ taskType: 'text_embedding' });

        await expect(handler(contextWithFeature)).rejects.toThrow('not a chat completion feature');
        expect(mockSearchInferenceEndpoints.endpoints.getForFeature).not.toHaveBeenCalled();
      });

      it('falls through to feature endpoint lookup when the feature ID is unregistered (get returns undefined)', async () => {
        const contextWithFeature = {
          ...mockContext,
          config: { 'connector-id-by-feature': 'unknown_feature' },
        };

        mockSearchInferenceEndpoints.features.get.mockReturnValue(undefined);
        mockSearchInferenceEndpoints.endpoints.getForFeature.mockResolvedValue({
          endpoints: [{ connectorId: 'some-connector' }],
        });
        mockChatModel.invoke.mockResolvedValue({ content: 'ok', response_metadata: {} });

        await handler(contextWithFeature);

        expect(mockSearchInferenceEndpoints.endpoints.getForFeature).toHaveBeenCalledWith(
          'unknown_feature',
          expect.any(Object)
        );
      });
    });

    describe('input validation and processing', () => {
      it('should handle various temperature values', async () => {
        const temperatures = [0, 0.1, 0.5, 0.9, 1.0];
        const mockResponse = { content: 'response', response_metadata: {} };
        mockChatModel.invoke.mockResolvedValue(mockResponse);

        for (const temperature of temperatures) {
          const contextWithTemperature = {
            ...mockContext,
            input: {
              ...mockContext.input,
              temperature,
            },
          };

          await handler(contextWithTemperature);

          expect(mockInference.getChatModel).toHaveBeenCalledWith(
            expect.objectContaining({
              chatModelOptions: expect.objectContaining({
                temperature,
                maxRetries: 0,
              }),
            })
          );
        }
      });

      it('should handle different prompt types', async () => {
        const prompts = [
          'Simple text prompt',
          'Multi\nline\nprompt',
          'Prompt with special characters: @#$%^&*()',
          '',
          'Very long prompt that exceeds normal length expectations and continues for a while to test edge cases',
        ];

        const mockResponse = { content: 'response', response_metadata: {} };
        mockChatModel.invoke.mockResolvedValue(mockResponse);

        for (const prompt of prompts) {
          const contextWithPrompt = {
            ...mockContext,
            input: {
              ...mockContext.input,
              prompt,
            },
          };

          await handler(contextWithPrompt);

          expect(mockChatModel.invoke).toHaveBeenCalledWith([{ role: 'user', content: prompt }], {
            signal: mockAbortController.signal,
          });
        }
      });
    });
  });
});
