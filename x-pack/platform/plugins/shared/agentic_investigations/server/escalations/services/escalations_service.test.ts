/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import {
  ConversationAccessControlMode,
  ConversationAccessControlRole,
} from '@kbn/agent-builder-common';
import { EscalationsService } from './escalations_service';
import { InvalidLinkedInvestigationError, NotAnEscalationError } from './errors';
import { CloseTargetsChangedError } from '../../investigations/services/close_targets_changed_error';
import { LinkedInvestigationUnavailableError } from './linked_investigation_unavailable_error';
import { EscalationCloseIncompleteError } from './escalation_close_incomplete_error';
import {
  ESCALATION_LINKED_INVESTIGATIONS_FIELD,
  ESCALATION_TEMPLATE_ID,
  INVESTIGATION_TEMPLATE_ID,
} from '../../../common/escalations/constants';

const logger = loggingSystemMock.createLogger();
const request = httpServerMock.createKibanaRequest();

const INVESTIGATION_METADATA = {
  status: 'open',
  severity: 'high',
  summary: 'Suspicious activity',
  workflow_execution_id: 'wf-123', // investigation-only; must not reach the escalation
};

const MOCK_INVESTIGATION = {
  id: 'inv-1',
  title: 'My Investigation',
  template_id: INVESTIGATION_TEMPLATE_ID,
  agent_id: 'default-agent',
  metadata: INVESTIGATION_METADATA,
};

const MOCK_ESCALATION = {
  id: 'escalation-1',
  template_id: ESCALATION_TEMPLATE_ID,
  title: 'My Investigation',
};

const ESCALATION_TEMPLATE = {
  id: ESCALATION_TEMPLATE_ID,
  version: 1,
  name: 'Escalation',
  description: 'Use for escalations',
  fields: {
    status: {
      input_type: 'SELECT',
      default_value: 'open',
      required: true,
      options: ['open', 'closed'],
    },
    severity: {
      input_type: 'SELECT',
      required: false,
      options: ['low', 'medium', 'high', 'critical'],
    },
    assignees: { input_type: 'TEXT_ARRAY', required: false },
    verdict: { input_type: 'TEXT', required: false, max_length: 10000 },
    summary: { input_type: 'TEXT', required: false, max_length: 10000 },
    description: { input_type: 'TEXT', required: false },
    close_reason: {
      input_type: 'SELECT',
      required: false,
      options: ['false_positive', 'benign', 'resolved', 'duplicate', 'other'],
    },
    linked_investigations: { input_type: 'TEXT_ARRAY' },
  },
};

const makeClient = (overrides: Record<string, jest.Mock> = {}) => ({
  get: jest.fn().mockResolvedValue(MOCK_INVESTIGATION),
  // bulkGet returns a Map<id, conversation>; default resolves each id as a valid investigation.
  bulkGet: jest.fn().mockImplementation(async (ids: string[]) => {
    return new Map(
      ids.map((id) => [id, { ...MOCK_INVESTIGATION, id, template_id: INVESTIGATION_TEMPLATE_ID }])
    );
  }),
  list: jest.fn(),
  search: jest.fn().mockResolvedValue({ results: [], total: 0 }),
  create: jest.fn().mockResolvedValue(MOCK_ESCALATION),
  patchMetadata: jest.fn().mockResolvedValue({
    conversation: MOCK_ESCALATION,
    changedFields: [ESCALATION_LINKED_INVESTIGATIONS_FIELD],
  }),
  update: jest.fn().mockResolvedValue(MOCK_ESCALATION),
  ...overrides,
});

const makeService = (clientOverrides: Record<string, jest.Mock> = {}) => {
  const client = makeClient(clientOverrides);
  const getConversationClient = jest.fn().mockResolvedValue(client);
  const conversationTemplates = {
    get: jest.fn().mockResolvedValue(ESCALATION_TEMPLATE),
    list: jest.fn(),
  };

  // Minimal stub — only needed for setStatus / getClosePreview tests.
  const investigationStatusService = {
    getPreview: jest.fn().mockResolvedValue({ pending_proposal_count: 0, pending_proposals: [] }),
    listPendingProposalsForRequest: jest.fn().mockResolvedValue([]),
    setStatus: jest.fn().mockResolvedValue({
      conversation_id: '',
      status: 'closed',
      dismissed_proposal_ids: [],
      failed_proposal_ids: [],
    }),
  };

  const service = new EscalationsService({
    logger,
    getConversationClient,
    conversationTemplates,
    getInvestigationStatusService: () => investigationStatusService as never,
  });

  return {
    service,
    client,
    getConversationClient,
    conversationTemplates,
    investigationStatusService,
  };
};

