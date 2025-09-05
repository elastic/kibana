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
  getConversationMock$,
  conversationExistsMock$,
  updateConversationMock$,
  generateTitleMock$,
  getChatModelMock$,
  resolveSelectedConnectorIdMock,
} from './chat_service.test.mocks';

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
  createEmptyConversation,
} from '../../test_utils';
import type { ChatService } from './chat_service';
import { createChatService } from './chat_service';

const createChatModel = (): InferenceChatModel => {
  // we don't really need it
  return {} as any;
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

    getConversationMock$.mockReturnValue(of(conversation));
    generateTitleMock$.mockReturnValue(of('generated title'));
    getChatModelMock$.mockReturnValue(of(createChatModel()));

    // Ensure a connector is available by default
    resolveSelectedConnectorIdMock.mockResolvedValue('test-connector-id');

    executeAgentMock$.mockReturnValue(of());
    createConversationMock$.mockReturnValue(of());
    updateConversationMock$.mockReturnValue(of());
  });

  afterEach(() => {
    createConversationMock$.mockReset();
    executeAgentMock$.mockReset();
    getConversationMock$.mockReset();
    conversationExistsMock$.mockReset();
    updateConversationMock$.mockReset();
    generateTitleMock$.mockReset();
    getChatModelMock$.mockReset();
    resolveSelectedConnectorIdMock.mockReset();
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
        conversation$: expect.anything(),
        agentId: 'my-agent',
        request,
        agentService,
        defaultConnectorId: 'test-connector-id',
        abortSignal: undefined,
      })
    );
  });

  describe('autoCreateConversationWithId', () => {
    it('creates new conversation when autoCreateConversationWithId=true and conversation does not exist', async () => {
      conversationExistsMock$.mockReturnValue(of(false));
      getConversationMock$.mockReturnValue(of(createEmptyConversation()));

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

      expect(conversationExistsMock$).toHaveBeenCalledWith({
        conversationId: 'non-existing-conversation',
        conversationClient: expect.anything(),
      });
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
      conversationExistsMock$.mockReturnValue(of(true));
      getConversationMock$.mockReturnValue(of(createEmptyConversation()));

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

      expect(conversationExistsMock$).toHaveBeenCalledWith({
        conversationId: 'existing-conversation',
        conversationClient: expect.anything(),
      });
      expect(updateConversationMock$).toHaveBeenCalledWith({
        conversationClient: expect.anything(),
        conversation$: expect.anything(),
        title$: expect.anything(),
        roundCompletedEvents$: expect.anything(),
      });
      expect(createConversationMock$).not.toHaveBeenCalled();
    });

    it('follows default behavior when autoCreateConversationWithId=false (default)', async () => {
      getConversationMock$.mockReturnValue(of(createEmptyConversation()));

      const obs$ = chatService.converse({
        agentId: 'my-agent',
        conversationId: 'existing-conversation',
        request,
        nextInput: {
          message: 'hello',
        },
      });

      await firstValueFrom(obs$.pipe(toArray()));

      expect(conversationExistsMock$).not.toHaveBeenCalled();
      expect(updateConversationMock$).toHaveBeenCalledWith({
        conversationClient: expect.anything(),
        conversation$: expect.anything(),
        title$: expect.anything(),
        roundCompletedEvents$: expect.anything(),
      });
      expect(createConversationMock$).not.toHaveBeenCalled();
    });

    it('creates new conversation when no conversationId is provided regardless of autoCreateConversationWithId flag', async () => {
      getConversationMock$.mockReturnValue(of(createEmptyConversation()));

      const obs$ = chatService.converse({
        agentId: 'my-agent',
        autoCreateConversationWithId: true,
        request,
        nextInput: {
          message: 'hello',
        },
      });

      await firstValueFrom(obs$.pipe(toArray()));

      expect(conversationExistsMock$).not.toHaveBeenCalled();
      expect(createConversationMock$).toHaveBeenCalledWith({
        agentId: 'my-agent',
        conversationClient: expect.anything(),
        conversationId: undefined,
        title$: expect.anything(),
        roundCompletedEvents$: expect.anything(),
      });
      expect(updateConversationMock$).not.toHaveBeenCalled();
    });

    it('passes autoCreateConversationWithId parameter to getConversation$', async () => {
      conversationExistsMock$.mockReturnValue(of(false));
      getConversationMock$.mockReturnValue(of(createEmptyConversation()));

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

      expect(getConversationMock$).toHaveBeenCalledWith({
        agentId: 'my-agent',
        conversationId: 'test-conversation',
        autoCreateConversationWithId: true,
        conversationClient: expect.anything(),
      });
    });
  });

  it('throws when no connector is available for chat execution', async () => {
    resolveSelectedConnectorIdMock.mockResolvedValue(undefined);
    getConversationMock$.mockReturnValue(of(createEmptyConversation()));

    const obs$ = chatService.converse({
      agentId: 'my-agent',
      request,
      nextInput: { message: 'hello' },
    });

    await expect(firstValueFrom(obs$)).rejects.toThrow('No connector available for chat execution');
  });
});
