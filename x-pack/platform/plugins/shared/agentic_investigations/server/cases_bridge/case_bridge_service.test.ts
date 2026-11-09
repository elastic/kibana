/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { CaseBridgeService, InvestigationAlreadyLinkedError } from './case_bridge_service';
import type { BridgeCase } from './case_bridge_service';

const createdCase = {
  id: 'case-1',
  title: 'Credential dumping on fin-ws-07',
  owner: 'securitySolution',
  incremental_id: 1287,
  status: 'open',
  version: 'v1',
  assignees: [{ uid: 'u-jordan' }, { uid: 'u-priya' }],
  access: { mode: 'restricted' },
  connector: { id: 'none' },
};

const investigation = (id: string, metadata: Record<string, unknown> = {}) => ({
  id,
  title: `Investigation ${id}`,
  agent_id: 'alert-triage',
  template_id: 'investigation',
  metadata: { status: 'open', ...metadata },
});

const setup = ({ canManage = true }: { canManage?: boolean } = {}) => {
  const conversations = {
    get: jest.fn(async (id: string) =>
      investigation(
        id,
        id === 'inv-1' ? { verdict: 'True positive: LSASS dump', severity: 'high' } : {}
      )
    ),
    bulkGet: jest.fn(),
    patchMetadata: jest.fn().mockResolvedValue({}),
    addEvents: jest.fn().mockResolvedValue([]),
    updateAccessControlAsOwner: jest.fn().mockResolvedValue(undefined),
  };
  const casesClient = {
    cases: {
      create: jest.fn().mockResolvedValue(createdCase),
      get: jest.fn().mockResolvedValue(createdCase),
      push: jest.fn(),
      bulkUpdate: jest.fn(),
    },
    templates: { getTemplate: jest.fn().mockResolvedValue(undefined) },
    attachments: {
      bulkCreate: jest.fn().mockResolvedValue([]),
      bulkGet: jest.fn().mockResolvedValue({ attachments: [], errors: [] }),
      find: jest.fn().mockResolvedValue({
        data: [
          { type: 'agentic.investigation', attachmentId: 'inv-1' },
          { type: 'agentic.investigation', attachmentId: 'inv-2' },
        ],
      }),
    },
  };
  const statusService = {
    getPreview: jest.fn().mockResolvedValue({
      pending_proposal_count: 1,
      pending_proposals: [{ id: 'p-1', action_name: 'close_alerts' }],
      running_proposal_count: 0,
    }),
    setStatus: jest.fn().mockResolvedValue({}),
  };
  const service = new CaseBridgeService({
    logger: loggingSystemMock.createLogger(),
    getCases: () =>
      ({
        getCasesClientWithRequest: jest.fn().mockResolvedValue(casesClient),
      } as never),
    getAgentBuilder: () =>
      ({ conversations: { getScopedClient: jest.fn().mockResolvedValue(conversations) } } as never),
    getInvestigationStatusService: () => statusService as never,
    getActor: () => ({ type: 'user' as never, id: 'u-jordan', username: 'jordan' }),
    getCurrentUserProfileUid: async () => 'u-jordan',
    canManageInvestigations: async () => canManage,
  });
  return { service, conversations, casesClient, statusService };
};

const request = httpServerMock.createKibanaRequest();