describe('EscalationsService.create', () => {
  it('creates with templateId: "escalation"', async () => {
    const { service, client } = makeService();

    await service.create(request, {
      linked_investigation_id: 'inv-1',
      visibility: 'public',
      collaborators: [],
    });

    expect(client.create).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: ESCALATION_TEMPLATE_ID })
    );
  });

  it('never passes agentId — inherits the default agent', async () => {
    const { service, client } = makeService();

    await service.create(request, {
      linked_investigation_id: 'inv-1',
      visibility: 'public',
      collaborators: [],
    });

    expect(client.create).toHaveBeenCalledWith(
      expect.not.objectContaining({ agentId: expect.anything() })
    );
  });

  it('never calls applyTemplate — escalation is born with the escalation template', async () => {
    const { service, client } = makeService();
    const applyTemplate = jest.fn();
    Object.assign(client, { applyTemplate });

    await service.create(request, {
      linked_investigation_id: 'inv-1',
      visibility: 'public',
      collaborators: [],
    });

    expect(applyTemplate).not.toHaveBeenCalled();
  });

  it('throws InvalidLinkedInvestigationError when linked_investigation_id is not an investigation', async () => {
    const { service } = makeService({
      get: jest.fn().mockResolvedValue({
        ...MOCK_INVESTIGATION,
        template_id: 'escalation', // not an investigation
      }),
    });

    await expect(
      service.create(request, {
        linked_investigation_id: 'inv-1',
        visibility: 'public',
        collaborators: [],
      })
    ).rejects.toBeInstanceOf(InvalidLinkedInvestigationError);
  });

  it('filters out workflow_execution_id from the copied metadata', async () => {
    const { service, client } = makeService();

    await service.create(request, {
      linked_investigation_id: 'inv-1',
      visibility: 'public',
      collaborators: [],
    });

    const { metadata } = client.create.mock.calls[0][0];
    expect(metadata).not.toHaveProperty('workflow_execution_id');
  });

  it('sets linked_investigations to [linked_investigation_id] in metadata', async () => {
    const { service, client } = makeService();

    await service.create(request, {
      linked_investigation_id: 'inv-1',
      visibility: 'public',
      collaborators: [],
    });

    const { metadata } = client.create.mock.calls[0][0];
    expect(metadata[ESCALATION_LINKED_INVESTIGATIONS_FIELD]).toEqual(['inv-1']);
  });

  it('copies the overlapping metadata fields from the investigation', async () => {
    const { service, client } = makeService();

    await service.create(request, {
      linked_investigation_id: 'inv-1',
      visibility: 'public',
      collaborators: [],
    });

    const { metadata } = client.create.mock.calls[0][0];
    // severity and summary are in both templates
    expect(metadata).toHaveProperty('severity', 'high');
    expect(metadata).toHaveProperty('summary', 'Suspicious activity');
  });

  it('does NOT copy status — lets the escalation template default (open) apply', async () => {
    const { service, client } = makeService({
      get: jest.fn().mockResolvedValue({
        ...MOCK_INVESTIGATION,
        metadata: { ...INVESTIGATION_METADATA, status: 'closed' },
      }),
    });

    await service.create(request, {
      linked_investigation_id: 'inv-1',
      visibility: 'public',
      collaborators: [],
    });

    const { metadata } = client.create.mock.calls[0][0];
    // status excluded from copy so the template's 'open' default applies
    expect(metadata).not.toHaveProperty('status');
  });

  it('sets access_mode: Public with no entries when visibility is "public"', async () => {
    const { service, client } = makeService();

    await service.create(request, {
      linked_investigation_id: 'inv-1',
      visibility: 'public',
      collaborators: [],
    });

    const { accessControl } = client.create.mock.calls[0][0];
    expect(accessControl.access_mode).toBe(ConversationAccessControlMode.Public);
    expect(accessControl).not.toHaveProperty('entries');
  });

  it('sets access_mode: Private with mapped collaborator entries when visibility is "private"', async () => {
    const { service, client } = makeService();

    await service.create(request, {
      linked_investigation_id: 'inv-1',
      visibility: 'private',
      collaborators: ['user-a', 'user-b'],
    });

    const { accessControl } = client.create.mock.calls[0][0];
    expect(accessControl.access_mode).toBe(ConversationAccessControlMode.Private);
    expect(accessControl.entries).toEqual([
      { type: 'user', id: 'user-a', role: ConversationAccessControlRole.Member },
      { type: 'user', id: 'user-b', role: ConversationAccessControlRole.Member },
    ]);
    // added_at is stamped by createConversationPublicClient, not here
    expect(accessControl.entries[0]).not.toHaveProperty('added_at');
  });

  it('uses the investigation title as the escalation initial title', async () => {
    const { service, client } = makeService();

    await service.create(request, {
      linked_investigation_id: 'inv-1',
      visibility: 'public',
      collaborators: [],
    });

    const { title } = client.create.mock.calls[0][0];
    expect(title).toBe(MOCK_INVESTIGATION.title);
  });

  it('uses a caller-supplied title instead of the investigation title when provided', async () => {
    const { service, client } = makeService();

    await service.create(request, {
      linked_investigation_id: 'inv-1',
      title: 'Custom escalation title',
      visibility: 'public',
      collaborators: [],
    });

    const { title } = client.create.mock.calls[0][0];
    expect(title).toBe('Custom escalation title');
  });

  it('throws when the escalation template is not found', async () => {
    const { service, conversationTemplates } = makeService();
    conversationTemplates.get.mockResolvedValue(undefined);

    await expect(
      service.create(request, {
        linked_investigation_id: 'inv-1',
        visibility: 'public',
        collaborators: [],
      })
    ).rejects.toThrow(/"escalation" not found/);
  });

  it('sets assignees in metadata when provided', async () => {
    const { service, client } = makeService();

    await service.create(request, {
      linked_investigation_id: 'inv-1',
      visibility: 'public',
      collaborators: [],
      assignees: ['uid-creator'],
    });

    const { metadata } = client.create.mock.calls[0][0];
    expect(metadata.assignees).toEqual(['uid-creator']);
  });

  it('does not set assignees in metadata when empty', async () => {
    const { service, client } = makeService();

    await service.create(request, {
      linked_investigation_id: 'inv-1',
      visibility: 'public',
      collaborators: [],
      assignees: [],
    });

    const { metadata } = client.create.mock.calls[0][0];
    expect(metadata).not.toHaveProperty('assignees');
  });
});

