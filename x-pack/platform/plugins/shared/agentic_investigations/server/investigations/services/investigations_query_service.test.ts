/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { ConversationWithoutRoundsWithPermissions } from '@kbn/agent-builder-common';
import type { ConversationPublicClient } from '@kbn/agent-builder-server';
import { toKqlExpression, type KueryNode } from '@kbn/es-query';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import type { Impact } from '../../../common/impact/impact';
import type { InvestigationHypotheses } from '../../../common/hypotheses/hypotheses';
import {
  listInvestigationsQuerySchema,
  type ListInvestigationsQueryInput,
} from '../../../common/investigations/investigation';
import type { InvestigationSubject } from '../../../common/subjects/subject';
import { WrongTemplateError } from '../../assignments/errors';
import type { HypothesesService } from '../../hypotheses/services/hypotheses_service';
import type { ImpactService } from '../../impact/services/impact_service';
import { createInMemoryStorage } from '../../investigation_attachments/in_memory_storage.mock';
import { subjectAttachment } from '../../subjects/attachments';
import { SubjectClaimsService } from '../../subjects/services/subject_claims_service';
import { subjectDocumentId, SubjectsService } from '../../subjects/services/subjects_service';
import type { SubjectClaimDocument, SubjectDocument } from '../../subjects/storage/subject_storage';
import type { InProgressResolver } from './in_progress';
import { InvestigationsQueryService } from './investigations_query_service';

const request = httpServerMock.createKibanaRequest();
const SPACE_ID = 'default';

const conversation = (
  id: string,
  overrides: Partial<ConversationWithoutRoundsWithPermissions> = {}
): ConversationWithoutRoundsWithPermissions =>
  ({
    id,
    title: `Investigation ${id}`,
    agent_id: 'agent-1',
    template_id: 'investigation',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    metadata: { status: 'open' },
    attachments: [],
    permissions: { rename: true, delete: true, update_access_control: true },
    ...overrides,
  } as ConversationWithoutRoundsWithPermissions);

