/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, coreMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { ConversationPublicClient } from '@kbn/agent-builder-server';
import type { ConversationWithPermissions } from '@kbn/agent-builder-common';
import type { UserProfile } from '@kbn/core/server';
import { InvestigationsService } from './investigations_service';
import { NotAnInvestigationError, UnknownAssigneesError } from './errors';

const makeConversation = (
  overrides: Partial<ConversationWithPermissions> = {}
): ConversationWithPermissions =>
  ({
    id: 'inv-1',
    template_id: 'investigation',
    title: 'Test investigation',
    metadata: { status: 'open', assignees: [] },
    permissions: {
      canConverse: true,
      canDelete: false,
      canRename: true,
      canUpdateAccessControl: false,
    },
    ...overrides,
  } as unknown as ConversationWithPermissions);

const makeClient = (conversation: ConversationWithPermissions): ConversationPublicClient =>
  ({
    get: jest.fn().mockResolvedValue(conversation),
    patchMetadata: jest.fn().mockImplementation(async (_id, updates) =>
      Promise.resolve({
        conversation: { ...conversation, metadata: { ...conversation.metadata, ...updates } },
        changedFields: Object.keys(updates),
      })
    ),
  } as unknown as ConversationPublicClient);

const makeProfile = (uid: string): UserProfile => ({ uid } as unknown as UserProfile);

describe('InvestigationsService.updateAssignees', () => {
  const logger = loggingSystemMock.createLogger();
  const request = httpServerMock.createKibanaRequest();

  const makeService = (
    client: ConversationPublicClient,
    profileUids: string[] = []
  ): InvestigationsService => {
    const coreStart = coreMock.createStart();
    coreStart.userProfile.bulkGet.mockResolvedValue(profileUids.map(makeProfile));

    return new InvestigationsService({
      logger,
      getConversationClient: jest.fn().mockResolvedValue(client),
      userProfile: coreStart.userProfile,
    });
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the stored assignees after a successful patch', async () => {
    const conversation = makeConversation({ metadata: { status: 'open', assignees: [] } });
    const client = makeClient(conversation);
    const service = makeService(client, ['uid-1', 'uid-2']);

    const result = await service.updateAssignees(request, 'inv-1', {
      assignees: ['uid-1', 'uid-2'],
    });

    expect(result).toEqual({ assignees: ['uid-1', 'uid-2'] });
  });

  it('calls patchMetadata with the supplied assignees', async () => {
    const client = makeClient(makeConversation());
    const service = makeService(client, ['uid-1']);

    await service.updateAssignees(request, 'inv-1', { assignees: ['uid-1'] });

    expect(client.patchMetadata).toHaveBeenCalledWith('inv-1', { assignees: ['uid-1'] });
  });

  it('allows an empty assignees array without calling bulkGet', async () => {
    const coreStart = coreMock.createStart();
    const client = makeClient(makeConversation({ metadata: { status: 'open', assignees: [] } }));

    const service = new InvestigationsService({
      logger,
      getConversationClient: jest.fn().mockResolvedValue(client),
      userProfile: coreStart.userProfile,
    });

    const result = await service.updateAssignees(request, 'inv-1', { assignees: [] });

    expect(result.assignees).toEqual([]);
    expect(coreStart.userProfile.bulkGet).not.toHaveBeenCalled();
  });

  it('throws NotAnInvestigationError when the conversation is not an investigation', async () => {
    const client = makeClient(makeConversation({ template_id: 'escalation' as never }));
    const service = makeService(client, []);

    await expect(
      service.updateAssignees(request, 'esc-1', { assignees: [] })
    ).rejects.toBeInstanceOf(NotAnInvestigationError);
  });

  it('throws UnknownAssigneesError when a profile uid does not exist', async () => {
    // bulkGet only returns uid-1; uid-999 is unknown
    const client = makeClient(makeConversation());
    const service = makeService(client, ['uid-1']);

    await expect(
      service.updateAssignees(request, 'inv-1', { assignees: ['uid-1', 'uid-999'] })
    ).rejects.toBeInstanceOf(UnknownAssigneesError);
  });

  it('UnknownAssigneesError message lists the unknown uid', async () => {
    const client = makeClient(makeConversation());
    const service = makeService(client, []);

    const error = await service
      .updateAssignees(request, 'inv-1', { assignees: ['uid-missing'] })
      .catch((e) => e);

    expect(error).toBeInstanceOf(UnknownAssigneesError);
    expect(error.message).toContain('"uid-missing"');
  });

  it('returns a one-element array when ES collapses the stored value to a bare string', async () => {
    // Elasticsearch's `flattened` field type collapses a single-element array to a bare
    // string on round-trip. patchMetadata returns the stored document, so after writing
    // ["uid-1"] we may read back "uid-1" (not ["uid-1"]). readAssignees must handle this.
    const conversation = makeConversation({ metadata: { status: 'open', assignees: [] } });
    const client: ConversationPublicClient = {
      get: jest.fn().mockResolvedValue(conversation),
      patchMetadata: jest.fn().mockResolvedValue({
        conversation: { ...conversation, metadata: { status: 'open', assignees: 'uid-1' } },
        changedFields: ['assignees'],
      }),
    } as unknown as ConversationPublicClient;
    const service = makeService(client, ['uid-1']);

    const result = await service.updateAssignees(request, 'inv-1', { assignees: ['uid-1'] });

    expect(result).toEqual({ assignees: ['uid-1'] });
  });
});