describe('EscalationsService.update', () => {
  it('throws NotAnEscalationError when target is not an escalation', async () => {
    const { service } = makeService({
      get: jest.fn().mockResolvedValue({
        ...MOCK_INVESTIGATION,
        template_id: INVESTIGATION_TEMPLATE_ID,
      }),
    });

    await expect(
      service.update(request, 'not-an-escalation', { title: 'New title' })
    ).rejects.toBeInstanceOf(NotAnEscalationError);
  });

  it('calls patchMetadata when linked_investigations are provided (appends, not replaces)', async () => {
    const { service, client } = makeService({
      get: jest.fn().mockResolvedValue({
        id: 'escalation-1',
        template_id: ESCALATION_TEMPLATE_ID,
        metadata: { [ESCALATION_LINKED_INVESTIGATIONS_FIELD]: ['inv-1'] },
      }),
    });

    await service.update(request, 'escalation-1', {
      linked_investigations: ['inv-2'],
    });

    expect(client.patchMetadata).toHaveBeenCalledWith(
      'escalation-1',
      expect.objectContaining({
        [ESCALATION_LINKED_INVESTIGATIONS_FIELD]: ['inv-1', 'inv-2'],
      }),
      { access: 'converse' }
    );
  });

  it('deduplicates linked_investigations — does not add an existing id again', async () => {
    const { service, client } = makeService({
      get: jest.fn().mockResolvedValue({
        id: 'escalation-1',
        template_id: ESCALATION_TEMPLATE_ID,
        metadata: { [ESCALATION_LINKED_INVESTIGATIONS_FIELD]: ['inv-1', 'inv-2'] },
      }),
    });

    await service.update(request, 'escalation-1', {
      linked_investigations: ['inv-2', 'inv-3'],
    });

    const { [ESCALATION_LINKED_INVESTIGATIONS_FIELD]: updated } =
      client.patchMetadata.mock.calls[0][1];
    expect(updated).toEqual(['inv-1', 'inv-2', 'inv-3']);
  });

  it('calls client.update when title is provided', async () => {
    const { service, client } = makeService({
      get: jest.fn().mockResolvedValue({
        id: 'escalation-1',
        template_id: ESCALATION_TEMPLATE_ID,
        metadata: {},
      }),
    });

    await service.update(request, 'escalation-1', { title: 'Renamed' });

    expect(client.update).toHaveBeenCalledWith({ id: 'escalation-1', title: 'Renamed' });
  });

  it('does not call patchMetadata for a title-only update', async () => {
    const { service, client } = makeService({
      get: jest.fn().mockResolvedValue({
        id: 'escalation-1',
        template_id: ESCALATION_TEMPLATE_ID,
        metadata: {},
      }),
    });

    await service.update(request, 'escalation-1', { title: 'Renamed' });

    expect(client.patchMetadata).not.toHaveBeenCalled();
  });

  it('does not call client.update for a links-only update', async () => {
    const { service, client } = makeService({
      get: jest.fn().mockResolvedValue({
        id: 'escalation-1',
        template_id: ESCALATION_TEMPLATE_ID,
        metadata: { [ESCALATION_LINKED_INVESTIGATIONS_FIELD]: [] },
      }),
    });

    await service.update(request, 'escalation-1', {
      linked_investigations: ['inv-1'],
    });

    expect(client.update).not.toHaveBeenCalled();
  });
});

