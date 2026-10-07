/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { AttachmentPublicClient, ConversationPublicClient } from '@kbn/agent-builder-server';
import { InvestigationsForbiddenError } from '../../investigations/services/investigations_forbidden_error';
import { createSubjectsClient } from './subjects_client';
import type { SubjectsService } from './subjects_service';

const request = httpServerMock.createKibanaRequest();
const user = { username: 'analyst', fullName: null, email: null };

const setup = ({
  allowed = true,
  readableIds = ['conv-1', 'conv-2'],
}: { allowed?: boolean; readableIds?: string[] } = {}) => {
  const service = {
    upsertSubjects: jest.fn().mockResolvedValue([]),
    findConversationIdsBySubjects: jest.fn().mockResolvedValue(['conv-1']),
    listByConversationIds: jest.fn().mockResolvedValue([]),
    claimSubjects: jest.fn().mockResolvedValue({ claimed: true }),
  };
  const deny = jest.fn().mockRejectedValue(new InvestigationsForbiddenError('Missing privilege'));
  const privileges = {
    assertCanManage: allowed ? jest.fn().mockResolvedValue(undefined) : deny,
    assertCanRead: allowed ? jest.fn().mockResolvedValue(undefined) : deny,
  };
  const conversations = {
    bulkGet: jest.fn(
      async (ids: string[]) =>
        new Map(ids.filter((id) => readableIds.includes(id)).map((id) => [id, { id }] as const))
    ),
  } as unknown as ConversationPublicClient;
  const attachments = {} as AttachmentPublicClient;
  const client = createSubjectsClient({
    getSubjectsService: () => service as unknown as SubjectsService,
    getSpaceId: () => 'space-a',
    privileges,
    resolveUser: jest.fn().mockResolvedValue(user),
    getConversationClient: async () => conversations,
    getAttachmentClient: async () => attachments,
  })(request);
  return { service, privileges, client, conversations, attachments };
};

describe('createSubjectsClient', () => {
  it('writes in the request space as the request user', async () => {
    const { client, service, privileges, conversations, attachments } = setup();
    const subjects = [{ type: 'manual' as const, id: 'q-1', summary: 'Why?' }];

    await client.upsertSubjects('conv-1', subjects);

    expect(privileges.assertCanManage).toHaveBeenCalledWith(request);
    expect(service.upsertSubjects).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      subjects,
      spaceId: 'space-a',
      user,
      conversations,
      attachments,
    });
  });

  it('reads and claims in the request space', async () => {
    const { client, service } = setup();
    const isHolderOpen = jest.fn();

    await expect(
      client.findConversationIdsBySubjects([{ type: 'alert', id: 'a-1' }])
    ).resolves.toEqual(['conv-1']);
    await client.claimSubjects({
      conversationId: 'conv-2',
      subjects: [{ type: 'alert', id: 'a-1' }],
      isHolderOpen,
    });

    expect(service.findConversationIdsBySubjects).toHaveBeenCalledWith(
      [{ type: 'alert', id: 'a-1' }],
      'space-a'
    );
    expect(service.claimSubjects).toHaveBeenCalledWith({
      conversationId: 'conv-2',
      subjects: [{ type: 'alert', id: 'a-1' }],
      isHolderOpen,
      spaceId: 'space-a',
    });
  });

  it('leaves out investigations the caller cannot read', async () => {
    const { client, service } = setup({ readableIds: ['conv-2'] });
    service.findConversationIdsBySubjects.mockResolvedValue(['conv-1', 'conv-2']);

    await expect(
      client.findConversationIdsBySubjects([{ type: 'alert', id: 'a-1' }])
    ).resolves.toEqual(['conv-2']);

    await client.listByConversationIds(['conv-1', 'conv-2']);
    expect(service.listByConversationIds).toHaveBeenCalledWith(['conv-2'], 'space-a');
  });

  it('does not read subjects when the caller can read none of the investigations', async () => {
    const { client, service } = setup({ readableIds: [] });

    await expect(client.listByConversationIds(['private-1'])).resolves.toEqual([]);
    expect(service.listByConversationIds).not.toHaveBeenCalled();
  });

  it('checks the privilege before touching the index', async () => {
    const { client, service } = setup({ allowed: false });

    await expect(client.upsertSubjects('conv-1', [])).rejects.toBeInstanceOf(
      InvestigationsForbiddenError
    );
    await expect(client.listByConversationIds(['conv-1'])).rejects.toBeInstanceOf(
      InvestigationsForbiddenError
    );
    await expect(
      client.claimSubjects({ conversationId: 'c', subjects: [], isHolderOpen: jest.fn() })
    ).rejects.toBeInstanceOf(InvestigationsForbiddenError);

    expect(service.upsertSubjects).not.toHaveBeenCalled();
    expect(service.listByConversationIds).not.toHaveBeenCalled();
    expect(service.claimSubjects).not.toHaveBeenCalled();
  });
});
