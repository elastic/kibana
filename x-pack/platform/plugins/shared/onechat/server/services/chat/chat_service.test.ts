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
  updateConversationMock$,
  generateTitleMock$,
  getChatModelMock$,
} from './chat_service.test.mocks';

import { firstValueFrom, toArray, of } from 'rxjs';
import { loggerMock, MockedLogger } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { inferenceMock } from '@kbn/inference-plugin/server/mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { AgentMode } from '@kbn/onechat-common';
import {
  createAgentsServiceStartMock,
  createConversationServiceMock,
  createEmptyConversation,
} from '../../test_utils';
import { ChatService, createChatService } from './chat_service';

const createChatModel = (): InferenceChatModel => {
  // we don't really need it
  return {} as any;
};

describe('ChatService', () => {
  let inference: ReturnType<typeof inferenceMock.createStartContract>;
  let actions: ReturnType<typeof actionsMock.createStart>;
  let logger: MockedLogger;
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let agentService: ReturnType<typeof createAgentsServiceStartMock>;
  let conversationService: ReturnType<typeof createConversationServiceMock>;

  let chatService: ChatService;

  beforeEach(() => {
    logger = loggerMock.create();
    request = httpServerMock.createKibanaRequest();
    inference = inferenceMock.createStartContract();
    actions = actionsMock.createStart();
    agentService = createAgentsServiceStartMock();
    conversationService = createConversationServiceMock();

    chatService = createChatService({
      inference,
      logger,
      actions,
      agentService,
      conversationService,
    });

    const conversation = createEmptyConversation();

    getConversationMock$.mockReturnValue(of(conversation));
    generateTitleMock$.mockReturnValue(of('generated title'));
    getChatModelMock$.mockReturnValue(of(createChatModel()));

    executeAgentMock$.mockReturnValue(of());
    createConversationMock$.mockReturnValue(of());
    updateConversationMock$.mockReturnValue(of());
  });

  afterEach(() => {
    createConversationMock$.mockReset();
    executeAgentMock$.mockReset();
    getConversationMock$.mockReset();
    updateConversationMock$.mockReset();
    generateTitleMock$.mockReset();
    getChatModelMock$.mockReset();
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
    expect(executeAgentMock$).toHaveBeenCalledWith({
      nextInput: {
        message: 'hello',
      },
      conversation$: expect.anything(),
      agentId: 'my-agent',
      request,
      mode: AgentMode.normal,
      agentService,
    });
  });
});