const subject = (
  conversationId: string,
  subjectId: string,
  overrides: Partial<InvestigationSubject> = {}
): InvestigationSubject => ({
  id: `doc-${conversationId}-${subjectId}`,
  spaceId: SPACE_ID,
  conversationId,
  subjectType: 'alert',
  subjectId,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const impact = (conversationId: string, overrides: Partial<Impact> = {}): Impact => ({
  id: `impact-${conversationId}`,
  spaceId: SPACE_ID,
  conversationId,
  summary: 'Checkout is down',
  entities: [{ id: 'checkout', name: 'checkout', featureId: 'f-1' }],
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const parseQuery = (query: ListInvestigationsQueryInput = {}) =>
  listInvestigationsQuerySchema.parse(query);

const setup = ({
  searchResults = [],
  bulkGetResults = [],
  subjects = [],
  impacts = [],
  hypotheses,
  inProgressIds = [],
  proposals,
}: {
  searchResults?: ConversationWithoutRoundsWithPermissions[];
  bulkGetResults?: ConversationWithoutRoundsWithPermissions[];
  subjects?: InvestigationSubject[];
  impacts?: Impact[];
  hypotheses?: InvestigationHypotheses;
  inProgressIds?: string[];
  proposals?: ProposalsPluginStart;
} = {}) => {
  const client = {
    get: jest.fn(),
    search: jest.fn().mockResolvedValue({ results: searchResults, total: searchResults.length }),
    bulkGet: jest
      .fn()
      .mockImplementation(
        async (ids: string[]) =>
          new Map(bulkGetResults.filter(({ id }) => ids.includes(id)).map((c) => [c.id, c]))
      ),
  };
  const subjectSearch = jest.fn().mockResolvedValue([]);
  const subjectsService = {
    listByConversationIds: jest.fn(async (ids: string[]) =>
      subjects.filter(({ conversationId }) => ids.includes(conversationId))
    ),
    findConversationIdsBySubjects: jest.fn().mockResolvedValue([]),
    getDocumentService: () => ({ searchConversationIds: subjectSearch }),
  };
  const impactSearch = jest.fn().mockResolvedValue([]);
  const impactService = {
    listByConversationIds: jest.fn(async (ids: string[]) =>
      impacts.filter(({ conversationId }) => ids.includes(conversationId))
    ),
    findByConversationId: jest.fn(async (id: string) =>
      impacts.find(({ conversationId }) => conversationId === id)
    ),
    getDocumentService: () => ({ searchConversationIds: impactSearch }),
  };
  const hypothesesService = {
    findByConversationId: jest.fn().mockResolvedValue(hypotheses),
  };
  const inProgress = {
    findInProgressIds: jest.fn().mockResolvedValue(new Set(inProgressIds)),
    isInProgress: jest.fn(async (_r: unknown, _s: string, id: string) =>
      inProgressIds.includes(id)
    ),
  };
  const service = new InvestigationsQueryService({
    getConversationClient: async () => client as unknown as ConversationPublicClient,
    getSpaceId: () => SPACE_ID,
    getImpactService: () => impactService as unknown as ImpactService,
    getSubjectsService: () => subjectsService as unknown as SubjectsService,
    getHypothesesService: () => hypothesesService as unknown as HypothesesService,
    getProposals: () => proposals,
    inProgress: inProgress as unknown as InProgressResolver,
    logger: loggerMock.create(),
  });
  return { service, client, subjectsService, subjectSearch, impactSearch, inProgress };
};

const searchFilter = (client: { search: jest.Mock }): string =>
  toKqlExpression(client.search.mock.calls[0][0].filter as KueryNode);

describe('InvestigationsQueryService', () => {
  describe('get', () => {
    it('joins the conversation with its subjects, impact, hypotheses, and in-progress state', async () => {
      const hypotheses: InvestigationHypotheses = {
        id: 'hyp-conv-1',
        spaceId: SPACE_ID,
        conversationId: 'conv-1',
        hypotheses: [{ candidate: 'Bad deploy', confidence: 0.8, status: 'confirmed' }],
        createdAt: '2026-01-01T00:00:00.000Z',
      };
      const { service, client } = setup({
        subjects: [
          subject('conv-1', 'alert-2', { createdAt: '2026-01-02T00:00:00.000Z' }),
          subject('conv-1', 'alert-1', { triggerType: 'automatic', summary: 'High latency' }),
        ],
        impacts: [impact('conv-1')],
        hypotheses,
        inProgressIds: ['conv-1'],
      });
      client.get.mockResolvedValue({
        ...conversation('conv-1', {
          metadata: {
            status: 'open',
            severity: 'high',
            summary: 'What happened',
            verdict: 'Root cause',
            workflow_execution_id: 'x',
          },
        }),
        attachments: [],
      });

      const investigation = await service.get(request, 'conv-1');

      expect(investigation).toEqual({
        id: 'conv-1',
        title: 'Investigation conv-1',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        agent_id: 'agent-1',
        metadata: {
          status: 'open',
          severity: 'high',
          summary: 'What happened',
          verdict: 'Root cause',
        },
        in_progress: true,
        subjects: [
          {
            type: 'alert',
            id: 'alert-1',
            summary: 'High latency',
            trigger_type: 'automatic',
            created_at: '2026-01-01T00:00:00.000Z',
          },
          { type: 'alert', id: 'alert-2', created_at: '2026-01-02T00:00:00.000Z' },
        ],
        impact: {
          summary: 'Checkout is down',
          entities: [{ id: 'checkout', name: 'checkout', feature_id: 'f-1' }],
          created_at: '2026-01-01T00:00:00.000Z',
        },
        hypotheses: {
          hypotheses: hypotheses.hypotheses,
          created_at: '2026-01-01T00:00:00.000Z',
        },
        proposals: [],
      });
    });

    it('hides documents whose attachment the user removed', async () => {
      const { service, client } = setup({
        subjects: [subject('conv-1', 'alert-1'), subject('conv-1', 'alert-2')],
        impacts: [impact('conv-1')],
      });
      client.get.mockResolvedValue({
        ...conversation('conv-1'),
        attachments: [
          { id: 'doc-conv-1-alert-1', active: false },
          { id: 'impact-conv-1', active: false },
        ],
      });

      const investigation = await service.get(request, 'conv-1');

      expect(investigation.subjects.map(({ id }) => id)).toEqual(['alert-2']);
      expect(investigation.impact).toBeUndefined();
    });

    it('rejects a conversation on another template as not an investigation', async () => {
      const { service, client } = setup();
      client.get.mockResolvedValue(conversation('conv-1', { template_id: 'escalation' }));

      await expect(service.get(request, 'conv-1')).rejects.toBeInstanceOf(WrongTemplateError);
    });

    it('lists live proposals when the caller may read them', async () => {
      const list = jest.fn().mockResolvedValue({
        proposals: [
          {
            id: 'p-1',
            title: 'Roll back',
            comment: 'Roll back the deploy',
            status: 'pending',
            impact: 'high',
            confidence: 'medium',
            createdAt: '2026-01-01T00:00:00.000Z',
            actionInput: { secret: true },
          },
        ],
        total: 1,
      });
      const proposals = {
        getProposalsService: () => ({ list }),
        getProposalPrivileges: () => ({ assertCanRead: jest.fn().mockResolvedValue(undefined) }),
      } as unknown as ProposalsPluginStart;
      const { service, client } = setup({ proposals });
      client.get.mockResolvedValue(conversation('conv-1'));

      const { proposals: found } = await service.get(request, 'conv-1');

      expect(found).toEqual([
        {
          id: 'p-1',
          title: 'Roll back',
          comment: 'Roll back the deploy',
          status: 'pending',
          impact: 'high',
          confidence: 'medium',
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ]);
      expect(list).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: 'conv-1', excludeSuperseded: true }),
        SPACE_ID,
        request
      );
    });

    it('returns no proposals when the caller may not read them', async () => {
      const list = jest.fn();
      const proposals = {
        getProposalsService: () => ({ list }),
        getProposalPrivileges: () => ({
          assertCanRead: jest.fn().mockRejectedValue(new Error('forbidden')),
        }),
      } as unknown as ProposalsPluginStart;
      const { service, client } = setup({ proposals });
      client.get.mockResolvedValue(conversation('conv-1'));

      await expect(service.get(request, 'conv-1')).resolves.toEqual(
        expect.objectContaining({ proposals: [] })
      );
      expect(list).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('searches investigation conversations and pushes status, severity, and dates into the filter', async () => {
      const { service, client } = setup({ searchResults: [] });

      await service.list(
        request,
        parseQuery({
          status: 'open',
          severity: ['high', 'critical'],
          created_after: '2026-01-01T00:00:00.000Z',
          sort_field: 'updated_at',
          sort_order: 'asc',
        })
      );

      expect(client.bulkGet).not.toHaveBeenCalled();
      expect(client.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: { field: 'updated_at', order: 'asc' },
          page: 1,
          perPage: 1000,
        })
      );
      const filter = searchFilter(client);
      expect(filter).toContain('template_id: investigation');
      expect(filter).toContain('NOT metadata.status: closed');
      expect(filter).toContain('metadata.severity: high');
      expect(filter).toContain('metadata.severity: critical');
      expect(filter).toContain('created_at >= 2026-01-01T00\\:00\\:00.000Z');
    });

    it('pages, sorts, and hydrates only the requested page', async () => {
      const { service, subjectsService } = setup({
        searchResults: [
          conversation('a', { created_at: '2026-01-01T00:00:00.000Z' }),
          conversation('b', { created_at: '2026-01-03T00:00:00.000Z' }),
          conversation('c', { created_at: '2026-01-02T00:00:00.000Z' }),
        ],
      });

      const response = await service.list(request, parseQuery({ page: 2, per_page: 1 }));

      expect(response.pagination).toEqual({ total: 3, page: 2, per_page: 1 });
      expect(response.results.map(({ id }) => id)).toEqual(['c']);
      expect(subjectsService.listByConversationIds).toHaveBeenCalledWith(['c'], SPACE_ID);
    });

    it('sorts by severity rank, unknown severity last when descending', async () => {
      const { service, client } = setup({
        searchResults: [
          conversation('low', { metadata: { severity: 'low' } }),
          conversation('none'),
          conversation('critical', { metadata: { severity: 'critical' } }),
          conversation('medium', { metadata: { severity: 'medium' } }),
        ],
      });

      const { results } = await service.list(request, parseQuery({ sort_field: 'severity' }));

      expect(results.map(({ id }) => id)).toEqual(['critical', 'medium', 'low', 'none']);
      expect(client.search).toHaveBeenCalledWith(
        expect.objectContaining({ sort: { field: 'updated_at', order: 'desc' } })
      );
    });

    it('starts from the subject index for subject filters and reads the candidates as the caller', async () => {
      const { service, client, subjectSearch } = setup({
        bulkGetResults: [conversation('conv-1'), conversation('other', { template_id: 'x' })],
      });
      subjectSearch.mockResolvedValue(['conv-1', 'other', 'inaccessible']);

      const { results } = await service.list(
        request,
        parseQuery({ subject_type: 'alert', subject_id: ['alert-1', 'alert-2'] })
      );

      expect(subjectSearch).toHaveBeenCalledWith({
        spaceId: SPACE_ID,
        filter: [
          { terms: { subjectType: ['alert'] } },
          { terms: { subjectId: ['alert-1', 'alert-2'] } },
        ],
      });
      expect(client.search).not.toHaveBeenCalled();
      expect(client.bulkGet).toHaveBeenCalledWith(['conv-1', 'other', 'inaccessible']);
      expect(results.map(({ id }) => id)).toEqual(['conv-1']);
    });

    it('intersects the entity filter with the subject filter', async () => {
      const { service, client, subjectSearch, impactSearch } = setup({
        bulkGetResults: [conversation('conv-2')],
      });
      subjectSearch.mockResolvedValue(['conv-1', 'conv-2']);
      impactSearch.mockResolvedValue(['conv-2', 'conv-3']);

      await service.list(request, parseQuery({ subject_id: 'alert-1', entity: 'checkout' }));

      expect(impactSearch).toHaveBeenCalledWith({
        spaceId: SPACE_ID,
        filter: [
          {
            nested: {
              path: 'entities',
              query: {
                bool: {
                  should: [
                    { term: { 'entities.id': 'checkout' } },
                    { term: { 'entities.name': 'checkout' } },
                  ],
                  minimum_should_match: 1,
                },
              },
            },
          },
        ],
      });
      expect(client.bulkGet).toHaveBeenCalledWith(['conv-2']);
    });

    it('returns nothing without reading conversations when the side indexes match nothing', async () => {
      const { service, client, impactSearch } = setup();
      impactSearch.mockResolvedValue([]);

      const response = await service.list(request, parseQuery({ entity: 'checkout' }));

      expect(response.results).toEqual([]);
      expect(client.bulkGet).not.toHaveBeenCalled();
      expect(client.search).not.toHaveBeenCalled();
    });

    it('reads in-progress investigations by id and excludes them for in_progress=false', async () => {
      const inProgress = setup({
        bulkGetResults: [conversation('busy')],
        inProgressIds: ['busy'],
      });
      const busy = await inProgress.service.list(request, parseQuery({ in_progress: 'true' }));
      expect(inProgress.client.bulkGet).toHaveBeenCalledWith(['busy']);
      expect(busy.results).toEqual([expect.objectContaining({ id: 'busy', in_progress: true })]);

      const idle = setup({
        searchResults: [conversation('busy'), conversation('idle')],
        inProgressIds: ['busy'],
      });
      const notBusy = await idle.service.list(request, parseQuery({ in_progress: 'false' }));
      expect(notBusy.results.map(({ id }) => id)).toEqual(['idle']);
    });

    it('matches free text against the title, summary, and verdict', async () => {
      const { service } = setup({
        searchResults: [
          conversation('title', { title: 'Checkout latency spike' }),
          conversation('summary', { metadata: { summary: 'The CHECKOUT service failed' } }),
          conversation('verdict', { metadata: { verdict: 'checkout deploy' } }),
          conversation('none', { title: 'Unrelated' }),
        ],
      });

      const { results } = await service.list(request, parseQuery({ query: 'checkout' }));

      expect(results.map(({ id }) => id).sort()).toEqual(['summary', 'title', 'verdict']);
    });

    it('reads a conversation in full only when one of its documents has no active attachment', async () => {
      const { service, client } = setup({
        searchResults: [
          conversation('attached', {
            attachments: [{ id: 'doc-attached-alert-1', type: 'investigation_subject' }],
          }),
          conversation('removed'),
        ],
        subjects: [subject('attached', 'alert-1'), subject('removed', 'alert-1')],
      });
      client.get.mockResolvedValue({
        ...conversation('removed'),
        attachments: [{ id: 'doc-removed-alert-1', active: false }],
      });

      const { results } = await service.list(request, parseQuery());

      expect(client.get).toHaveBeenCalledTimes(1);
      expect(client.get).toHaveBeenCalledWith('removed');
      const byId = new Map(results.map((result) => [result.id, result]));
      expect(byId.get('attached')?.subjects).toHaveLength(1);
      expect(byId.get('removed')?.subjects).toEqual([]);
    });

    it('keeps a document that was never attached, such as one written during a running turn', async () => {
      const { service, client } = setup({
        searchResults: [conversation('running')],
        impacts: [impact('running')],
      });
      client.get.mockResolvedValue({ ...conversation('running'), attachments: [] });

      const { results } = await service.list(request, parseQuery());

      expect(results[0].impact).toBeDefined();
    });
  });

  describe('severityCounts', () => {
    it('counts the filtered investigations per severity, zero-filled', async () => {
      const { service, inProgress } = setup({
        searchResults: [
          conversation('a', { metadata: { severity: 'high' } }),
          conversation('b', { metadata: { severity: 'high' } }),
          conversation('c', { metadata: { severity: 'low' } }),
          conversation('d'),
        ],
      });

      await expect(service.severityCounts(request, {})).resolves.toEqual({
        low: 1,
        medium: 0,
        high: 2,
        critical: 0,
      });
      expect(inProgress.findInProgressIds).not.toHaveBeenCalled();
    });
  });

  describe('findOpenBySubjects', () => {
    it('returns open investigations holding a visible matching subject, most recently updated first', async () => {
      const { service, subjectsService, client } = setup({
        bulkGetResults: [
          conversation('old', {
            updated_at: '2026-01-01T00:00:00.000Z',
            attachments: [{ id: 'doc-old-alert-1', type: 'investigation_subject' }],
          }),
          conversation('new', {
            updated_at: '2026-01-05T00:00:00.000Z',
            attachments: [{ id: 'doc-new-alert-1', type: 'investigation_subject' }],
          }),
          conversation('closed', { metadata: { status: 'closed' } }),
          conversation('removed'),
        ],
        subjects: [
          subject('old', 'alert-1'),
          subject('new', 'alert-1'),
          subject('closed', 'alert-1'),
          subject('removed', 'alert-1'),
        ],
      });
      subjectsService.findConversationIdsBySubjects.mockResolvedValue([
        'old',
        'new',
        'closed',
        'removed',
      ]);
      client.get.mockResolvedValue({
        ...conversation('removed'),
        attachments: [{ id: 'doc-removed-alert-1', active: false }],
      });

      const found = await service.findOpenBySubjects(request, [{ type: 'alert', id: 'alert-1' }]);

      expect(found.map(({ id }) => id)).toEqual(['new', 'old']);
    });
  });

  describe('with the subject index', () => {
    /** The real subjects service over in-memory storage, so the index queries run for real. */
    const setupWithSubjectIndex = (conversations: ConversationWithoutRoundsWithPermissions[]) => {
      const storage = createInMemoryStorage<SubjectDocument>();
      const subjectsService = new SubjectsService({
        documents: subjectAttachment.createServiceFromStorage(storage),
        claims: new SubjectClaimsService({
          storage: createInMemoryStorage<SubjectClaimDocument>(),
        }),
      });
      const seed = (
        conversationId: string,
        type: InvestigationSubject['subjectType'],
        id: string,
        spaceId = SPACE_ID
      ) => {
        const docId = subjectDocumentId(spaceId, conversationId, { type, id });
        storage.put(docId, {
          spaceId,
          conversationId,
          subjectType: type,
          subjectId: id,
          createdAt: '2026-01-01T00:00:00.000Z',
        });
        return docId;
      };
      const base = setup({ bulkGetResults: conversations });
      const service = new InvestigationsQueryService({
        getConversationClient: async () => base.client as unknown as ConversationPublicClient,
        getSpaceId: () => SPACE_ID,
        getImpactService: () =>
          ({
            listByConversationIds: jest.fn().mockResolvedValue([]),
            getDocumentService: () => ({ searchConversationIds: jest.fn() }),
          } as unknown as ImpactService),
        getSubjectsService: () => subjectsService,
        getHypothesesService: () =>
          ({ findByConversationId: jest.fn() } as unknown as HypothesesService),
        getProposals: () => undefined,
        inProgress: {
          findInProgressIds: jest.fn().mockResolvedValue(new Set()),
        } as unknown as InProgressResolver,
        logger: loggerMock.create(),
      });
      return { service, client: base.client, seed };
    };

    it('filters by subject id across subject types', async () => {
      const { service, seed } = setupWithSubjectIndex([
        conversation('a', { attachments: [] }),
        conversation('b'),
        conversation('c'),
      ]);
      seed('a', 'alert', 'alert-1');
      seed('b', 'manual', 'alert-1');
      seed('c', 'alert', 'alert-2');

      const { results } = await service.list(request, parseQuery({ subject_id: 'alert-1' }));

      expect(results.map(({ id }) => id).sort()).toEqual(['a', 'b']);
      expect(results.find(({ id }) => id === 'a')?.subjects).toEqual([
        { type: 'alert', id: 'alert-1', created_at: '2026-01-01T00:00:00.000Z' },
      ]);
    });

    it('filters by subject type and id together', async () => {
      const { service, seed } = setupWithSubjectIndex([conversation('a'), conversation('b')]);
      seed('a', 'alert', 'alert-1');
      seed('b', 'manual', 'alert-1');

      const { results } = await service.list(
        request,
        parseQuery({ subject_type: 'manual', subject_id: ['alert-1', 'other'] })
      );

      expect(results.map(({ id }) => id)).toEqual(['b']);
    });

    it('filters by subject type alone', async () => {
      const { service, seed } = setupWithSubjectIndex([conversation('a'), conversation('b')]);
      seed('a', 'slack_thread', 'team:T/channel:C/thread:1');
      seed('b', 'alert', 'alert-1');

      const { results } = await service.list(request, parseQuery({ subject_type: 'slack_thread' }));

      expect(results.map(({ id }) => id)).toEqual(['a']);
    });

    it('ignores subjects recorded in another space', async () => {
      const { service, seed, client } = setupWithSubjectIndex([conversation('a')]);
      seed('a', 'alert', 'alert-1', 'other-space');

      const { results } = await service.list(request, parseQuery({ subject_id: 'alert-1' }));

      expect(results).toEqual([]);
      expect(client.bulkGet).not.toHaveBeenCalled();
    });

    it('finds the open investigations holding a subject, most recently updated first', async () => {
      const { service, seed } = setupWithSubjectIndex([
        conversation('old', { updated_at: '2026-01-01T00:00:00.000Z' }),
        conversation('new', { updated_at: '2026-01-03T00:00:00.000Z' }),
        conversation('closed', { metadata: { status: 'closed' } }),
        conversation('unrelated'),
      ]);
      const oldDoc = seed('old', 'alert', 'alert-1');
      const newDoc = seed('new', 'significant_event', 'event-1');
      seed('closed', 'alert', 'alert-1');
      seed('unrelated', 'alert', 'alert-9');

      const found = await service.findOpenBySubjects(request, [
        { type: 'alert', id: 'alert-1' },
        { type: 'significant_event', id: 'event-1' },
      ]);

      expect(found.map(({ id }) => id)).toEqual(['new', 'old']);
      expect(oldDoc).not.toBe(newDoc);
    });

    it('does not match an investigation whose subject attachment the user removed', async () => {
      const { service, seed, client } = setupWithSubjectIndex([conversation('removed')]);
      const docId = seed('removed', 'alert', 'alert-1');
      client.get.mockResolvedValue({
        ...conversation('removed'),
        attachments: [{ id: docId, active: false }],
      });

      await expect(
        service.findOpenBySubjects(request, [{ type: 'alert', id: 'alert-1' }])
      ).resolves.toEqual([]);
    });
  });
});