describe('CaseBridgeService', () => {
  describe('openCase', () => {
    it("pushes once after linking, then turns on the template's automatic push", async () => {
      const { service, casesClient } = setup();
      const withConnector = {
        ...createdCase,
        connector: { id: 'snow-1', name: 'POC ServiceNow', type: '.servicenow' },
        settings: {
          syncAlerts: true,
          externalSync: { autoPush: false, conflictStrategy: 'kibana' },
        },
      };
      casesClient.cases.create.mockResolvedValueOnce(withConnector);
      casesClient.cases.get.mockResolvedValueOnce({ ...withConnector, version: 'v3' });
      casesClient.templates.getTemplate.mockResolvedValueOnce({
        attributes: {
          definition:
            'connector:\n  id: snow-1\n  type: .servicenow\nsettings:\n  externalSync:\n    autoPush: true\n    conflictStrategy: kibana\n',
        },
      });

      const result = await service.openCase(request, 'inv-1', {
        title: 'Credential dumping on fin-ws-07',
        visibility: 'public',
        assignees: [],
        linked_investigation_ids: [],
        push: true,
        template_id: 'system-ai-investigation',
      });

      // Opened with automatic push off: a listener push racing the link writes opened a
      // second incident.
      expect(casesClient.cases.create.mock.calls[0][0].settings).toEqual({
        syncAlerts: true,
        externalSync: { autoPush: false, conflictStrategy: 'kibana' },
      });
      expect(casesClient.cases.push).toHaveBeenCalledTimes(1);
      expect(casesClient.attachments.bulkCreate.mock.invocationCallOrder[0]).toBeLessThan(
        casesClient.cases.push.mock.invocationCallOrder[0]
      );
      expect(casesClient.cases.bulkUpdate).toHaveBeenCalledWith({
        cases: [
          {
            id: 'case-1',
            version: 'v3',
            settings: {
              syncAlerts: true,
              externalSync: { autoPush: true, conflictStrategy: 'kibana' },
            },
          },
        ],
      });
      expect(result).toMatchObject({ pushed: true, connector_name: 'POC ServiceNow' });
    });

    it('leaves automatic push off when the push fails, so the analyst pushes once from the case', async () => {
      const { service, casesClient } = setup();
      casesClient.cases.create.mockResolvedValueOnce({
        ...createdCase,
        connector: { id: 'snow-1', name: 'POC ServiceNow', type: '.servicenow' },
      });
      casesClient.cases.push.mockRejectedValueOnce(new Error('ServiceNow is down'));
      casesClient.templates.getTemplate.mockResolvedValueOnce({
        attributes: { definition: 'settings:\n  externalSync:\n    autoPush: true\n' },
      });

      const result = await service.openCase(request, 'inv-1', {
        title: 'Credential dumping on fin-ws-07',
        visibility: 'public',
        assignees: [],
        linked_investigation_ids: [],
        push: true,
        template_id: 'system-ai-investigation',
      });

      expect(result.pushed).toBe(false);
      expect(casesClient.cases.bulkUpdate).not.toHaveBeenCalled();
    });

    it('with push off, neither pushes nor turns on automatic push', async () => {
      const { service, casesClient } = setup();
      casesClient.cases.create.mockResolvedValueOnce({
        ...createdCase,
        connector: { id: 'snow-1', name: 'POC ServiceNow', type: '.servicenow' },
      });
      casesClient.templates.getTemplate.mockResolvedValueOnce({
        attributes: { definition: 'settings:\n  externalSync:\n    autoPush: true\n' },
      });

      const result = await service.openCase(request, 'inv-1', {
        title: 'Credential dumping on fin-ws-07',
        visibility: 'public',
        assignees: [],
        linked_investigation_ids: [],
        push: false,
        template_id: 'system-ai-investigation',
      });

      expect(casesClient.cases.push).not.toHaveBeenCalled();
      expect(casesClient.cases.bulkUpdate).not.toHaveBeenCalled();
      expect(result.pushed).toBe(false);
    });

    it('opens a restricted AlertZero case and links each investigation by reference', async () => {
      const { service, casesClient, conversations } = setup();

      const result = await service.openCase(request, 'inv-1', {
        title: 'Credential dumping on fin-ws-07',
        visibility: 'restricted',
        assignees: ['u-priya'],
        linked_investigation_ids: ['inv-2'],
        push: false,
      });

      expect(casesClient.cases.create).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'securitySolution',
          tags: ['alertzero'],
          source: 'alertzero',
          access: { mode: 'restricted' },
          severity: 'high',
          assignees: [{ uid: 'u-jordan' }, { uid: 'u-priya' }],
          ai_verdict: expect.objectContaining({ verdict: 'true_positive' }),
        })
      );
      expect(casesClient.attachments.bulkCreate).toHaveBeenCalledWith({
        caseId: 'case-1',
        attachments: [
          expect.objectContaining({ type: 'agentic.investigation', attachmentId: 'inv-1' }),
          expect.objectContaining({ type: 'agentic.investigation', attachmentId: 'inv-2' }),
        ],
      });
      // The investigations' chats are attached too, for the room and the Attachments tab.
      expect(casesClient.attachments.bulkCreate).toHaveBeenCalledWith({
        caseId: 'case-1',
        attachments: [
          { type: 'agentBuilder.conversation', owner: 'securitySolution', attachmentId: 'inv-1' },
          { type: 'agentBuilder.conversation', owner: 'securitySolution', attachmentId: 'inv-2' },
        ],
      });
      expect(conversations.patchMetadata).toHaveBeenCalledWith(
        'inv-1',
        { case_id: 'case-1' },
        { access: 'converse' }
      );
      // A restricted case makes each linked investigation private to the case's assignees.
      expect(conversations.updateAccessControlAsOwner).toHaveBeenCalledWith(
        'inv-2',
        {
          access_mode: 'private',
          entries: [
            { type: 'user', id: 'u-jordan', role: 'member' },
            { type: 'user', id: 'u-priya', role: 'member' },
          ],
        },
        { actor: expect.objectContaining({ username: 'jordan' }) }
      );
      expect(result).toEqual({
        case_id: 'case-1',
        case_title: 'Credential dumping on fin-ws-07',
        incremental_id: 1287,
        linked: [{ id: 'inv-1' }, { id: 'inv-2' }],
        pushed: false,
      });
    });

    it('refuses an investigation that already has a case', async () => {
      const { service, conversations, casesClient } = setup();
      conversations.get.mockResolvedValueOnce(investigation('inv-1', { case_id: 'case-9' }));

      await expect(
        service.openCase(request, 'inv-1', {
          title: 't',
          visibility: 'public',
          assignees: [],
          linked_investigation_ids: [],
          push: false,
        })
      ).rejects.toBeInstanceOf(InvestigationAlreadyLinkedError);
      expect(casesClient.cases.create).not.toHaveBeenCalled();
    });
  });

  describe('linkCase', () => {
    it('answers not-found and writes nothing when the user cannot see the case', async () => {
      const { service, casesClient, conversations } = setup();
      casesClient.cases.get.mockRejectedValueOnce(Boom.notFound('Case not found'));

      await expect(service.linkCase(request, 'inv-3', 'restricted-case')).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
      expect(casesClient.attachments.bulkCreate).not.toHaveBeenCalled();
      expect(conversations.patchMetadata).not.toHaveBeenCalled();
    });
  });

  describe('onInvestigationsAttached', () => {
    it('writes the back-link for a link made outside the bridge (an agent tool, the API)', async () => {
      const { service, casesClient, conversations } = setup();
      conversations.get.mockResolvedValueOnce({
        ...investigation('inv-3'),
        permissions: { update_access_control: true },
      } as never);
      casesClient.attachments.bulkGet.mockResolvedValue({
        attachments: [{ id: 'a-3', type: 'agentic.investigation', attachmentId: 'inv-3' }],
        errors: [],
      });

      await service.onInvestigationsAttached({ request, caseId: 'case-1', attachmentIds: ['a-3'] });

      expect(conversations.patchMetadata).toHaveBeenCalledWith(
        'inv-3',
        { case_id: 'case-1' },
        { access: 'converse' }
      );
      // The case is restricted, so the investigation follows its access.
      expect(conversations.updateAccessControlAsOwner).toHaveBeenCalledWith(
        'inv-3',
        expect.objectContaining({ access_mode: 'private' }),
        expect.anything()
      );
    });

    it('leaves an investigation that already names the case alone', async () => {
      const { service, casesClient, conversations } = setup();
      casesClient.attachments.bulkGet.mockResolvedValue({
        attachments: [{ id: 'a-1', type: 'agentic.investigation', attachmentId: 'inv-1' }],
        errors: [],
      });
      conversations.get.mockResolvedValueOnce(investigation('inv-1', { case_id: 'case-1' }));

      await service.onInvestigationsAttached({ request, caseId: 'case-1', attachmentIds: ['a-1'] });

      expect(conversations.patchMetadata).not.toHaveBeenCalled();
      expect(conversations.addEvents).not.toHaveBeenCalled();
    });
  });

  it("doesn't link back an investigation the linker doesn't own, even to a public case", async () => {
    const { service, casesClient, conversations } = setup();
    casesClient.cases.get.mockResolvedValue({ ...createdCase, access: { mode: 'default' } });
    casesClient.attachments.bulkGet.mockResolvedValue({
      attachments: [{ id: 'a-5', type: 'agentic.investigation', attachmentId: 'inv-5' }],
      errors: [],
    });
    conversations.get.mockResolvedValueOnce({
      ...investigation('inv-5'),
      permissions: { update_access_control: false },
    } as never);

    await service.onInvestigationsAttached({ request, caseId: 'case-1', attachmentIds: ['a-5'] });

    expect(conversations.patchMetadata).not.toHaveBeenCalled();
  });

  it("won't take over the access of an investigation the linker doesn't own", async () => {
    const { service, casesClient, conversations } = setup();
    casesClient.attachments.bulkGet.mockResolvedValue({
      attachments: [{ id: 'a-4', type: 'agentic.investigation', attachmentId: 'inv-4' }],
      errors: [],
    });
    conversations.get.mockResolvedValueOnce({
      ...investigation('inv-4'),
      permissions: { update_access_control: false },
    } as never);

    await service.onInvestigationsAttached({ request, caseId: 'case-1', attachmentIds: ['a-4'] });

    expect(conversations.updateAccessControlAsOwner).not.toHaveBeenCalled();
    expect(conversations.patchMetadata).not.toHaveBeenCalled();
    expect(conversations.addEvents).not.toHaveBeenCalled();
  });

  describe('onCaseUpdated', () => {
    const before: BridgeCase = {
      id: 'case-1',
      title: 'Credential dumping',
      incremental_id: 1287,
      status: 'open',
      assignees: [{ uid: 'u-jordan' }],
      access: { mode: 'restricted' },
    };

    /** Both linked investigations name case-1 as their case. */
    const setupLinked = (metadata: Record<string, unknown> = {}, canManage = true) => {
      const result = setup({ canManage });
      result.conversations.get.mockImplementation(async (id: string) =>
        investigation(id, { case_id: 'case-1', ...metadata })
      );
      return result;
    };

    it('closes linked investigations with the pending proposals the close preview showed', async () => {
      const { service, statusService } = setupLinked();

      await service.onCaseUpdated({
        request,
        previousCase: before,
        updatedCase: { ...before, status: 'closed' },
      });

      expect(statusService.setStatus).toHaveBeenCalledTimes(2);
      expect(statusService.setStatus).toHaveBeenCalledWith(request, 'inv-1', {
        status: 'closed',
        expected_proposal_ids: ['p-1'],
        dismiss_reason: 'handled_elsewhere',
        rationale: 'Closed with case #1287',
      });
    });

    it('leaves the investigations open when the closer chose not to close them', async () => {
      const { service, statusService } = setupLinked();

      await service.onCaseUpdated({
        request,
        previousCase: before,
        updatedCase: { ...before, status: 'closed' },
        closeLinkedInvestigations: false,
      });

      expect(statusService.setStatus).not.toHaveBeenCalled();
    });

    it('reopens closed linked investigations when the case reopens', async () => {
      const { service, statusService } = setupLinked({ status: 'closed' });

      await service.onCaseUpdated({
        request,
        previousCase: { ...before, status: 'closed' },
        updatedCase: before,
      });

      expect(statusService.setStatus).toHaveBeenCalledWith(request, 'inv-2', { status: 'open' });
    });

    it('makes linked investigations public again when the case is no longer restricted', async () => {
      const { service, conversations } = setupLinked();

      await service.onCaseUpdated({
        request,
        previousCase: before,
        updatedCase: { ...before, access: { mode: 'default' } },
      });

      expect(conversations.updateAccessControlAsOwner).toHaveBeenCalledWith(
        'inv-1',
        { access_mode: 'public', entries: [] },
        expect.anything()
      );
    });

    it("keeps the investigations' access when the person changing the case can't manage investigations", async () => {
      const { service, conversations } = setupLinked({}, false);

      await service.onCaseUpdated({
        request,
        previousCase: before,
        updatedCase: { ...before, access: { mode: 'default' } },
      });

      expect(conversations.updateAccessControlAsOwner).not.toHaveBeenCalled();
    });

    it('ignores an attachment whose investigation does not link back to the case', async () => {
      // A forged or stale attachment: the conversation names another case, or none.
      const { service, conversations, statusService } = setup();
      conversations.get.mockImplementation(async (id: string) =>
        investigation(id, id === 'inv-1' ? { case_id: 'case-9' } : {})
      );

      await service.onCaseUpdated({
        request,
        previousCase: before,
        updatedCase: { ...before, status: 'closed', access: { mode: 'default' } },
      });

      expect(conversations.updateAccessControlAsOwner).not.toHaveBeenCalled();
      expect(statusService.setStatus).not.toHaveBeenCalled();
    });

    it('does nothing, without reading attachments, for unrelated changes', async () => {
      const { service, casesClient } = setup();

      await service.onCaseUpdated({
        request,
        previousCase: before,
        updatedCase: { ...before, title: 'Renamed' },
      });

      expect(casesClient.attachments.find).not.toHaveBeenCalled();
    });
  });
});