describe('EscalationsService.list', () => {
  const MOCK_SUMMARY = {
    id: 'escalation-1',
    template_id: ESCALATION_TEMPLATE_ID,
    title: 'My Escalation',
  };

  it('calls client.search with the fixed non-closed escalations filter', async () => {
    const { service, client } = makeService({
      search: jest.fn().mockResolvedValue({ results: [MOCK_SUMMARY], total: 1 }),
    });

    await service.list(request, { page: 1, per_page: 50, status: 'open' });

    expect(client.search).toHaveBeenCalledWith(
      expect.objectContaining({
        // The filter must reference `metadata.status`, not the bare `status` field,
        // which maps to ConversationRoundStatus — not the escalation template field.
        filter: expect.stringContaining('metadata.status'),
      })
    );
    expect(client.search).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.stringContaining(`template_id: "${ESCALATION_TEMPLATE_ID}"`),
      })
    );
    expect(client.search).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.stringContaining('not (metadata.status: "closed")'),
      })
    );
  });

  it('uses metadata.status: "closed" filter when status is "closed"', async () => {
    const { service, client } = makeService({
      search: jest.fn().mockResolvedValue({ results: [], total: 0 }),
    });

    await service.list(request, { page: 1, per_page: 50, status: 'closed' });

    expect(client.search).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.stringContaining('metadata.status: "closed"'),
      })
    );
    // Must not also apply the "not closed" clause.
    const { filter } = (client.search as jest.Mock).mock.calls[0][0] as { filter: string };
    expect(filter).not.toContain('not (metadata.status');
  });

  it('uses template-only filter (no status clause) when status is "all"', async () => {
    const { service, client } = makeService({
      search: jest.fn().mockResolvedValue({ results: [], total: 0 }),
    });

    await service.list(request, { page: 1, per_page: 50, status: 'all' });

    const { filter } = (client.search as jest.Mock).mock.calls[0][0] as { filter: string };
    // Template clause must be present.
    expect(filter).toContain(`template_id: "${ESCALATION_TEMPLATE_ID}"`);
    // No status filtering at all.
    expect(filter).not.toContain('metadata.status');
  });

  it('passes sort updated_at desc explicitly to client.search', async () => {
    const { service, client } = makeService({
      search: jest.fn().mockResolvedValue({ results: [], total: 0 }),
    });

    await service.list(request, { page: 1, per_page: 50, status: 'open' });

    expect(client.search).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: { field: 'updated_at', order: 'desc' },
      })
    );
  });

  it('passes page and per_page through to client.search', async () => {
    const { service, client } = makeService({
      search: jest.fn().mockResolvedValue({ results: [], total: 0 }),
    });

    await service.list(request, { page: 3, per_page: 25, status: 'open' });

    expect(client.search).toHaveBeenCalledWith(expect.objectContaining({ page: 3, perPage: 25 }));
  });

  it('wraps the client result in the pagination envelope', async () => {
    const { service } = makeService({
      search: jest.fn().mockResolvedValue({ results: [MOCK_SUMMARY], total: 42 }),
    });

    const result = await service.list(request, { page: 2, per_page: 10, status: 'open' });

    expect(result).toEqual({
      pagination: { total: 42, page: 2, per_page: 10 },
      results: [MOCK_SUMMARY],
    });
  });

  it('returns empty results and total 0 when client.search returns nothing', async () => {
    const { service } = makeService({
      search: jest.fn().mockResolvedValue({ results: [], total: 0 }),
    });

    const result = await service.list(request, { page: 1, per_page: 50, status: 'open' });

    expect(result).toEqual({
      pagination: { total: 0, page: 1, per_page: 50 },
      results: [],
    });
  });

  it('forwards the search string to client.search as query', async () => {
    const { service, client } = makeService({
      search: jest.fn().mockResolvedValue({ results: [], total: 0 }),
    });

    await service.list(request, { page: 1, per_page: 50, status: 'open', search: 'critical' });

    expect(client.search).toHaveBeenCalledWith(expect.objectContaining({ query: 'critical' }));
  });

  it('omits query from client.search when search is not provided', async () => {
    const { service, client } = makeService({
      search: jest.fn().mockResolvedValue({ results: [], total: 0 }),
    });

    await service.list(request, { page: 1, per_page: 50, status: 'open' });

    expect(client.search).toHaveBeenCalledWith(expect.objectContaining({ query: undefined }));
  });
});

