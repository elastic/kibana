/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { InvestigationAttachmentInvalidRequestError } from '../../investigation_attachments';
import type { InvestigationsPrivilegesChecker } from './check_investigations_privileges';
import { createInvestigationsClient } from './investigations_client';
import { InvestigationsForbiddenError } from './investigations_forbidden_error';
import type { InvestigationsQueryService } from './investigations_query_service';
import type { WorkerCaseService } from '../../cases_bridge/worker_case_service';

const request = httpServerMock.createKibanaRequest();

const setup = (privileges: Partial<InvestigationsPrivilegesChecker> = {}) => {
  const queryService = {
    get: jest.fn().mockResolvedValue({ id: 'conv-1' }),
    list: jest.fn().mockResolvedValue({ results: [] }),
    severityCounts: jest.fn().mockResolvedValue({}),
    findOpenBySubjects: jest.fn().mockResolvedValue([]),
  };
  const deleteAllInSpace = jest.fn().mockResolvedValue({
    subjects: 1,
    subjectClaims: 1,
    impact: 1,
    hypotheses: 1,
  });
  const checker: InvestigationsPrivilegesChecker = {
    assertCanRead: jest.fn().mockResolvedValue(undefined),
    assertCanManage: jest.fn().mockResolvedValue(undefined),
    ...privileges,
  };
  const conversation = {
    id: 'conv-1',
    agent_id: 'agent-1',
    template_id: 'investigation',
    title: 'Alert Triage',
    metadata: { status: 'open' },
  };
  const conversations = {
    create: jest.fn().mockResolvedValue(conversation),
    patchMetadata: jest.fn().mockResolvedValue({
      conversation: { ...conversation, metadata: { status: 'closed' } },
      changedFields: ['status'],
    }),
  };
  const getConversationClient = jest.fn().mockResolvedValue(conversations);
  const workerCases = {
    onInvestigationCreated: jest.fn().mockResolvedValue(undefined),
    onInvestigationPatched: jest.fn().mockResolvedValue(undefined),
  };
  const client = createInvestigationsClient({
    getQueryService: () => queryService as unknown as InvestigationsQueryService,
    getSpaceId: () => 'space-1',
    privileges: checker,
    deleteAllInSpace,
    getConversationClient,
    getWorkerCases: () => workerCases as unknown as WorkerCaseService,
  })(request);
  return {
    client,
    queryService,
    deleteAllInSpace,
    checker,
    conversations,
    getConversationClient,
    workerCases,
  };
};

describe('createInvestigationsClient', () => {
  it('applies the list defaults before reading', async () => {
    const { client, queryService, checker } = setup();

    await client.list({ status: 'open' });

    expect(checker.assertCanRead).toHaveBeenCalledWith(request);
    expect(queryService.list).toHaveBeenCalledWith(request, {
      status: ['open'],
      sort_field: 'created_at',
      sort_order: 'desc',
      page: 1,
      per_page: 20,
    });
  });

  it('rejects an invalid query as a bad request', async () => {
    const { client, queryService } = setup();

    await expect(client.list({ per_page: 1000 })).rejects.toBeInstanceOf(
      InvestigationAttachmentInvalidRequestError
    );
    expect(queryService.list).not.toHaveBeenCalled();
  });

  it('checks the read privilege before every read', async () => {
    const deny = jest.fn().mockRejectedValue(new InvestigationsForbiddenError('nope'));
    const { client, queryService } = setup({ assertCanRead: deny });

    await expect(client.get('conv-1')).rejects.toBeInstanceOf(InvestigationsForbiddenError);
    await expect(client.list()).rejects.toBeInstanceOf(InvestigationsForbiddenError);
    await expect(client.severityCounts()).rejects.toBeInstanceOf(InvestigationsForbiddenError);
    await expect(client.findOpenBySubjects([{ type: 'alert', id: 'a' }])).rejects.toBeInstanceOf(
      InvestigationsForbiddenError
    );
    expect(queryService.get).not.toHaveBeenCalled();
    expect(queryService.list).not.toHaveBeenCalled();
    expect(queryService.severityCounts).not.toHaveBeenCalled();
    expect(queryService.findOpenBySubjects).not.toHaveBeenCalled();
  });

  it('needs the manage privilege for the maintenance delete and scopes it to the request space', async () => {
    const { client, deleteAllInSpace, checker } = setup();

    await expect(client.deleteAllInSpace()).resolves.toEqual({
      subjects: 1,
      subjectClaims: 1,
      impact: 1,
      hypotheses: 1,
    });
    expect(checker.assertCanManage).toHaveBeenCalledWith(request);
    expect(deleteAllInSpace).toHaveBeenCalledWith('space-1');
  });

  it('does not delete without the manage privilege', async () => {
    const { client, deleteAllInSpace } = setup({
      assertCanManage: jest.fn().mockRejectedValue(new InvestigationsForbiddenError('nope')),
    });

    await expect(client.deleteAllInSpace()).rejects.toBeInstanceOf(InvestigationsForbiddenError);
    expect(deleteAllInSpace).not.toHaveBeenCalled();
  });

  describe('create', () => {
    it('creates from the investigation template with the step source, as ai.conversation.create does', async () => {
      const { client, conversations, getConversationClient } = setup();

      const result = await client.create(
        { title: 'Alert Triage', metadata: { status: 'open' }, template_id: 'investigation' },
        { source: 'workflow' }
      );

      expect(getConversationClient).toHaveBeenCalledWith(request, 'workflow');
      expect(conversations.create).toHaveBeenCalledWith(
        expect.objectContaining({ templateId: 'investigation', title: 'Alert Triage' })
      );
      expect(result).toEqual({
        conversation_id: 'conv-1',
        agent_id: 'agent-1',
        template_id: 'investigation',
        metadata: { status: 'open' },
      });
    });

    it('returns the case the setting opened, with the Worker as its actor', async () => {
      const { client, workerCases } = setup();
      workerCases.onInvestigationCreated.mockResolvedValue('case-1');
      const actionSource = { type: 'workflow' as const, id: 'wf', name: 'Worker', run_id: 'run' };

      const result = await client.create({ title: 'Alert Triage' }, { actionSource });

      expect(workerCases.onInvestigationCreated).toHaveBeenCalledWith(
        request,
        expect.objectContaining({ id: 'conv-1' }),
        actionSource
      );
      expect(result.case_id).toBe('case-1');
      expect(result.metadata.case_id).toBe('case-1');
    });
  });

  describe('patchMetadata', () => {
    it('patches and hands the changed fields to the case mirror', async () => {
      const { client, conversations, workerCases } = setup();

      const result = await client.patchMetadata({
        conversation_id: 'conv-1',
        updates: { status: 'closed' },
      });

      expect(conversations.patchMetadata).toHaveBeenCalledWith('conv-1', { status: 'closed' });
      expect(workerCases.onInvestigationPatched).toHaveBeenCalledWith(
        request,
        expect.objectContaining({ id: 'conv-1' }),
        ['status'],
        undefined
      );
      expect(result).toEqual({
        conversation_id: 'conv-1',
        changed_fields: ['status'],
        metadata: { status: 'closed' },
      });
    });

    it('skips the mirror when nothing changed', async () => {
      const { client, conversations, workerCases } = setup();
      conversations.patchMetadata.mockResolvedValue({
        conversation: { id: 'conv-1', metadata: {} },
        changedFields: [],
      });

      await client.patchMetadata({ conversation_id: 'conv-1', updates: { status: 'open' } });

      expect(workerCases.onInvestigationPatched).not.toHaveBeenCalled();
    });
  });
});
