/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { createCasesClientMock, createCasesClientMockArgs } from '../mocks';
import {
  ensureRoom,
  getRoomAccessControl,
  postFromRoom,
  throwIfUnassigningRoomOwner,
} from './room';

const restrictedCase = {
  id: 'case-1',
  title: 'Credential dumping',
  owner: 'securitySolution',
  access: { mode: 'restricted' },
  assignees: [{ uid: 'u-jordan' }, { uid: 'u-priya' }],
  room_conversation_id: null,
} as never;

const buildConversations = () => ({
  bulkGet: jest.fn().mockResolvedValue(new Map()),
  create: jest.fn().mockResolvedValue({ id: 'room-1' }),
  delete: jest.fn(),
  get: jest.fn(),
  updateAccessControlAsOwner: jest.fn(),
});

describe('case room', () => {
  let casesClient: ReturnType<typeof createCasesClientMock>;
  let clientArgs: ReturnType<typeof createCasesClientMockArgs> & Record<string, unknown>;
  let conversations: ReturnType<typeof buildConversations>;

  beforeEach(() => {
    casesClient = createCasesClientMock();
    conversations = buildConversations();
    clientArgs = createCasesClientMockArgs() as typeof clientArgs;
    Object.assign(clientArgs, {
      config: { agentic: { enabled: true } },
      agentBuilder: {
        conversations: { getScopedClient: jest.fn().mockResolvedValue(conversations) },
      },
    });
    casesClient.cases.get.mockResolvedValue(restrictedCase);
    clientArgs.services.caseService.getCase.mockResolvedValue({
      id: 'case-1',
      version: 'v1',
      attributes: {},
    } as never);
  });

  it('gives a restricted case a private room with its assignees as members', () => {
    expect(getRoomAccessControl(restrictedCase)).toEqual({
      access_mode: 'private',
      entries: [
        { type: 'user', id: 'u-jordan', role: 'member' },
        { type: 'user', id: 'u-priya', role: 'member' },
      ],
    });
  });

  it('creates the room on first open and records it on the case', async () => {
    const res = await ensureRoom({ caseId: 'case-1' }, clientArgs as never, casesClient);

    expect(res).toEqual({ conversation_id: 'room-1', created: true });
    expect(conversations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        accessControl: expect.objectContaining({ access_mode: 'private' }),
      })
    );
    expect(clientArgs.services.caseService.patchCase).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: 'case-1',
        version: 'v1',
        updatedAttributes: { room_conversation_id: 'room-1', room_owner_uid: expect.anything() },
      })
    );
  });

  it('keeps the room another person created at the same time', async () => {
    clientArgs.services.caseService.patchCase.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createConflictError('cases', 'case-1')
    );
    clientArgs.services.caseService.getCase
      .mockResolvedValueOnce({ id: 'case-1', version: 'v1', attributes: {} } as never)
      .mockResolvedValueOnce({
        id: 'case-1',
        version: 'v2',
        attributes: { room_conversation_id: 'room-0' },
      } as never);

    const res = await ensureRoom({ caseId: 'case-1' }, clientArgs as never, casesClient);

    expect(conversations.delete).toHaveBeenCalledWith('room-1');
    expect(res).toEqual({ conversation_id: 'room-0', created: false });
  });

  it('needs Cases update to create the room', async () => {
    clientArgs.authorization.ensureAuthorized.mockRejectedValueOnce(new Error('Unauthorized'));
    await expect(
      ensureRoom({ caseId: 'case-1' }, clientArgs as never, casesClient)
    ).rejects.toThrow();
    expect(conversations.create).not.toHaveBeenCalled();
  });

  it("doesn't open the room of a case the user can't see", async () => {
    casesClient.cases.get.mockRejectedValue(new Error('Not found'));
    await expect(
      ensureRoom({ caseId: 'case-1' }, clientArgs as never, casesClient)
    ).rejects.toThrow();
    expect(conversations.create).not.toHaveBeenCalled();
  });

  it('posts an agent reply with the agent as the actor', async () => {
    casesClient.cases.get.mockResolvedValue({
      ...(restrictedCase as object),
      room_conversation_id: 'room-1',
    } as never);
    conversations.get.mockResolvedValue({
      id: 'room-1',
      agent_id: 'elastic-ai-agent',
      events: [
        { id: 'e-1', type: 'user_message', data: { message: 'what happened?' } },
        {
          id: 'r-1::execution_terminated',
          type: 'execution_terminated',
          data: { outcome: { type: 'responded', response: { message: 'LSASS dump.' } } },
        },
      ],
    });
    const asAgent = createCasesClientMock();
    const getAs = jest.fn().mockResolvedValue(asAgent);

    await postFromRoom(
      { caseId: 'case-1', request: { event_id: 'r-1::execution_terminated' } },
      clientArgs as never,
      casesClient,
      getAs
    );

    expect(getAs).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'agent', id: 'elastic-ai-agent', run_id: 'room-1' })
    );
    expect(asAgent.attachments.add).toHaveBeenCalledWith({
      caseId: 'case-1',
      comment: { type: 'comment', owner: 'securitySolution', data: { content: 'LSASS dump.' } },
    });
  });

  it("posts a person's message as the poster, naming its author", async () => {
    casesClient.cases.get.mockResolvedValue({
      ...(restrictedCase as object),
      room_conversation_id: 'room-1',
    } as never);
    conversations.get.mockResolvedValue({
      id: 'room-1',
      agent_id: 'a',
      events: [
        {
          id: 'e-1',
          type: 'user_message',
          actor: { full_name: 'Priya Raman' },
          data: { message: 'Isolated fin-ws-07' },
        },
      ],
    });

    await postFromRoom(
      { caseId: 'case-1', request: { event_id: 'e-1' } },
      clientArgs as never,
      casesClient,
      jest.fn()
    );

    expect(casesClient.attachments.add).toHaveBeenCalledWith({
      caseId: 'case-1',
      comment: {
        type: 'comment',
        owner: 'securitySolution',
        data: { content: 'Isolated fin-ws-07\n\n_Posted from the room by Priya Raman_' },
      },
    });
  });

  it('refuses a message that is not in the case room', async () => {
    casesClient.cases.get.mockResolvedValue({
      ...(restrictedCase as object),
      room_conversation_id: 'room-1',
    } as never);
    conversations.get.mockResolvedValue({ id: 'room-1', agent_id: 'a', events: [] });

    await expect(
      postFromRoom(
        { caseId: 'case-1', request: { event_id: 'other' } },
        clientArgs as never,
        casesClient,
        jest.fn()
      )
    ).rejects.toThrow();
    expect(casesClient.attachments.add).not.toHaveBeenCalled();
  });

  it("refuses to unassign the room's owner, naming them, and allows every other change", async () => {
    const originalCase = {
      attributes: { room_owner_uid: 'u-jordan', title: 'Credential dumping' },
    };
    await expect(
      throwIfUnassigningRoomOwner(
        [{ updateReq: { id: 'case-1', assignees: [{ uid: 'u-priya' }] }, originalCase }],
        async () => 'Jordan Alvarez'
      )
    ).rejects.toThrow(
      'Jordan Alvarez can\'t be removed from the assignees of "Credential dumping". Jordan Alvarez opened this case\'s room and owns it'
    );
    await expect(
      throwIfUnassigningRoomOwner([
        { updateReq: { id: 'case-1', assignees: [{ uid: 'u-priya' }] }, originalCase },
      ])
    ).rejects.toThrow('The person who opened the room of "Credential dumping"');
    await expect(
      throwIfUnassigningRoomOwner([
        { updateReq: { id: 'case-1', assignees: [{ uid: 'u-jordan' }] }, originalCase },
        { updateReq: { id: 'case-1' }, originalCase },
        {
          updateReq: { id: 'case-2', assignees: [] },
          originalCase: { attributes: { title: 'No room yet' } },
        },
      ])
    ).resolves.toBeUndefined();
  });
});