describe('EscalationsService.getClosePreview', () => {
  const ESCALATION_WITH_LINKED = {
    ...MOCK_ESCALATION,
    template_id: ESCALATION_TEMPLATE_ID,
    metadata: { linked_investigations: ['inv-1', 'inv-2'] },
  };

  it('returns empty open_investigations when there are no linked investigations', async () => {
    const { service, client } = makeService();
    client.get.mockResolvedValue({
      ...MOCK_ESCALATION,
      template_id: ESCALATION_TEMPLATE_ID,
      metadata: {},
    });

    const result = await service.getClosePreview(request, 'escalation-1');
    expect(result).toEqual({ open_investigations: [], unavailable_investigation_ids: [] });
  });

  it('includes pending_proposals from the investigation preview', async () => {
    const { service, client, investigationStatusService } = makeService();
    client.get.mockResolvedValue(ESCALATION_WITH_LINKED);
    client.bulkGet.mockImplementation(
      async (ids: string[]) =>
        new Map(
          ids.map((id) => [
            id,
            {
              id,
              title: `Inv ${id}`,
              template_id: INVESTIGATION_TEMPLATE_ID,
              metadata: { status: 'open' },
            },
          ])
        )
    );
    investigationStatusService.getPreview.mockResolvedValue({
      pending_proposal_count: 2,
      pending_proposals: [
        { id: 'p-1', action_name: 'Block IP' },
        { id: 'p-2', action_name: null },
      ],
    });

    const result = await service.getClosePreview(request, 'escalation-1');

    expect(result.open_investigations).toHaveLength(2);
    expect(result.open_investigations[0].pending_proposal_count).toBe(2);
    expect(result.open_investigations[0].pending_proposals).toEqual([
      { id: 'p-1', action_name: 'Block IP' },
      { id: 'p-2', action_name: null },
    ]);
  });

  it('excludes already-closed linked investigations', async () => {
    const { service, client } = makeService();
    client.get.mockResolvedValue(ESCALATION_WITH_LINKED);
    client.bulkGet.mockResolvedValue(
      new Map([
        [
          'inv-1',
          {
            id: 'inv-1',
            title: 'Open',
            template_id: INVESTIGATION_TEMPLATE_ID,
            metadata: { status: 'open' },
          },
        ],
        [
          'inv-2',
          {
            id: 'inv-2',
            title: 'Closed',
            template_id: INVESTIGATION_TEMPLATE_ID,
            metadata: { status: 'closed' },
          },
        ],
      ])
    );

    const result = await service.getClosePreview(request, 'escalation-1');
    expect(result.open_investigations).toHaveLength(1);
    expect(result.open_investigations[0].id).toBe('inv-1');
  });

  it('throws NotAnEscalationError when the conversation is not an escalation', async () => {
    const { service, client } = makeService();
    client.get.mockResolvedValue({ ...MOCK_INVESTIGATION, template_id: INVESTIGATION_TEMPLATE_ID });

    await expect(service.getClosePreview(request, 'not-an-escalation')).rejects.toBeInstanceOf(
      NotAnEscalationError
    );
  });
});

