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
import type { ProposalsService } from '../../proposals/services/proposals_service';
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

const makeProposalsService = (proposals: Array<{ id: string }> = []): ProposalsService =>
  ({
    list: jest.fn().mockResolvedValue({ proposals, total: proposals.length }),
    releaseGate: jest.fn().mockResolvedValue(undefined),
  } as unknown as ProposalsService);

const makeWorkflowsApi = (execution?: object) =>
  ({
    getWorkflowExecution: jest.fn().mockResolvedValue(execution),
    cancelWorkflowExecution: jest.fn().mockResolvedValue(undefined),
  } as unknown);

describe('InvestigationsService.updateAssignees', () => {
  const logger = loggingSystemMock.createLogger();
  const request = httpServerMock.createKibanaRequest();

  const makeService = (
    client: ConversationPublicClient,
    profileUids: string[] = [],
    proposalsService?: ProposalsService
  ): InvestigationsService => {
    const coreStart = coreMock.createStart();
    coreStart.userProfile.bulkGet.mockResolvedValue(profileUids.map(makeProfile));

    return new InvestigationsService({
      logger,
      getConversationClient: jest.fn().mockResolvedValue(client),
      userProfile: coreStart.userProfile,
      getProposalsService: () => proposalsService ?? makeProposalsService(),
      getWorkflowsApi: () => makeWorkflowsApi() as never,
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
      getProposalsService: () => makeProposalsService(),
      getWorkflowsApi: () => makeWorkflowsApi() as never,
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
});

describe('InvestigationsService.close', () => {
  const logger = loggingSystemMock.createLogger();
  const request = httpServerMock.createKibanaRequest();

  const makeCloseService = (
    client: ConversationPublicClient,
    proposalsService?: ProposalsService,
    workflowsApi?: ReturnType<typeof makeWorkflowsApi>
  ): InvestigationsService => {
    const coreStart = coreMock.createStart();
    return new InvestigationsService({
      logger,
      getConversationClient: jest.fn().mockResolvedValue(client),
      userProfile: coreStart.userProfile,
      getProposalsService: () => proposalsService ?? makeProposalsService(),
      getWorkflowsApi: () => (workflowsApi ?? makeWorkflowsApi()) as never,
    });
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('patches status and close_reason, returns closed status', async () => {
    const conversation = makeConversation({ metadata: { status: 'open' } });
    const client = makeClient(conversation);
    const service = makeCloseService(client);

    const result = await service.close(request, 'inv-1', { closeReason: 'resolved' }, 'default');

    expect(client.patchMetadata).toHaveBeenCalledWith('inv-1', {
      status: 'closed',
      close_reason: 'resolved',
    });
    expect(result.status).toBe('closed');
  });

  it('throws NotAnInvestigationError when the conversation has wrong template', async () => {
    const client = makeClient(makeConversation({ template_id: 'escalation' as never }));
    const service = makeCloseService(client);

    await expect(
      service.close(request, 'esc-1', { closeReason: 'resolved' }, 'default')
    ).rejects.toBeInstanceOf(NotAnInvestigationError);
  });

  it('declines pending proposals and returns the count', async () => {
    const client = makeClient(makeConversation());
    const proposalsService = makeProposalsService([{ id: 'prop-1' }, { id: 'prop-2' }]);
    const service = makeCloseService(client, proposalsService);

    const result = await service.close(request, 'inv-1', { closeReason: 'resolved' }, 'default');

    expect(proposalsService.releaseGate).toHaveBeenCalledTimes(2);
    expect(result.declinedProposalCount).toBe(2);
  });

  it('cancels the workflow when workflow_execution_id is present in metadata', async () => {
    const conversation = makeConversation({
      metadata: { status: 'open', workflow_execution_id: 'exec-abc' },
    });
    const client = makeClient(conversation);
    const workflowsApi = makeWorkflowsApi({ id: 'exec-abc', finishedAt: null });
    const service = makeCloseService(client, undefined, workflowsApi);

    const result = await service.close(request, 'inv-1', { closeReason: 'resolved' }, 'default');

    expect(
      (workflowsApi as { cancelWorkflowExecution: jest.Mock }).cancelWorkflowExecution
    ).toHaveBeenCalledWith('exec-abc', 'default', request);
    expect(result.workflowCancelled).toBe(true);
  });

  it('returns workflowCancelled false when no workflow_execution_id is set', async () => {
    const client = makeClient(makeConversation({ metadata: { status: 'open' } }));
    const service = makeCloseService(client);

    const result = await service.close(request, 'inv-1', { closeReason: 'resolved' }, 'default');

    expect(result.workflowCancelled).toBe(false);
  });
});
