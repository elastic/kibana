/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import {
  ConversationAccessControlMode,
  ConversationAccessControlRole,
  createConversationNotFoundError,
} from '@kbn/agent-builder-common';
import { AssignmentsService, WrongTemplateError } from './assignments_service';

const MOCK_CONVERSATION_PUBLIC = {
  id: 'conv-1',
  template_id: 'escalation',
  access_control: { access_mode: ConversationAccessControlMode.Public, entries: [] },
  metadata: {},
};

const MOCK_CONVERSATION_PRIVATE = {
  id: 'conv-1',
  template_id: 'escalation',
  access_control: { access_mode: ConversationAccessControlMode.Private, entries: [] },
  metadata: {},
};

const withAssignees = (
  base: typeof MOCK_CONVERSATION_PRIVATE,
  assignees: string[]
): typeof MOCK_CONVERSATION_PRIVATE => ({
  ...base,
  metadata: { ...base.metadata, assignees },
});

const makeClient = (overrides: Record<string, jest.Mock> = {}) => ({
  get: jest.fn().mockResolvedValue(MOCK_CONVERSATION_PUBLIC),
  addAccessControlEntries: jest.fn().mockResolvedValue({}),
  removeAccessControlEntries: jest.fn().mockResolvedValue({}),
  patchMetadata: jest.fn().mockResolvedValue({ conversation: MOCK_CONVERSATION_PUBLIC }),
  ...overrides,
});

const makeService = (clientMock: ReturnType<typeof makeClient>) => {
  const getConversationClient = jest.fn().mockResolvedValue(clientMock);
  return new AssignmentsService({ getConversationClient });
};

const request = httpServerMock.createKibanaRequest();

