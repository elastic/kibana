/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// mocks must be imported first
import {
  createConversationMock$,
  executeAgentMock$,
  getConversationMock,
  conversationExistsMock,
  updateConversationMock$,
  generateTitleMock,
  resolveServicesMock,
} from './chat_service.test.mocks';
import { ChatEventType } from '@kbn/agent-builder-common';

import { firstValueFrom, toArray, of } from 'rxjs';
import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { inferenceMock } from '@kbn/inference-plugin/server/mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import {
  createAgentsServiceStartMock,
  createConversationServiceMock,
  createConversationClientMock,
  createEmptyConversation,
} from '../../test_utils';
import type { ChatService } from './types';
import { createChatService } from './chat_service';
import { isConversationIdSetEvent } from '@kbn/agent-builder-common/chat';

const createChatModel = (): InferenceChatModel => {
  // we don't really need it
  return {
    getConnector: jest.fn().mockReturnValue({ actionTypeId: '.bedrock' }),
  } as any;
};

describe('ChatService', () => {
  let inference: ReturnType<typeof inferenceMock.createStartContract>;
  let logger: MockedLogger;
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let agentService: ReturnType<typeof createAgentsServiceStartMock>;
  let conversationService: ReturnType<typeof createConversationServiceMock>;
  let uiSettings: ReturnType<typeof uiSettingsServiceMock.createStartContract>;
  let savedObjects: ReturnType<typeof savedObjectsServiceMock.createStartContract>;

  let chatService: ChatService;

  beforeEach(() => {
    logger = loggerMock.create();
    request = httpServerMock.createKibanaRequest();
    inference = inferenceMock.createStartContract();
    agentService = createAgentsServiceStartMock();
    conversationService = createConversationServiceMock();
    uiSettings = uiSettingsServiceMock.createStartContract();
    savedObjects = savedObjectsServiceMock.createStartContract();

    chatService = createChatService({
      inference,
      logger,
      agentService,
      conversationService,
      uiSettings,
      savedObjects,
    });

    const conversation = createEmptyConversation();

    getConversationMock.mockResolvedValue({ ...conversation, operation: 'CREATE' });
    generateTitleMock.mockReturnValue(of('generated title'));

    // Mock resolveServices to return all necessary services with a proper conversation client
    const conversationClientMock = createConversationClientMock();
    conversationClientMock.get.mockResolvedValue(conversation);

    resolveServicesMock.mockResolvedValue({
      conversationClient: conversationClientMock,
      chatModel: createChatModel(),
      selectedConnectorId: 'test-connector-id',
    });

    executeAgentMock$.mockReturnValue(of());
    createConversationMock$.mockReturnValue(of());
    updateConversationMock$.mockReturnValue(of());
  });

  afterEach(() => {
    createConversationMock$.mockReset();
    executeAgentMock$.mockReset();
    getConversationMock.mockReset();
    conversationExistsMock.mockReset();
    updateConversationMock$.mockReset();
    generateTitleMock.mockReset();
    resolveServicesMock.mockReset();
  });

  it('calls executeAgent$ with the right parameters', async () => {
    const obs$ = chatService.converse({
      agentId: 'my-agent',
      request,
      nextInput: {
        message: 'hello',
      },
    });

    await firstValueFrom(obs$.pipe(toArray()));

    expect(executeAgentMock$).toHaveBeenCalledTimes(1);
    expect(executeAgentMock$).toHaveBeenCalledWith(
      expect.objectContaining({
        nextInput: {
          message: 'hello',
        },
        conversation: expect.anything(),
        agentId: 'my-agent',
        request,
        agentService,
        defaultConnectorId: 'test-connector-id',
        abortSignal: undefined,
      })
    );
  });

  it('passes configurationOverrides to executeAgent$', async () => {
    const obs$ = chatService.converse({
      agentId: 'my-agent',
      request,
      nextInput: {
        message: 'hello',
      },
      configurationOverrides: {
        instructions: 'custom instructions',
        tools: [{ tool_ids: ['tool-a', 'tool-b'] }],
      },
    });

    await firstValueFrom(obs$.pipe(toArray()));

    expect(executeAgentMock$).toHaveBeenCalledTimes(1);
    expect(executeAgentMock$).toHaveBeenCalledWith(
      expect.objectContaining({
        configurationOverrides: {
          instructions: 'custom instructions',
          tools: [{ tool_ids: ['tool-a', 'tool-b'] }],
        },
      })
    );
  });

  describe('autoCreateConversationWithId', () => {
    it('creates new conversation when autoCreateConversationWithId=true and conversation does not exist', async () => {
      getConversationMock.mockResolvedValue({
        ...createEmptyConversation(),
        operation: 'CREATE',
      });

      const obs$ = chatService.converse({
        agentId: 'my-agent',
        conversationId: 'non-existing-conversation',
        autoCreateConversationWithId: true,
        request,
        nextInput: {
          message: 'hello',
        },
      });

      await firstValueFrom(obs$.pipe(toArray()));

      expect(createConversationMock$).toHaveBeenCalledWith({
        agentId: 'my-agent',
        conversationClient: expect.anything(),
        conversationId: 'non-existing-conversation',
        title$: expect.anything(),
        roundCompletedEvents$: expect.anything(),
      });
      expect(updateConversationMock$).not.toHaveBeenCalled();
    });

    it('updates existing conversation when autoCreateConversationWithId=true and conversation exists', async () => {
      getConversationMock.mockResolvedValue({
        ...createEmptyConversation(),
        operation: 'UPDATE',
      });

      const obs$ = chatService.converse({
        agentId: 'my-agent',
        conversationId: 'existing-conversation',
        autoCreateConversationWithId: true,
        request,
        nextInput: {
          message: 'hello',
        },
      });

      await firstValueFrom(obs$.pipe(toArray()));

      expect(updateConversationMock$).toHaveBeenCalledWith({
        conversationClient: expect.anything(),
        conversation: expect.anything(),
        title$: expect.anything(),
        roundCompletedEvents$: expect.anything(),
        action: undefined,
      });
      expect(createConversationMock$).not.toHaveBeenCalled();
    });

    it('follows default behavior when autoCreateConversationWithId=false (default)', async () => {
      getConversationMock.mockResolvedValue({
        ...createEmptyConversation(),
        operation: 'UPDATE',
      });

      const obs$ = chatService.converse({
        agentId: 'my-agent',
        conversationId: 'existing-conversation',
        request,
        nextInput: {
          message: 'hello',
        },
      });

      await firstValueFrom(obs$.pipe(toArray()));

      expect(conversationExistsMock).not.toHaveBeenCalled();
      expect(updateConversationMock$).toHaveBeenCalledWith({
        conversationClient: expect.anything(),
        conversation: expect.anything(),
        title$: expect.anything(),
        roundCompletedEvents$: expect.anything(),
        action: undefined,
      });
      expect(createConversationMock$).not.toHaveBeenCalled();
    });

    it('creates new conversation when no conversationId is provided regardless of autoCreateConversationWithId flag', async () => {
      const conversation = createEmptyConversation();
      getConversationMock.mockResolvedValue({ ...conversation, operation: 'CREATE' });

      const obs$ = chatService.converse({
        agentId: 'my-agent',
        autoCreateConversationWithId: true,
        request,
        nextInput: {
          message: 'hello',
        },
      });

      await firstValueFrom(obs$.pipe(toArray()));

      expect(conversationExistsMock).not.toHaveBeenCalled();
      expect(createConversationMock$).toHaveBeenCalledWith({
        agentId: 'my-agent',
        conversationClient: expect.anything(),
        conversationId: conversation.id,
        title$: expect.anything(),
        roundCompletedEvents$: expect.anything(),
      });
      expect(updateConversationMock$).not.toHaveBeenCalled();
    });

    it('passes autoCreateConversationWithId parameter to getConversation', async () => {
      getConversationMock.mockResolvedValue({
        ...createEmptyConversation(),
        operation: 'CREATE',
      });

      const obs$ = chatService.converse({
        agentId: 'my-agent',
        conversationId: 'test-conversation',
        autoCreateConversationWithId: true,
        request,
        nextInput: {
          message: 'hello',
        },
      });

      await firstValueFrom(obs$.pipe(toArray()));

      expect(getConversationMock).toHaveBeenCalledWith({
        agentId: 'my-agent',
        conversationId: 'test-conversation',
        autoCreateConversationWithId: true,
        conversationClient: expect.anything(),
      });
    });
  });

  it('throws when no connector is available for chat execution', async () => {
    resolveServicesMock.mockRejectedValue(new Error('No connector available for chat execution'));
    getConversationMock.mockResolvedValue({
      ...createEmptyConversation(),
      operation: 'CREATE',
    });

    const obs$ = chatService.converse({
      agentId: 'my-agent',
      request,
      nextInput: { message: 'hello' },
    });

    await expect(firstValueFrom(obs$)).rejects.toThrow('No connector available for chat execution');
  });

  describe('conversationIdSetEvent', () => {
    it('emits conversationIdSetEvent for new conversations (no conversationId)', async () => {
      const conversation = createEmptyConversation();
      getConversationMock.mockResolvedValue({ ...conversation, operation: 'CREATE' });

      // Mock agent events to include a round complete event
      const mockRoundCompleteEvent = {
        type: ChatEventType.roundComplete,
        data: {
          round: {
            id: 'round-1',
            trace_id: 'trace-1',
            steps: [],
            response: 'Test response',
          },
        },
      };
      executeAgentMock$.mockReturnValue(of(mockRoundCompleteEvent));

      const obs$ = chatService.converse({
        agentId: 'my-agent',
        request,
        nextInput: { message: 'hello' },
      });

      const events = await firstValueFrom(obs$.pipe(toArray()));

      // Should emit conversationIdSetEvent
      const conversationIdSetEvents = events.filter(isConversationIdSetEvent);
      expect(conversationIdSetEvents).toHaveLength(1);
      expect(conversationIdSetEvents[0].data.conversation_id).toBe(conversation.id);
    });

    it('emits conversationIdSetEvent for new conversations (autoCreateConversationWithId=true, conversation does not exist)', async () => {
      const providedId = 'non-existing-conversation';
      const conversation = {
        ...createEmptyConversation(),
        id: providedId,
      };
      conversationExistsMock.mockResolvedValue(false);
      getConversationMock.mockResolvedValue({ ...conversation, operation: 'CREATE' });

      // Mock agent events to include a round complete event
      const mockRoundCompleteEvent = {
        type: ChatEventType.roundComplete,
        data: {
          round: {
            id: 'round-1',
            trace_id: 'trace-1',
            steps: [],
            response: 'Test response',
          },
        },
      };
      executeAgentMock$.mockReturnValue(of(mockRoundCompleteEvent));

      const obs$ = chatService.converse({
        agentId: 'my-agent',
        conversationId: providedId,
        autoCreateConversationWithId: true,
        request,
        nextInput: { message: 'hello' },
      });

      const events = await firstValueFrom(obs$.pipe(toArray()));

      // Should emit conversationIdSetEvent with the provided ID
      const conversationIdSetEvents = events.filter(isConversationIdSetEvent);
      expect(conversationIdSetEvents).toHaveLength(1);
      expect(conversationIdSetEvents[0].data.conversation_id).toBe(providedId);
    });

    it('does NOT emit conversationIdSetEvent for existing conversations (autoCreateConversationWithId=false)', async () => {
      const existingConversationId = 'existing-conversation';
      const conversation = {
        ...createEmptyConversation(),
        id: existingConversationId, // ← Use the same ID
      };
      getConversationMock.mockResolvedValue({ ...conversation, operation: 'UPDATE' });

      // Mock agent events to include a round complete event
      const mockRoundCompleteEvent = {
        type: ChatEventType.roundComplete,
        data: {
          round: {
            id: 'round-1',
            trace_id: 'trace-1',
            steps: [],
            response: 'Test response',
          },
        },
      };
      executeAgentMock$.mockReturnValue(of(mockRoundCompleteEvent));

      const obs$ = chatService.converse({
        agentId: 'my-agent',
        conversationId: existingConversationId,
        request,
        nextInput: { message: 'hello' },
      });

      const events = await firstValueFrom(obs$.pipe(toArray()));

      // Should NOT emit conversationIdSetEvent
      const conversationIdSetEvents = events.filter(isConversationIdSetEvent);
      expect(conversationIdSetEvents).toHaveLength(0);
    });

    it('emits conversationIdSetEvent before other events for new conversations', async () => {
      const conversation = createEmptyConversation();
      getConversationMock.mockResolvedValue({ ...conversation, operation: 'CREATE' });

      // Mock agent events to include multiple events
      const mockAgentEvents = [
        {
          type: ChatEventType.reasoning,
          data: { message: 'Thinking...' },
        },
        {
          type: ChatEventType.roundComplete,
          data: {
            round: {
              id: 'round-1',
              trace_id: 'trace-1',
              steps: [],
              response: 'Test response',
            },
          },
        },
      ];
      executeAgentMock$.mockReturnValue(of(...mockAgentEvents));

      const obs$ = chatService.converse({
        agentId: 'my-agent',
        request,
        nextInput: { message: 'hello' },
      });

      const events = await firstValueFrom(obs$.pipe(toArray()));

      // Find the conversationIdSetEvent
      const conversationIdSetEventIndex = events.findIndex(isConversationIdSetEvent);
      expect(conversationIdSetEventIndex).toBeGreaterThanOrEqual(0);

      // Find the first agent event (reasoning)
      const reasoningEventIndex = events.findIndex(
        (event) => event.type === ChatEventType.reasoning
      );

      // conversationIdSetEvent should come before agent events
      expect(conversationIdSetEventIndex).toBeLessThan(reasoningEventIndex);
    });
  });

  describe('action parameter', () => {
    it('passes action to executeAgent$', async () => {
      const conversation = {
        ...createEmptyConversation(),
        rounds: [
          {
            id: 'round-1',
            status: 'completed',
            input: { message: 'original message' },
            response: { message: 'original response' },
            steps: [],
            started_at: new Date().toISOString(),
            time_to_first_token: 100,
            time_to_last_token: 500,
            model_usage: {
              connector_id: 'test-connector',
              input_tokens: 10,
              output_tokens: 20,
              llm_calls: 1,
            },
          },
        ],
      };
      getConversationMock.mockResolvedValue({ ...conversation, operation: 'UPDATE' });

      const obs$ = chatService.converse({
        agentId: 'my-agent',
        conversationId: 'test-conversation',
        action: 'regenerate',
        request,
        nextInput: {
          message: 'hello',
        },
      });

      await firstValueFrom(obs$.pipe(toArray()));

      expect(executeAgentMock$).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'regenerate',
        })
      );
    });

    it('calls updateConversation$ with action when action=regenerate', async () => {
      const conversation = {
        ...createEmptyConversation(),
        rounds: [
          {
            id: 'round-1',
            status: 'completed',
            input: { message: 'original message' },
            response: { message: 'original response' },
            steps: [],
            started_at: new Date().toISOString(),
            time_to_first_token: 100,
            time_to_last_token: 500,
            model_usage: {
              connector_id: 'test-connector',
              input_tokens: 10,
              output_tokens: 20,
              llm_calls: 1,
            },
          },
        ],
      };
      getConversationMock.mockResolvedValue({ ...conversation, operation: 'UPDATE' });

      const obs$ = chatService.converse({
        agentId: 'my-agent',
        conversationId: 'test-conversation',
        action: 'regenerate',
        request,
        nextInput: {
          message: 'ignored',
        },
      });

      await firstValueFrom(obs$.pipe(toArray()));

      expect(updateConversationMock$).toHaveBeenCalledWith({
        conversationClient: expect.anything(),
        conversation: expect.anything(),
        title$: expect.anything(),
        roundCompletedEvents$: expect.anything(),
        action: 'regenerate',
      });
      expect(createConversationMock$).not.toHaveBeenCalled();
    });

    it('does NOT emit conversationIdSetEvent for existing conversations with action=regenerate', async () => {
      const conversation = {
        ...createEmptyConversation(),
        rounds: [
          {
            id: 'round-1',
            status: 'completed',
            input: { message: 'original message' },
            response: { message: 'original response' },
            steps: [],
            started_at: new Date().toISOString(),
            time_to_first_token: 100,
            time_to_last_token: 500,
            model_usage: {
              connector_id: 'test-connector',
              input_tokens: 10,
              output_tokens: 20,
              llm_calls: 1,
            },
          },
        ],
      };
      getConversationMock.mockResolvedValue({ ...conversation, operation: 'UPDATE' });

      const mockRoundCompleteEvent = {
        type: ChatEventType.roundComplete,
        data: {
          round: {
            id: 'round-2',
            trace_id: 'trace-2',
            steps: [],
            response: 'New response',
          },
        },
      };
      executeAgentMock$.mockReturnValue(of(mockRoundCompleteEvent));

      const obs$ = chatService.converse({
        agentId: 'my-agent',
        conversationId: 'test-conversation',
        action: 'regenerate',
        request,
        nextInput: {
          message: 'ignored',
        },
      });

      const events = await firstValueFrom(obs$.pipe(toArray()));

      const conversationIdSetEvents = events.filter(isConversationIdSetEvent);
      expect(conversationIdSetEvents).toHaveLength(0);
    });

    it('passes conversation as-is to executeAgent$ (manipulation happens in runDefaultAgentMode)', async () => {
      const round1 = {
        id: 'round-1',
        status: 'completed',
        input: { message: 'first message' },
        response: { message: 'first response' },
        steps: [],
        started_at: new Date().toISOString(),
        time_to_first_token: 100,
        time_to_last_token: 500,
        model_usage: {
          connector_id: 'test-connector',
          input_tokens: 10,
          output_tokens: 20,
          llm_calls: 1,
        },
      };
      const round2 = {
        id: 'round-2',
        status: 'completed',
        input: { message: 'second message' },
        response: { message: 'second response' },
        steps: [],
        started_at: new Date().toISOString(),
        time_to_first_token: 100,
        time_to_last_token: 500,
        model_usage: {
          connector_id: 'test-connector',
          input_tokens: 10,
          output_tokens: 20,
          llm_calls: 1,
        },
      };
      const conversation = {
        ...createEmptyConversation(),
        rounds: [round1, round2],
      };
      getConversationMock.mockResolvedValue({ ...conversation, operation: 'UPDATE' });

      const obs$ = chatService.converse({
        agentId: 'my-agent',
        conversationId: 'test-conversation',
        action: 'regenerate',
        request,
        nextInput: {
          message: 'this is passed through',
        },
      });

      await firstValueFrom(obs$.pipe(toArray()));

      // Conversation is passed as-is to executeAgent$ (manipulation happens in runDefaultAgentMode)
      expect(executeAgentMock$).toHaveBeenCalledWith(
        expect.objectContaining({
          conversation: expect.objectContaining({
            rounds: [round1, round2],
          }),
          action: 'regenerate',
        })
      );
    });
  });
});
