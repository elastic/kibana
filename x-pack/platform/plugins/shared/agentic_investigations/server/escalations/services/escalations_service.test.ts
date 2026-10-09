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
  workflow_execution_ids: ['wf-123'], // investigation-only; must not reach the escalation
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
  addEvents: jest.fn().mockResolvedValue([]),
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

  const attachmentsClient = {
    bulkCreate: jest.fn().mockResolvedValue({ created: [], errors: [] }),
  };
  const getAttachmentsClient = jest.fn().mockResolvedValue(attachmentsClient);

  const impactClient = {
    getEntityIdsByConversationId: jest.fn().mockResolvedValue(new Map<string, string[]>()),
  };
  const getImpactClient = jest.fn().mockReturnValue(impactClient);

  const service = new EscalationsService({
    logger,
    getImpactClient,
    getConversationClient,
    getAttachmentsClient,
    conversationTemplates,
    getInvestigationStatusService: () => investigationStatusService as never,
  });

  return {
    service,
    client,
    getConversationClient,
    getAttachmentsClient,
    attachmentsClient,
    conversationTemplates,
    investigationStatusService,
    getImpactClient,
    impactClient,
  };
};

describe('EscalationsService.create', () => {
  it('creates with templateId: "escalation"', async () => {
    const { service, client } = makeService();

    await service.create(request, {
      linked_investigation_id: 'inv-1',
      visibility: 'public',
      assignees: ['user-a'],
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
      assignees: ['user-a'],
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
      assignees: ['user-a'],
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
        assignees: ['user-a'],
      })
    ).rejects.toBeInstanceOf(InvalidLinkedInvestigationError);
  });

  it('filters out workflow_execution_ids from the copied metadata', async () => {
    const { service, client } = makeService();

    await service.create(request, {
      linked_investigation_id: 'inv-1',
      visibility: 'public',
      assignees: ['user-a'],
    });

    const { metadata } = client.create.mock.calls[0][0];
    expect(metadata).not.toHaveProperty('workflow_execution_ids');
  });

  it('sets linked_investigations to [linked_investigation_id] in metadata', async () => {
    const { service, client } = makeService();

    await service.create(request, {
      linked_investigation_id: 'inv-1',
      visibility: 'public',
      assignees: ['user-a'],
    });

    const { metadata } = client.create.mock.calls[0][0];
    expect(metadata[ESCALATION_LINKED_INVESTIGATIONS_FIELD]).toEqual(['inv-1']);
  });

  it('copies the overlapping metadata fields from the investigation', async () => {
    const { service, client } = makeService();

    await service.create(request, {
      linked_investigation_id: 'inv-1',
      visibility: 'public',
      assignees: ['user-a'],
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
      assignees: ['user-a'],
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
      assignees: ['user-a'],
    });

    const { accessControl } = client.create.mock.calls[0][0];
    expect(accessControl.access_mode).toBe(ConversationAccessControlMode.Public);
    expect(accessControl).not.toHaveProperty('entries');
  });

  it('sets access_mode: Private with assignees mapped to ACL entries when visibility is "private"', async () => {
    const { service, client } = makeService();

    await service.create(request, {
      linked_investigation_id: 'inv-1',
      visibility: 'private',
      assignees: ['user-a', 'user-b'],
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

  it('deduplicates repeated assignees in both the private ACL entries and metadata', async () => {
    const { service, client } = makeService();

    await service.create(request, {
      linked_investigation_id: 'inv-1',
      visibility: 'private',
      assignees: ['user-a', 'user-b', 'user-a'],
    });

    const { accessControl, metadata } = client.create.mock.calls[0][0];
    expect(accessControl.entries).toEqual([
      { type: 'user', id: 'user-a', role: ConversationAccessControlRole.Member },
      { type: 'user', id: 'user-b', role: ConversationAccessControlRole.Member },
    ]);
    expect(metadata.assignees).toEqual(['user-a', 'user-b']);
  });

  it('does not add ACL entries for a public escalation', async () => {
    const { service, client } = makeService();

    await service.create(request, {
      linked_investigation_id: 'inv-1',
      visibility: 'public',
      assignees: ['user-a'],
    });

    const { accessControl } = client.create.mock.calls[0][0];
    expect(accessControl.access_mode).toBe(ConversationAccessControlMode.Public);
    expect(accessControl.entries).toBeUndefined();
  });

  it('uses the investigation title as the escalation initial title', async () => {
    const { service, client } = makeService();

    await service.create(request, {
      linked_investigation_id: 'inv-1',
      visibility: 'public',
      assignees: ['user-a'],
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
      assignees: ['user-a'],
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
        assignees: ['user-a'],
      })
    ).rejects.toThrow(/"escalation" not found/);
  });

  it('always sets assignees in metadata', async () => {
    const { service, client } = makeService();

    await service.create(request, {
      linked_investigation_id: 'inv-1',
      visibility: 'public',
      assignees: ['uid-creator'],
    });

    const { metadata } = client.create.mock.calls[0][0];
    expect(metadata.assignees).toEqual(['uid-creator']);
  });
});

describe('EscalationsService.create — timeline event', () => {
  const createBody = {
    linked_investigation_id: 'inv-1',
    visibility: 'public' as const,
    assignees: ['user-a'],
  };

  it('adds a "created from investigation" event with the investigation title and agent id', async () => {
    const { service, client } = makeService();

    await service.create(request, createBody);

    expect(client.addEvents).toHaveBeenCalledWith({
      conversationId: 'escalation-1',
      events: [
        {
          type: 'escalation_created_from_investigation',
          data: { investigation_id: 'inv-1', title: 'My Investigation', agent_id: 'default-agent' },
        },
      ],
    });
  });

  it('still returns the escalation when writing the event fails', async () => {
    const { service } = makeService({
      addEvents: jest.fn().mockRejectedValue(new Error('boom')),
    });

    await expect(service.create(request, createBody)).resolves.toEqual(MOCK_ESCALATION);
  });
});

describe('EscalationsService.link — timeline events', () => {
  const escalationWith = (linked: string[]) =>
    jest.fn().mockResolvedValue({
      id: 'escalation-1',
      template_id: ESCALATION_TEMPLATE_ID,
      metadata: { [ESCALATION_LINKED_INVESTIGATIONS_FIELD]: linked },
    });

  it('adds one event per newly linked investigation', async () => {
    const { service, client } = makeService({ get: escalationWith(['inv-1']) });

    await service.link(request, 'escalation-1', { linked_investigations: ['inv-2', 'inv-3'] });

    expect(client.addEvents).toHaveBeenCalledTimes(1);
    const { events } = client.addEvents.mock.calls[0][0];
    expect(
      events.map((e: { data: { investigation_id: string } }) => e.data.investigation_id)
    ).toEqual(['inv-2', 'inv-3']);
    expect(events[0].type).toBe('escalation_investigation_linked');
  });

  it('skips already linked investigations and in-payload duplicates', async () => {
    const { service, client } = makeService({ get: escalationWith(['inv-1']) });

    await service.link(request, 'escalation-1', {
      linked_investigations: ['inv-1', 'inv-2', 'inv-2'],
    });

    const { events } = client.addEvents.mock.calls[0][0];
    expect(events).toHaveLength(1);
    expect(events[0].data.investigation_id).toBe('inv-2');
  });

  it('does not call addEvents when nothing new was linked', async () => {
    const { service, client } = makeService({ get: escalationWith(['inv-1']) });

    await service.link(request, 'escalation-1', { linked_investigations: ['inv-1'] });

    expect(client.addEvents).not.toHaveBeenCalled();
  });

  it('splits more than 10 events across requests', async () => {
    const { service, client } = makeService({ get: escalationWith([]) });
    const ids = Array.from({ length: 25 }, (_, i) => `inv-${i}`);

    await service.link(request, 'escalation-1', { linked_investigations: ids });

    expect(client.addEvents.mock.calls.map(([arg]) => arg.events.length)).toEqual([10, 10, 5]);
  });

  it('still returns the escalation when writing events fails', async () => {
    const { service } = makeService({
      get: escalationWith([]),
      addEvents: jest.fn().mockRejectedValue(new Error('boom')),
    });

    await expect(
      service.link(request, 'escalation-1', { linked_investigations: ['inv-1'] })
    ).resolves.toEqual(MOCK_ESCALATION);
  });
});

describe('EscalationsService.link', () => {
  it('throws NotAnEscalationError when target is not an escalation', async () => {
    const { service } = makeService({
      get: jest.fn().mockResolvedValue({
        ...MOCK_INVESTIGATION,
        template_id: INVESTIGATION_TEMPLATE_ID,
      }),
    });

    await expect(
      service.link(request, 'not-an-escalation', { linked_investigations: ['inv-1'] })
    ).rejects.toBeInstanceOf(NotAnEscalationError);
  });

  it('calls patchMetadata with appended linked_investigations (not replace)', async () => {
    const { service, client } = makeService({
      get: jest.fn().mockResolvedValue({
        id: 'escalation-1',
        template_id: ESCALATION_TEMPLATE_ID,
        metadata: { [ESCALATION_LINKED_INVESTIGATIONS_FIELD]: ['inv-1'] },
      }),
    });

    await service.link(request, 'escalation-1', {
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

    await service.link(request, 'escalation-1', {
      linked_investigations: ['inv-2', 'inv-3'],
    });

    const { [ESCALATION_LINKED_INVESTIGATIONS_FIELD]: updated } =
      client.patchMetadata.mock.calls[0][1];
    expect(updated).toEqual(['inv-1', 'inv-2', 'inv-3']);
  });

  it('does not call client.update', async () => {
    const { service, client } = makeService({
      get: jest.fn().mockResolvedValue({
        id: 'escalation-1',
        template_id: ESCALATION_TEMPLATE_ID,
        metadata: { [ESCALATION_LINKED_INVESTIGATIONS_FIELD]: [] },
      }),
    });

    await service.link(request, 'escalation-1', {
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

  describe('entity_ids', () => {
    const withLinked = (id: string, linked: string[]) => ({
      ...MOCK_SUMMARY,
      id,
      metadata: { [ESCALATION_LINKED_INVESTIGATIONS_FIELD]: linked },
    });

    it('attaches the deduped union of the linked investigations entity ids', async () => {
      const { service, impactClient, getImpactClient } = makeService({
        search: jest.fn().mockResolvedValue({
          results: [withLinked('e1', ['inv-1', 'inv-2']), withLinked('e2', ['inv-3'])],
          total: 2,
        }),
      });
      impactClient.getEntityIdsByConversationId.mockResolvedValue(
        new Map([
          ['inv-1', ['host-1', 'user-1']],
          ['inv-2', ['host-1', 'svc-1']],
        ])
      );

      const result = await service.list(request, { page: 1, per_page: 50, status: 'open' });

      expect(getImpactClient).toHaveBeenCalledWith(request);
      expect(impactClient.getEntityIdsByConversationId).toHaveBeenCalledTimes(1);
      expect(impactClient.getEntityIdsByConversationId).toHaveBeenCalledWith([
        'inv-1',
        'inv-2',
        'inv-3',
      ]);
      expect(result.results[0].entity_ids).toEqual(['host-1', 'user-1', 'svc-1']);
      expect(result.results[1]).not.toHaveProperty('entity_ids');
    });

    it('skips the impact read when no escalation links an investigation', async () => {
      const { service, getImpactClient } = makeService({
        search: jest.fn().mockResolvedValue({ results: [MOCK_SUMMARY], total: 1 }),
      });

      await service.list(request, { page: 1, per_page: 50, status: 'open' });

      expect(getImpactClient).not.toHaveBeenCalled();
    });

    it('still returns the rows when the impact read fails', async () => {
      const row = withLinked('e1', ['inv-1']);
      const { service, impactClient } = makeService({
        search: jest.fn().mockResolvedValue({ results: [row], total: 1 }),
      });
      impactClient.getEntityIdsByConversationId.mockRejectedValue(new Error('forbidden'));

      const result = await service.list(request, { page: 1, per_page: 50, status: 'open' });

      expect(result.results).toEqual([row]);
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

  it('includes a metadata.linked_investigations filter when linked_investigation_id is set', async () => {
    const { service, client } = makeService({
      search: jest.fn().mockResolvedValue({ results: [], total: 0 }),
    });

    await service.list(request, {
      page: 1,
      per_page: 50,
      status: 'open',
      linked_investigation_id: 'inv-abc',
    });

    const { filter } = (client.search as jest.Mock).mock.calls[0][0] as { filter: string };
    expect(filter).toContain('metadata.linked_investigations: "inv-abc"');
  });

  it('omits the linked_investigation_id clause when it is not set', async () => {
    const { service, client } = makeService({
      search: jest.fn().mockResolvedValue({ results: [], total: 0 }),
    });

    await service.list(request, { page: 1, per_page: 50, status: 'open' });

    const { filter } = (client.search as jest.Mock).mock.calls[0][0] as { filter: string };
    expect(filter).not.toContain('linked_investigations');
  });

  it('escapes double quotes in linked_investigation_id to prevent KQL injection', async () => {
    const { service, client } = makeService({
      search: jest.fn().mockResolvedValue({ results: [], total: 0 }),
    });

    // Although real conversation IDs are UUIDs, verify the escaping works for safety.
    await service.list(request, {
      page: 1,
      per_page: 50,
      status: 'open',
      linked_investigation_id: 'inv-"malicious"',
    });

    const { filter } = (client.search as jest.Mock).mock.calls[0][0] as { filter: string };
    expect(filter).toContain('metadata.linked_investigations: "inv-\\"malicious\\""');
    // Should not leave a bare unescaped double-quote that would break the KQL.
    expect(filter).not.toMatch(/linked_investigations: "inv-"malicious/);
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

describe('EscalationsService.listLinkedInvestigations', () => {
  const INV_A = {
    id: 'inv-a',
    title: 'Investigation A',
    template_id: INVESTIGATION_TEMPLATE_ID,
    agent_id: 'agent-1',
    metadata: { status: 'open' },
  };
  const INV_B = {
    id: 'inv-b',
    title: 'Investigation B',
    template_id: INVESTIGATION_TEMPLATE_ID,
    agent_id: 'agent-2',
    metadata: { status: 'closed' },
  };

  const makeEscalation = (linkedIds: string[]) => ({
    id: 'escalation-1',
    template_id: ESCALATION_TEMPLATE_ID,
    title: 'My Escalation',
    metadata: { [ESCALATION_LINKED_INVESTIGATIONS_FIELD]: linkedIds },
  });

  it('returns empty results when no investigations are linked', async () => {
    const { service } = makeService({
      get: jest.fn().mockResolvedValue(makeEscalation([])),
    });

    const result = await service.listLinkedInvestigations(request, 'escalation-1');

    expect(result).toEqual({ results: [] });
  });

  it('returns summaries in the stored order', async () => {
    const { service } = makeService({
      get: jest.fn().mockResolvedValue(makeEscalation(['inv-a', 'inv-b'])),
      bulkGet: jest.fn().mockResolvedValue(
        new Map([
          ['inv-a', INV_A],
          ['inv-b', INV_B],
        ])
      ),
    });

    const result = await service.listLinkedInvestigations(request, 'escalation-1');

    expect(result.results.map((r) => r.id)).toEqual(['inv-a', 'inv-b']);
  });

  it('maps status "closed" to "closed"', async () => {
    const { service } = makeService({
      get: jest.fn().mockResolvedValue(makeEscalation(['inv-b'])),
      bulkGet: jest.fn().mockResolvedValue(new Map([['inv-b', INV_B]])),
    });

    const result = await service.listLinkedInvestigations(request, 'escalation-1');

    expect(result.results[0].status).toBe('closed');
  });

  it('defaults missing status to "open"', async () => {
    const invNoStatus = { ...INV_A, metadata: {} };
    const { service } = makeService({
      get: jest.fn().mockResolvedValue(makeEscalation(['inv-a'])),
      bulkGet: jest.fn().mockResolvedValue(new Map([['inv-a', invNoStatus]])),
    });

    const result = await service.listLinkedInvestigations(request, 'escalation-1');

    expect(result.results[0].status).toBe('open');
  });

  it('silently drops ids that bulkGet could not resolve (inaccessible / deleted)', async () => {
    const { service } = makeService({
      get: jest.fn().mockResolvedValue(makeEscalation(['inv-a', 'inv-missing'])),
      // bulkGet only resolves inv-a; inv-missing is absent from the map
      bulkGet: jest.fn().mockResolvedValue(new Map([['inv-a', INV_A]])),
    });

    const result = await service.listLinkedInvestigations(request, 'escalation-1');

    expect(result.results.map((r) => r.id)).toEqual(['inv-a']);
  });

  it('throws NotAnEscalationError when the target is not an escalation', async () => {
    const { service } = makeService({
      get: jest.fn().mockResolvedValue({
        id: 'not-an-escalation',
        template_id: INVESTIGATION_TEMPLATE_ID,
        title: 'Oops',
        metadata: {},
      }),
    });

    await expect(
      service.listLinkedInvestigations(request, 'not-an-escalation')
    ).rejects.toBeInstanceOf(NotAnEscalationError);
  });

  it('includes agent_id in each summary', async () => {
    const { service } = makeService({
      get: jest.fn().mockResolvedValue(makeEscalation(['inv-a'])),
      bulkGet: jest.fn().mockResolvedValue(new Map([['inv-a', INV_A]])),
    });

    const result = await service.listLinkedInvestigations(request, 'escalation-1');

    expect(result.results[0].agent_id).toBe('agent-1');
  });

  it('silently drops linked ids that resolved to a non-investigation template', async () => {
    const escalationEntry: typeof INV_A = {
      ...INV_A,
      id: 'another-escalation',
      title: 'Nested Escalation',
      // Cast so the Map<string, typeof INV_A> accepts this entry despite the different literal.
      template_id: ESCALATION_TEMPLATE_ID as typeof INVESTIGATION_TEMPLATE_ID,
      agent_id: 'agent-3',
    };
    const { service } = makeService({
      get: jest.fn().mockResolvedValue(makeEscalation(['inv-a', 'another-escalation'])),
      bulkGet: jest.fn().mockResolvedValue(
        new Map([
          ['inv-a', INV_A],
          ['another-escalation', escalationEntry],
        ])
      ),
    });

    const result = await service.listLinkedInvestigations(request, 'escalation-1');

    expect(result.results.map((r) => r.id)).toEqual(['inv-a']);
  });
});

describe('EscalationsService.addAttachments', () => {
  const MOCK_INVESTIGATION_WITH_ATTACHMENTS = {
    ...MOCK_INVESTIGATION,
    attachments: [
      {
        id: 'att-1',
        type: 'text',
        active: true,
        current_version: 1,
        versions: [
          {
            version: 1,
            data: { text: 'hello' },
            created_at: '2026-01-01T00:00:00.000Z',
            content_hash: 'h1',
            estimated_tokens: 2,
          },
        ],
      },
    ],
  };

  it('copies attachments from a linked investigation into the escalation', async () => {
    const { service, attachmentsClient } = makeService({
      get: jest
        .fn()
        .mockResolvedValueOnce(MOCK_ESCALATION)
        .mockResolvedValueOnce(MOCK_INVESTIGATION_WITH_ATTACHMENTS),
    });
    (attachmentsClient.bulkCreate as jest.Mock).mockResolvedValue({
      created: [MOCK_INVESTIGATION_WITH_ATTACHMENTS.attachments[0]],
      errors: [],
    });

    const result = await service.addAttachments(request, 'escalation-1', ['inv-1']);

    expect(result).toEqual({ copied: 1, failed: 0 });
    expect(attachmentsClient.bulkCreate).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 'escalation-1' })
    );
  });

  it('throws NotAnEscalationError when the target is not an escalation', async () => {
    const { service } = makeService({
      get: jest.fn().mockResolvedValue(MOCK_INVESTIGATION),
    });

    await expect(service.addAttachments(request, 'not-an-escalation', ['inv-1'])).rejects.toThrow(
      NotAnEscalationError
    );
  });

  it('skips non-investigation conversations and warns', async () => {
    const { service, attachmentsClient } = makeService({
      get: jest
        .fn()
        .mockResolvedValueOnce(MOCK_ESCALATION)
        .mockResolvedValueOnce({ ...MOCK_ESCALATION, id: 'other-conv' }),
    });

    const result = await service.addAttachments(request, 'escalation-1', ['other-conv']);

    expect(result).toEqual({ copied: 0, failed: 0 });
    expect(attachmentsClient.bulkCreate).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('non-investigation'));
  });
});

describe('EscalationsService.sync', () => {
  const version = {
    version: 1,
    data: { text: 'hello' },
    created_at: '2026-01-01T00:00:00.000Z',
    content_hash: 'h1',
    estimated_tokens: 2,
  };
  const fullAttachment = (id: string) => ({
    id,
    type: 'text',
    active: true,
    current_version: 1,
    versions: [version],
  });

  const makeEscalation = ({
    updatedAt = '2026-01-02T00:00:00.000Z',
    attachmentIds = [] as string[],
    linked = ['inv-1'],
  } = {}) => ({
    ...MOCK_ESCALATION,
    updated_at: updatedAt,
    metadata: { [ESCALATION_LINKED_INVESTIGATIONS_FIELD]: linked },
    attachments: attachmentIds.map(fullAttachment),
  });

  const makeSummary = ({
    updatedAt = '2026-01-01T00:00:00.000Z',
    attachmentIds = ['att-1'],
  } = {}) => ({
    ...MOCK_INVESTIGATION,
    updated_at: updatedAt,
    attachments: attachmentIds.map((id) => ({ id, type: 'text' })),
  });

  const setup = ({
    escalation,
    summary,
  }: {
    escalation: ReturnType<typeof makeEscalation>;
    summary: ReturnType<typeof makeSummary>;
  }) => {
    const full = {
      ...summary,
      attachments: (summary.attachments ?? []).map((att) => fullAttachment(att.id)),
    };
    const deps = makeService({
      get: jest.fn().mockImplementation(async (id: string) => (id === 'inv-1' ? full : escalation)),
      bulkGet: jest.fn().mockResolvedValue(new Map([['inv-1', summary]])),
    });
    (deps.attachmentsClient.bulkCreate as jest.Mock).mockImplementation(
      async ({ attachments }: { attachments: unknown[] }) => ({
        created: attachments,
        errors: [],
      })
    );
    return deps;
  };

  it('copies missing attachments when the investigation changed after the escalation', async () => {
    const { service, client, attachmentsClient } = setup({
      escalation: makeEscalation({ updatedAt: '2026-01-01T00:00:00.000Z' }),
      summary: makeSummary({ updatedAt: '2026-01-02T00:00:00.000Z' }),
    });

    await expect(service.sync(request, 'escalation-1')).resolves.toEqual({ copied: 1, failed: 0 });
    expect(attachmentsClient.bulkCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'escalation-1',
        attachments: [expect.objectContaining({ id: 'inv-1:att-1' })],
      })
    );
    expect(client.addEvents).toHaveBeenCalledWith({
      conversationId: 'escalation-1',
      events: [
        {
          type: 'escalation_attachments_synced',
          data: {
            investigation_id: 'inv-1',
            title: 'My Investigation',
            agent_id: 'default-agent',
            attachment_ids: ['inv-1:att-1'],
          },
        },
      ],
    });
  });

  it('writes the event before the attachments so it shows above them in the timeline', async () => {
    const { service, client, attachmentsClient } = setup({
      escalation: makeEscalation({ updatedAt: '2026-01-01T00:00:00.000Z' }),
      summary: makeSummary({ updatedAt: '2026-01-02T00:00:00.000Z' }),
    });

    await service.sync(request, 'escalation-1');

    expect((client.addEvents as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
      (attachmentsClient.bulkCreate as jest.Mock).mock.invocationCallOrder[0]
    );
  });

  it('copies when the escalation is newer but holds fewer copies than the investigation has', async () => {
    const { service, client, attachmentsClient } = setup({
      escalation: makeEscalation({ attachmentIds: ['inv-1:att-1'] }),
      summary: makeSummary({ attachmentIds: ['att-1', 'att-2'] }),
    });

    await expect(service.sync(request, 'escalation-1')).resolves.toEqual({ copied: 1, failed: 0 });
    const { attachments } = (attachmentsClient.bulkCreate as jest.Mock).mock.calls[0][0];
    expect(attachments.map((a: { id: string }) => a.id)).toEqual(['inv-1:att-2']);
    expect(client.addEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        events: [
          expect.objectContaining({
            data: expect.objectContaining({ attachment_ids: ['inv-1:att-2'] }),
          }),
        ],
      })
    );
  });

  it('copies a replacement attachment even when the counts match', async () => {
    const { service, attachmentsClient } = setup({
      escalation: makeEscalation({ attachmentIds: ['inv-1:att-1'] }),
      summary: makeSummary({ attachmentIds: ['att-2'] }),
    });

    await expect(service.sync(request, 'escalation-1')).resolves.toEqual({ copied: 1, failed: 0 });
    const { attachments } = (attachmentsClient.bulkCreate as jest.Mock).mock.calls[0][0];
    expect(attachments.map((a: { id: string }) => a.id)).toEqual(['inv-1:att-2']);
  });

  it('does nothing when the escalation is up to date', async () => {
    const { service, client, attachmentsClient } = setup({
      escalation: makeEscalation({ attachmentIds: ['inv-1:att-1'] }),
      summary: makeSummary(),
    });

    await expect(service.sync(request, 'escalation-1')).resolves.toEqual({ copied: 0, failed: 0 });
    expect(attachmentsClient.bulkCreate).not.toHaveBeenCalled();
    expect(client.addEvents).not.toHaveBeenCalled();
  });

  it('does not rewrite copies that already exist when only the timestamp is newer', async () => {
    const { service, attachmentsClient } = setup({
      escalation: makeEscalation({
        updatedAt: '2026-01-01T00:00:00.000Z',
        attachmentIds: ['inv-1:att-1'],
      }),
      summary: makeSummary({ updatedAt: '2026-01-02T00:00:00.000Z' }),
    });

    await expect(service.sync(request, 'escalation-1')).resolves.toEqual({ copied: 0, failed: 0 });
    expect(attachmentsClient.bulkCreate).not.toHaveBeenCalled();
  });

  it('returns zero counts when the escalation links no investigations', async () => {
    const { service, client } = setup({
      escalation: makeEscalation({ linked: [] }),
      summary: makeSummary(),
    });

    await expect(service.sync(request, 'escalation-1')).resolves.toEqual({ copied: 0, failed: 0 });
    expect(client.bulkGet).not.toHaveBeenCalled();
  });

  it('skips linked investigations that cannot be resolved', async () => {
    const { service, client, attachmentsClient } = setup({
      escalation: makeEscalation(),
      summary: makeSummary(),
    });
    (client.bulkGet as jest.Mock).mockResolvedValue(new Map());

    await expect(service.sync(request, 'escalation-1')).resolves.toEqual({ copied: 0, failed: 0 });
    expect(attachmentsClient.bulkCreate).not.toHaveBeenCalled();
  });

  it('throws NotAnEscalationError when the target is not an escalation', async () => {
    const { service } = makeService({ get: jest.fn().mockResolvedValue(MOCK_INVESTIGATION) });

    await expect(service.sync(request, 'inv-1')).rejects.toThrow(NotAnEscalationError);
  });
});