describe('AssignmentsService.assign', () => {
  it('throws WrongTemplateError when the conversation has a different template', async () => {
    const client = makeClient({
      get: jest
        .fn()
        .mockResolvedValue({ ...MOCK_CONVERSATION_PUBLIC, template_id: 'investigation' }),
    });
    const service = makeService(client);

    await expect(
      service.assign({
        request,
        conversationId: 'conv-1',
        assignees: ['user-1'],
        expectedTemplate: 'escalation',
      })
    ).rejects.toBeInstanceOf(WrongTemplateError);

    expect(client.addAccessControlEntries).not.toHaveBeenCalled();
    expect(client.patchMetadata).not.toHaveBeenCalled();
    expect(client.removeAccessControlEntries).not.toHaveBeenCalled();
  });

  it('propagates an error from client.get without calling any writes', async () => {
    const notFoundError = createConversationNotFoundError({ conversationId: 'conv-1' });
    const client = makeClient({
      get: jest.fn().mockRejectedValue(notFoundError),
    });
    const service = makeService(client);

    await expect(
      service.assign({
        request,
        conversationId: 'conv-1',
        assignees: ['user-1'],
        expectedTemplate: 'escalation',
      })
    ).rejects.toThrow();

    expect(client.addAccessControlEntries).not.toHaveBeenCalled();
    expect(client.patchMetadata).not.toHaveBeenCalled();
    expect(client.removeAccessControlEntries).not.toHaveBeenCalled();
  });

  it('public conversation: no ACL calls, patchMetadata called with converse access', async () => {
    const client = makeClient({
      get: jest.fn().mockResolvedValue(MOCK_CONVERSATION_PUBLIC),
    });
    const service = makeService(client);

    await service.assign({
      request,
      conversationId: 'conv-1',
      assignees: ['user-1'],
      expectedTemplate: 'escalation',
    });

    expect(client.addAccessControlEntries).not.toHaveBeenCalled();
    expect(client.removeAccessControlEntries).not.toHaveBeenCalled();
    expect(client.patchMetadata).toHaveBeenCalledWith(
      'conv-1',
      { assignees: ['user-1'] },
      { access: 'converse' }
    );
  });

  it('private: add + remove → calls addAccessControlEntries([added]), patchMetadata, removeAccessControlEntries([removed]) in order', async () => {
    const callOrder: string[] = [];
    const client = makeClient({
      get: jest
        .fn()
        .mockResolvedValue(withAssignees(MOCK_CONVERSATION_PRIVATE, ['user-a', 'user-b'])),
      addAccessControlEntries: jest.fn().mockImplementation(() => {
        callOrder.push('addAccessControlEntries');
        return Promise.resolve({});
      }),
      patchMetadata: jest.fn().mockImplementation(() => {
        callOrder.push('patchMetadata');
        return Promise.resolve({ conversation: MOCK_CONVERSATION_PRIVATE });
      }),
      removeAccessControlEntries: jest.fn().mockImplementation(() => {
        callOrder.push('removeAccessControlEntries');
        return Promise.resolve(MOCK_CONVERSATION_PRIVATE);
      }),
    });
    const service = makeService(client);

    // user-b stays, user-a removed, user-c added
    await service.assign({
      request,
      conversationId: 'conv-1',
      assignees: ['user-b', 'user-c'],
      expectedTemplate: 'escalation',
    });

    expect(client.addAccessControlEntries).toHaveBeenCalledWith(
      'conv-1',
      [{ type: 'user', id: 'user-c', role: ConversationAccessControlRole.Member }],
      { access: 'converse' }
    );
    expect(client.patchMetadata).toHaveBeenCalledWith(
      'conv-1',
      { assignees: ['user-b', 'user-c'] },
      { access: 'converse' }
    );
    expect(client.removeAccessControlEntries).toHaveBeenCalledWith(
      'conv-1',
      [{ type: 'user', id: 'user-a' }],
      { access: 'converse' }
    );
    expect(callOrder).toEqual([
      'addAccessControlEntries',
      'patchMetadata',
      'removeAccessControlEntries',
    ]);
  });

  it('private, only removals: addAccessControlEntries not called, removeAccessControlEntries called', async () => {
    const client = makeClient({
      get: jest
        .fn()
        .mockResolvedValue(withAssignees(MOCK_CONVERSATION_PRIVATE, ['user-a', 'user-b'])),
      removeAccessControlEntries: jest.fn().mockResolvedValue(MOCK_CONVERSATION_PRIVATE),
    });
    const service = makeService(client);

    await service.assign({
      request,
      conversationId: 'conv-1',
      assignees: ['user-b'],
      expectedTemplate: 'escalation',
    });

    expect(client.addAccessControlEntries).not.toHaveBeenCalled();
    expect(client.removeAccessControlEntries).toHaveBeenCalledWith(
      'conv-1',
      [{ type: 'user', id: 'user-a' }],
      { access: 'converse' }
    );
  });

  it('private, only additions: removeAccessControlEntries not called, addAccessControlEntries called', async () => {
    const client = makeClient({
      get: jest.fn().mockResolvedValue(withAssignees(MOCK_CONVERSATION_PRIVATE, ['user-a'])),
    });
    const service = makeService(client);

    await service.assign({
      request,
      conversationId: 'conv-1',
      assignees: ['user-a', 'user-b'],
      expectedTemplate: 'escalation',
    });

    expect(client.addAccessControlEntries).toHaveBeenCalledWith(
      'conv-1',
      [{ type: 'user', id: 'user-b', role: ConversationAccessControlRole.Member }],
      { access: 'converse' }
    );
    expect(client.removeAccessControlEntries).not.toHaveBeenCalled();
  });

  it('private, no change: neither ACL call happens', async () => {
    const client = makeClient({
      get: jest
        .fn()
        .mockResolvedValue(withAssignees(MOCK_CONVERSATION_PRIVATE, ['user-a', 'user-b'])),
    });
    const service = makeService(client);

    await service.assign({
      request,
      conversationId: 'conv-1',
      assignees: ['user-a', 'user-b'],
      expectedTemplate: 'escalation',
    });

    expect(client.addAccessControlEntries).not.toHaveBeenCalled();
    expect(client.removeAccessControlEntries).not.toHaveBeenCalled();
    expect(client.patchMetadata).toHaveBeenCalled();
  });

  it('private, missing metadata.assignees counts as empty (adds everyone)', async () => {
    const client = makeClient({
      get: jest.fn().mockResolvedValue(MOCK_CONVERSATION_PRIVATE), // metadata: {} — no assignees key
    });
    const service = makeService(client);

    await service.assign({
      request,
      conversationId: 'conv-1',
      assignees: ['user-1', 'user-2'],
      expectedTemplate: 'escalation',
    });

    expect(client.addAccessControlEntries).toHaveBeenCalledWith(
      'conv-1',
      [
        { type: 'user', id: 'user-1', role: ConversationAccessControlRole.Member },
        { type: 'user', id: 'user-2', role: ConversationAccessControlRole.Member },
      ],
      { access: 'converse' }
    );
    expect(client.removeAccessControlEntries).not.toHaveBeenCalled();
  });

  it('returns the conversation from removeAccessControlEntries when something was removed', async () => {
    const removedConv = { ...MOCK_CONVERSATION_PRIVATE, metadata: { assignees: ['user-b'] } };
    const client = makeClient({
      get: jest
        .fn()
        .mockResolvedValue(withAssignees(MOCK_CONVERSATION_PRIVATE, ['user-a', 'user-b'])),
      removeAccessControlEntries: jest.fn().mockResolvedValue(removedConv),
    });
    const service = makeService(client);

    const result = await service.assign({
      request,
      conversationId: 'conv-1',
      assignees: ['user-b'],
      expectedTemplate: 'escalation',
    });

    expect(result).toBe(removedConv);
  });

  it('returns the conversation from patchMetadata when nothing was removed', async () => {
    const updatedConv = { ...MOCK_CONVERSATION_PUBLIC, metadata: { assignees: ['user-1'] } };
    const client = makeClient({
      patchMetadata: jest.fn().mockResolvedValue({ conversation: updatedConv }),
    });
    const service = makeService(client);

    const result = await service.assign({
      request,
      conversationId: 'conv-1',
      assignees: ['user-1'],
      expectedTemplate: 'escalation',
    });

    expect(result).toBe(updatedConv);
  });
});
