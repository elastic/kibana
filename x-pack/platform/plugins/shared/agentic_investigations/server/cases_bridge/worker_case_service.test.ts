/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { Conversation } from '@kbn/agent-builder-common';
import type { CasesServerStart } from '@kbn/cases-plugin/server';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import type { CaseBridgeService } from './case_bridge_service';
import { WorkerCaseService, type WorkerCaseSettings } from './worker_case_service';

const request = httpServerMock.createKibanaRequest();

const investigation = (metadata: Record<string, unknown> = {}): Conversation =>
  ({
    id: 'inv-1',
    agent_id: 'agent-1',
    template_id: 'investigation',
    title: 'Demo investigation',
    metadata,
  } as unknown as Conversation);

const proposal = (overrides: Record<string, unknown> = {}) => ({
  id: 'p-1',
  rootProposalId: 'p-1',
  conversationId: 'inv-1',
  caseId: 'case-1',
  title: 'Close 1 alert as true positive',
  comment: 'Approving closes the alert.',
  status: 'pending',
  createdAt: '2026-11-06T10:00:00.000Z',
  ...overrides,
});

const setup = ({
  settings = { enabled: true, visibility: 'public' },
  linked = ['inv-1'],
  proposals = [proposal()],
  canDecide = true,
  caseTags = ['alertzero', 'alertzero:worker'],
}: {
  settings?: WorkerCaseSettings;
  linked?: string[];
  proposals?: Array<ReturnType<typeof proposal>>;
  canDecide?: boolean;
  caseTags?: string[];
} = {}) => {
  const casesClient = {
    cases: {
      get: jest.fn().mockResolvedValue({
        id: 'case-1',
        owner: 'securitySolution',
        version: 'v1',
        severity: 'low',
        status: 'open',
        tags: caseTags,
        pending_decisions: 1,
      }),
      bulkUpdate: jest.fn().mockResolvedValue([]),
      setPendingDecisions: jest.fn().mockResolvedValue(undefined),
      recordDecision: jest.fn().mockResolvedValue(undefined),
    },
    attachments: {
      find: jest.fn().mockResolvedValue({
        data: proposals.map(({ rootProposalId }) => ({ attachmentId: rootProposalId })),
        total: proposals.length,
      }),
      bulkCreate: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
  };
  const cases = {
    getCasesClientWithRequest: jest.fn().mockResolvedValue(casesClient),
  } as unknown as CasesServerStart;
  const bridge = {
    openCase: jest.fn().mockResolvedValue({ case_id: 'case-1' }),
    getLinkedInvestigationIds: jest.fn().mockResolvedValue(linked),
  };
  const isAwaiting = (p: ReturnType<typeof proposal>) =>
    p.status === 'pending' && !('decision' in p) && !('gateReleasedAt' in p);
  const proposalsService = {
    getLatestRevision: jest.fn(async (id: string) => ({ proposalId: id })),
    get: jest.fn(async (id: string) => proposals.find((p) => p.id === id)),
    releaseGate: jest.fn().mockResolvedValue({}),
    // Stands in for the case-scoped query: filters by case and by waiting, then pages.
    list: jest.fn(
      async (query: { caseId: string; awaitingDecision: boolean; from: number; size: number }) => {
        const matching = proposals.filter(
          (p) => p.caseId === query.caseId && isAwaiting(p) === query.awaitingDecision
        );
        return {
          proposals: matching.slice(query.from, query.from + query.size),
          total: matching.length,
        };
      }
    ),
  };
  const logger = loggingSystemMock.createLogger();
  const service = new WorkerCaseService({
    logger,
    getCases: () => cases,
    getBridge: () => bridge as unknown as CaseBridgeService,
    getProposals: () =>
      ({ getProposalsService: () => proposalsService } as unknown as ProposalsPluginStart),
    getSettings: async () => settings,
    getSpaceId: () => 'default',
    readFindings: async () => ({}),
    canDecideProposals: async () => canDecide,
  });
  return { service, casesClient, cases, bridge, proposalsService, logger };
};

describe('WorkerCaseService', () => {
  describe('onInvestigationCreated', () => {
    it('opens nothing with the setting off', async () => {
      const { service, bridge } = setup({ settings: { enabled: false, visibility: 'public' } });

      expect(await service.onInvestigationCreated(request, investigation())).toBeUndefined();
      expect(bridge.openCase).not.toHaveBeenCalled();
    });

    it('opens the case from the AI investigation template, unpushed, with the Worker as actor', async () => {
      const { service, bridge } = setup({ settings: { enabled: true, visibility: 'restricted' } });
      const actionSource = { type: 'workflow' as const, id: 'wf', name: 'Worker', run_id: 'r' };

      expect(await service.onInvestigationCreated(request, investigation(), actionSource)).toBe(
        'case-1'
      );
      expect(bridge.openCase).toHaveBeenCalledWith(
        request,
        'inv-1',
        expect.objectContaining({
          template_id: 'system-ai-investigation',
          visibility: 'restricted',
          push: false,
        }),
        { actionSource, extraTags: ['alertzero:worker'] }
      );
    });

    it('never fails the investigation when the case open fails', async () => {
      const { service, bridge } = setup();
      bridge.openCase.mockRejectedValue(new Error('boom'));

      await expect(service.onInvestigationCreated(request, investigation())).resolves.toBe(
        undefined
      );
    });
  });

  describe('onInvestigationPatched', () => {
    it('mirrors verdict, summary, severity, and status onto the case it opened', async () => {
      const { service, casesClient, logger } = setup();

      await service.onInvestigationPatched(
        request,
        investigation({
          case_id: 'case-1',
          verdict: 'True positive: matched',
          summary: 'One alert on host-1.',
          severity: 'high',
          status: 'closed',
        }),
        ['verdict', 'summary', 'severity', 'status']
      );

      expect(logger.warn).not.toHaveBeenCalled();
      const [{ cases }] = casesClient.cases.bulkUpdate.mock.calls[0];
      expect(cases[0]).toEqual(
        expect.objectContaining({
          id: 'case-1',
          severity: 'high',
          status: 'closed',
          ai_verdict: expect.objectContaining({
            verdict: 'true_positive',
            summary: 'One alert on host-1.',
          }),
        })
      );
    });

    it('never changes a case an analyst opened from the queue', async () => {
      const { service, casesClient } = setup({ caseTags: ['alertzero'] });

      await service.onInvestigationPatched(
        request,
        investigation({ case_id: 'case-1', status: 'closed' }),
        ['status']
      );

      expect(casesClient.cases.bulkUpdate).not.toHaveBeenCalled();
    });

    it("leaves a case alone that links more than this investigation (the analyst's case)", async () => {
      const { service, casesClient } = setup({ linked: ['inv-1', 'inv-2'] });

      await service.onInvestigationPatched(
        request,
        investigation({ case_id: 'case-1', severity: 'high' }),
        ['severity']
      );

      expect(casesClient.cases.bulkUpdate).not.toHaveBeenCalled();
    });
  });

  describe('decide', () => {
    it('releases the gate as the caller and records the decision with the new count', async () => {
      const { service, casesClient, proposalsService } = setup({
        proposals: [proposal(), proposal({ id: 'p-2', rootProposalId: 'p-2', title: 'Other' })],
      });

      await service.decide(request, 'case-1', 'p-1', 'approve');

      expect(proposalsService.releaseGate).toHaveBeenCalledWith(
        'p-1',
        expect.objectContaining({ approved: true, request })
      );
      expect(casesClient.cases.recordDecision).toHaveBeenCalledWith({
        caseId: 'case-1',
        proposalId: 'p-1',
        title: 'Close 1 alert as true positive',
        outcome: 'approved',
        pendingDecisions: 1,
      });
    });

    it('refuses a proposal that is not a decision on this case', async () => {
      const { service, proposalsService } = setup({
        proposals: [proposal({ caseId: 'another-case' })],
      });

      await expect(service.decide(request, 'case-1', 'p-1', 'approve')).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
      expect(proposalsService.releaseGate).not.toHaveBeenCalled();
    });

    it('checks Cases update before the gate is released', async () => {
      const { service, casesClient, proposalsService } = setup();
      casesClient.cases.setPendingDecisions.mockRejectedValue(new Error('Unauthorized'));

      await expect(service.decide(request, 'case-1', 'p-1', 'dismiss')).rejects.toThrow(
        'Unauthorized'
      );
      expect(proposalsService.releaseGate).not.toHaveBeenCalled();
    });
  });

  describe('listDecisions', () => {
    it('lists the decided page and corrects a stale counter', async () => {
      const { service, casesClient } = setup({
        proposals: [proposal({ status: 'succeeded', decision: 'approved' })],
      });

      const result = await service.listDecisions(request, 'case-1', { status: 'decided' });

      expect(result).toEqual(
        expect.objectContaining({ pending: 0, decided: 1, total: 1, can_decide: true })
      );
      expect(result.decisions[0]).toEqual(
        expect.objectContaining({ proposal_id: 'p-1', decision: 'approved' })
      );
      expect(casesClient.cases.setPendingDecisions).toHaveBeenCalledWith({
        caseId: 'case-1',
        count: 0,
      });
    });

    it('pages the waiting decisions with one query by case, past the old 100 cap', async () => {
      const many = Array.from({ length: 250 }, (_, i) =>
        proposal({ id: `p-${i}`, rootProposalId: `p-${i}`, title: `Isolate host ${i}` })
      );
      const { service, proposalsService } = setup({ proposals: many });

      const result = await service.listDecisions(request, 'case-1', {
        page: 3,
        per_page: 100,
        search: 'isolate',
      });

      expect(result.total).toBe(250);
      expect(result.pending).toBe(250);
      expect(result.decisions).toHaveLength(50);
      expect(result.decisions[0].proposal_id).toBe('p-200');
      expect(proposalsService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          caseId: 'case-1',
          awaitingDecision: true,
          excludeSuperseded: true,
          titleSearch: 'isolate',
          order: 'priority',
          from: 200,
          size: 100,
        }),
        'default',
        request
      );
    });

    it('reads the case as the caller first, so a hidden case lists nothing', async () => {
      const { service, casesClient, proposalsService } = setup();
      casesClient.cases.get.mockRejectedValue(new Error('Not found'));

      await expect(service.listDecisions(request, 'case-1')).rejects.toThrow('Not found');
      expect(proposalsService.list).not.toHaveBeenCalled();
    });
  });
});