describe('EscalationsService.setStatus — pre-flight checks', () => {
  const OPEN_INV = {
    id: 'inv-1',
    title: 'Open',
    template_id: INVESTIGATION_TEMPLATE_ID,
    metadata: { status: 'open' },
  };
  const ESCALATION_WITH_LINKED = {
    ...MOCK_ESCALATION,
    template_id: ESCALATION_TEMPLATE_ID,
    metadata: { linked_investigations: ['inv-1'] },
  };

  it('throws CloseTargetsChangedError when an unexpected linked investigation is open', async () => {
    const { service, client } = makeService();
    client.get.mockResolvedValue(ESCALATION_WITH_LINKED);
    client.bulkGet.mockResolvedValue(new Map([['inv-1', OPEN_INV]]));

    await expect(
      service.setStatus(request, 'escalation-1', {
        status: 'closed',
        expected_investigation_ids: ['some-other-id'], // inv-1 is not in this list
      })
    ).rejects.toBeInstanceOf(CloseTargetsChangedError);
  });

  it('throws CloseTargetsChangedError when an unexpected proposal is pending', async () => {
    const { service, client, investigationStatusService } = makeService();
    client.get.mockResolvedValue(ESCALATION_WITH_LINKED);
    client.bulkGet.mockResolvedValue(new Map([['inv-1', OPEN_INV]]));
    // The service sees proposal p-2 as pending, but the client only told us about p-1.
    investigationStatusService.listPendingProposalsForRequest.mockResolvedValue([
      { id: 'p-1', action_name: null },
      { id: 'p-2', action_name: null },
    ]);

    await expect(
      service.setStatus(request, 'escalation-1', {
        status: 'closed',
        expected_investigation_ids: ['inv-1'],
        expected_proposal_ids: ['p-1'], // p-2 is missing → changed
      })
    ).rejects.toBeInstanceOf(CloseTargetsChangedError);
  });

  it('does not throw when an expected proposal is no longer pending (already decided)', async () => {
    const { service, client, investigationStatusService } = makeService();
    client.get.mockResolvedValue(ESCALATION_WITH_LINKED);
    client.bulkGet.mockResolvedValue(new Map([['inv-1', OPEN_INV]]));
    // p-2 was in the list shown to the user but has since been decided — that is fine.
    investigationStatusService.listPendingProposalsForRequest.mockResolvedValue([
      { id: 'p-1', action_name: null },
    ]);
    client.patchMetadata.mockResolvedValue({
      conversation: { ...MOCK_ESCALATION, template_id: ESCALATION_TEMPLATE_ID },
    });

    await expect(
      service.setStatus(request, 'escalation-1', {
        status: 'closed',
        expected_investigation_ids: ['inv-1'],
        expected_proposal_ids: ['p-1', 'p-2'], // p-2 is gone but was expected → OK
      })
    ).resolves.not.toThrow();
  });

  it('does not run pre-flight when expected_proposal_ids is absent', async () => {
    const { service, client, investigationStatusService } = makeService();
    client.get.mockResolvedValue(ESCALATION_WITH_LINKED);
    client.bulkGet.mockResolvedValue(new Map([['inv-1', OPEN_INV]]));
    // Even with proposals present, no pre-flight → no throw.
    investigationStatusService.listPendingProposalsForRequest.mockResolvedValue([
      { id: 'p-surprise', action_name: null },
    ]);
    client.patchMetadata.mockResolvedValue({
      conversation: { ...MOCK_ESCALATION, template_id: ESCALATION_TEMPLATE_ID },
    });

    await expect(
      service.setStatus(request, 'escalation-1', { status: 'closed' })
    ).resolves.not.toThrow();

    expect(investigationStatusService.listPendingProposalsForRequest).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// LinkedInvestigationUnavailableError — unresolvable linked id handling
// ---------------------------------------------------------------------------

describe('EscalationsService — unresolvable linked investigation', () => {
  const ESCALATION_WITH_LINKED = {
    ...MOCK_ESCALATION,
    template_id: ESCALATION_TEMPLATE_ID,
    metadata: { linked_investigations: ['inv-1', 'inv-missing'] },
  };

  it('setStatus throws LinkedInvestigationUnavailableError when a linked id is missing from bulkGet', async () => {
    const { service, client } = makeService();
    client.get.mockResolvedValue(ESCALATION_WITH_LINKED);
    // bulkGet only resolves inv-1; inv-missing is gone / inaccessible.
    client.bulkGet.mockResolvedValue(
      new Map([
        [
          'inv-1',
          {
            id: 'inv-1',
            title: 'Open',
            template_id: INVESTIGATION_TEMPLATE_ID,
            metadata: { status: 'open' },
          },
        ],
      ])
    );

    await expect(
      service.setStatus(request, 'escalation-1', { status: 'closed' })
    ).rejects.toBeInstanceOf(LinkedInvestigationUnavailableError);

    // The escalation must not be patched.
    expect(client.patchMetadata).not.toHaveBeenCalled();
  });

  it('getClosePreview returns unavailable_investigation_ids for missing linked ids', async () => {
    const { service, client, investigationStatusService } = makeService();
    client.get.mockResolvedValue(ESCALATION_WITH_LINKED);
    // bulkGet only resolves inv-1.
    client.bulkGet.mockResolvedValue(
      new Map([
        [
          'inv-1',
          {
            id: 'inv-1',
            title: 'Open',
            template_id: INVESTIGATION_TEMPLATE_ID,
            metadata: { status: 'open' },
          },
        ],
      ])
    );
    investigationStatusService.getPreview.mockResolvedValue({
      pending_proposal_count: 0,
      pending_proposals: [],
    });

    const result = await service.getClosePreview(request, 'escalation-1');

    expect(result.unavailable_investigation_ids).toEqual(['inv-missing']);
    // The open investigation still appears normally.
    expect(result.open_investigations).toHaveLength(1);
  });

  it('setStatus succeeds when all linked ids resolve', async () => {
    const { service, client } = makeService();
    client.get.mockResolvedValue({
      ...MOCK_ESCALATION,
      template_id: ESCALATION_TEMPLATE_ID,
      metadata: { linked_investigations: ['inv-1'] },
    });
    client.bulkGet.mockResolvedValue(
      new Map([
        [
          'inv-1',
          {
            id: 'inv-1',
            title: 'Open',
            template_id: INVESTIGATION_TEMPLATE_ID,
            metadata: { status: 'closed' }, // already closed — skip, nothing to do
          },
        ],
      ])
    );
    client.patchMetadata.mockResolvedValue({
      conversation: { ...MOCK_ESCALATION, template_id: ESCALATION_TEMPLATE_ID },
    });

    await expect(
      service.setStatus(request, 'escalation-1', { status: 'closed' })
    ).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// EscalationsService.setStatus — partial close / incomplete cascade
// ---------------------------------------------------------------------------

describe('EscalationsService.setStatus — partial close leaves escalation open', () => {
  const OPEN_INV = {
    id: 'inv-1',
    title: 'Open',
    template_id: INVESTIGATION_TEMPLATE_ID,
    metadata: { status: 'open' },
  };

  it('throws EscalationCloseIncompleteError and does not patch the escalation', async () => {
    const { service, client, investigationStatusService } = makeService();
    client.get.mockResolvedValue({
      ...MOCK_ESCALATION,
      template_id: ESCALATION_TEMPLATE_ID,
      metadata: { linked_investigations: ['inv-1'] },
    });
    client.bulkGet.mockResolvedValue(new Map([['inv-1', OPEN_INV]]));
    // Simulate the investigation close failing.
    investigationStatusService.setStatus.mockRejectedValueOnce(new Error('storage error'));

    await expect(
      service.setStatus(request, 'escalation-1', { status: 'closed' })
    ).rejects.toBeInstanceOf(EscalationCloseIncompleteError);

    // The escalation itself must remain open.
    expect(client.patchMetadata).not.toHaveBeenCalled();
  });
});
