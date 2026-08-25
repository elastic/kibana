/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import {
  agentBuilderDefaultAgentId,
  ConversationAccessControlMode,
  createConversationNotFoundError,
  createConversationWriteConflictError,
  DEFAULT_CONVERSATION_TITLE,
} from '@kbn/agent-builder-common';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { getConversationCreateStepDefinition } from './conversation_create';
import { getConversationDeleteStepDefinition } from './conversation_delete';
import { getConversationGetStepDefinition } from './conversation_get';
import { getConversationListStepDefinition } from './conversation_list';
import { getConversationUpdateStepDefinition } from './conversation_update';

const conversation = {
  id: 'c-1',
  agent_id: 'my-agent',
  title: 'A conversation',
  created_at: '2026-08-25T00:00:00.000Z',
  updated_at: '2026-08-25T00:00:00.000Z',
  user: { id: 'u-1', username: 'sergi' },
  rounds: [],
  events: [],
};

describe('conversation workflow steps (Agent Builder)', () => {
  const fakeRequest = { headers: {} } as unknown as KibanaRequest;

  const createContext = (overrides: Partial<any> = {}) =>
    ({
      input: {},
      config: {},
      rawInput: {},
      contextManager: {
        getFakeRequest: jest.fn().mockReturnValue(fakeRequest),
        getContext: jest.fn(),
        getScopedEsClient: jest.fn(),
        renderInputTemplate: jest.fn(),
        callKibanaApi: jest.fn(),
      },
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      abortSignal: new AbortController().signal,
      stepId: 'test-step',
      stepType: 'conversations.test',
      ...overrides,
    } as StepHandlerContext);

  const createClientMock = (overrides: Partial<any> = {}) => ({
    get: jest.fn().mockResolvedValue(conversation),
    list: jest.fn().mockResolvedValue([conversation]),
    create: jest.fn().mockResolvedValue(conversation),
    update: jest.fn().mockResolvedValue(conversation),
    delete: jest.fn().mockResolvedValue(true),
    exists: jest.fn().mockResolvedValue(false),
    ...overrides,
  });

  const createServiceManager = (client: any) =>
    ({
      internalStart: {
        conversations: { getScopedClient: jest.fn().mockResolvedValue(client) },
        agents: {
          getRegistry: jest.fn().mockResolvedValue({ get: jest.fn().mockResolvedValue({}) }),
        },
      },
    } as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('conversations.get', () => {
    it('should return the conversation when it is accessible', async () => {
      const client = createClientMock();
      const step = getConversationGetStepDefinition(createServiceManager(client));

      const result = await step.handler(createContext({ input: { conversation_id: 'c-1' } }));

      expect(client.get).toHaveBeenCalledWith('c-1');
      expect(result.output).toEqual(conversation);
    });

    it('should scope the client to the workflow request', async () => {
      const client = createClientMock();
      const serviceManager = createServiceManager(client);
      const step = getConversationGetStepDefinition(serviceManager);

      await step.handler(createContext({ input: { conversation_id: 'c-1' } }));

      expect(serviceManager.internalStart.conversations.getScopedClient).toHaveBeenCalledWith({
        request: fakeRequest,
      });
    });

    it('should throw a ValidationError when the conversation is not found or inaccessible', async () => {
      const client = createClientMock({
        get: jest
          .fn()
          .mockRejectedValue(createConversationNotFoundError({ conversationId: 'c-1' })),
      });
      const step = getConversationGetStepDefinition(createServiceManager(client));

      const error = await step
        .handler(createContext({ input: { conversation_id: 'c-1' } }))
        .then(() => undefined)
        .catch((e) => e);

      expect(error).toBeInstanceOf(ExecutionError);
      expect((error as ExecutionError).toSerializableObject().type).toBe('ValidationError');
    });

    it('should throw when no request is available in the workflow context', async () => {
      const client = createClientMock();
      const step = getConversationGetStepDefinition(createServiceManager(client));
      const context = createContext({
        input: { conversation_id: 'c-1' },
        contextManager: { getFakeRequest: jest.fn().mockReturnValue(undefined) },
      });

      await expect(step.handler(context)).rejects.toThrow(
        'No request available in workflow context'
      );
    });

    it('should throw when the conversation service is unavailable', async () => {
      const step = getConversationGetStepDefinition({ internalStart: undefined } as any);

      await expect(
        step.handler(createContext({ input: { conversation_id: 'c-1' } }))
      ).rejects.toThrow('conversation service is not available');
    });
  });

  describe('conversations.list', () => {
    it('should forward the agent filter when provided', async () => {
      const client = createClientMock();
      const step = getConversationListStepDefinition(createServiceManager(client));

      const result = await step.handler(createContext({ input: { agent_id: 'my-agent' } }));

      expect(client.list).toHaveBeenCalledWith({ agentId: 'my-agent' });
      expect(result.output).toEqual([conversation]);
    });

    it('should list without a filter when no agent is provided', async () => {
      const client = createClientMock();
      const step = getConversationListStepDefinition(createServiceManager(client));

      await step.handler(createContext({ input: {} }));

      expect(client.list).toHaveBeenCalledWith({ agentId: undefined });
    });
  });

  describe('conversations.create', () => {
    it('should default the agent and title when they are omitted', async () => {
      const client = createClientMock();
      const step = getConversationCreateStepDefinition(createServiceManager(client));

      await step.handler(createContext({ input: {} }));

      expect(client.create).toHaveBeenCalledWith({
        agent_id: agentBuilderDefaultAgentId,
        id: undefined,
        title: DEFAULT_CONVERSATION_TITLE,
        rounds: [],
      });
    });

    it('should pass access control when an access mode is provided', async () => {
      const client = createClientMock();
      const step = getConversationCreateStepDefinition(createServiceManager(client));

      await step.handler(
        createContext({
          input: {
            agent_id: 'my-agent',
            title: 'Triage',
            access_mode: ConversationAccessControlMode.Public,
          },
        })
      );

      expect(client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          agent_id: 'my-agent',
          title: 'Triage',
          access_control: { access_mode: ConversationAccessControlMode.Public, entries: [] },
        })
      );
    });

    it('should verify the executing user can use the agent before creating', async () => {
      const client = createClientMock();
      const agentGet = jest.fn().mockResolvedValue({});
      const serviceManager = createServiceManager(client);
      serviceManager.internalStart.agents.getRegistry = jest
        .fn()
        .mockResolvedValue({ get: agentGet });
      const step = getConversationCreateStepDefinition(serviceManager);

      await step.handler(createContext({ input: { agent_id: 'my-agent' } }));

      expect(agentGet).toHaveBeenCalledWith('my-agent', { access: 'use' });
    });

    it('should not create a conversation when the agent is not usable', async () => {
      const client = createClientMock();
      const serviceManager = createServiceManager(client);
      serviceManager.internalStart.agents.getRegistry = jest.fn().mockResolvedValue({
        get: jest.fn().mockRejectedValue(new Error('Agent not found')),
      });
      const step = getConversationCreateStepDefinition(serviceManager);

      await expect(step.handler(createContext({ input: { agent_id: 'nope' } }))).rejects.toThrow(
        'Agent not found'
      );
      expect(client.create).not.toHaveBeenCalled();
    });

    it('should throw a ValidationError when the supplied id already exists', async () => {
      const client = createClientMock({ exists: jest.fn().mockResolvedValue(true) });
      const step = getConversationCreateStepDefinition(createServiceManager(client));

      const error = await step
        .handler(createContext({ input: { conversation_id: 'c-1' } }))
        .then(() => undefined)
        .catch((e) => e);

      expect(error).toBeInstanceOf(ExecutionError);
      expect((error as ExecutionError).toSerializableObject().type).toBe('ValidationError');
      expect(client.create).not.toHaveBeenCalled();
    });
  });

  describe('conversations.update', () => {
    it('should only send the supplied fields', async () => {
      const client = createClientMock();
      const step = getConversationUpdateStepDefinition(createServiceManager(client));

      await step.handler(
        createContext({ input: { conversation_id: 'c-1', title: 'Renamed', pinned: true } })
      );

      expect(client.update).toHaveBeenCalledWith(
        { id: 'c-1', title: 'Renamed', pinned: true },
        { access: 'owner', retryOnConflict: true }
      );
    });

    it('should send falsy values that were explicitly provided', async () => {
      const client = createClientMock();
      const step = getConversationUpdateStepDefinition(createServiceManager(client));

      await step.handler(
        createContext({ input: { conversation_id: 'c-1', read: false, pinned: false } })
      );

      expect(client.update).toHaveBeenCalledWith(
        { id: 'c-1', read: false, pinned: false },
        expect.anything()
      );
    });

    it('should throw a ConflictError when concurrent writes cannot be reconciled', async () => {
      const client = createClientMock({
        update: jest
          .fn()
          .mockRejectedValue(createConversationWriteConflictError({ conversationId: 'c-1' })),
      });
      const step = getConversationUpdateStepDefinition(createServiceManager(client));

      const error = await step
        .handler(createContext({ input: { conversation_id: 'c-1', title: 'Renamed' } }))
        .then(() => undefined)
        .catch((e) => e);

      expect(error).toBeInstanceOf(ExecutionError);
      expect((error as ExecutionError).toSerializableObject().type).toBe('ConflictError');
    });
  });

  describe('conversations.delete', () => {
    it('should report success when the conversation is deleted', async () => {
      const client = createClientMock();
      const step = getConversationDeleteStepDefinition(createServiceManager(client));

      const result = await step.handler(createContext({ input: { conversation_id: 'c-1' } }));

      expect(client.delete).toHaveBeenCalledWith('c-1');
      expect(result.output).toEqual({ success: true });
    });

    it('should throw a ValidationError when the conversation cannot be deleted', async () => {
      const client = createClientMock({
        delete: jest
          .fn()
          .mockRejectedValue(createConversationNotFoundError({ conversationId: 'c-1' })),
      });
      const step = getConversationDeleteStepDefinition(createServiceManager(client));

      const error = await step
        .handler(createContext({ input: { conversation_id: 'c-1' } }))
        .then(() => undefined)
        .catch((e) => e);

      expect(error).toBeInstanceOf(ExecutionError);
      expect((error as ExecutionError).toSerializableObject().type).toBe('ValidationError');
    });
  });
});
