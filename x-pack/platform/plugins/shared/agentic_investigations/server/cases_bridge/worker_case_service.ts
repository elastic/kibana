/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { CasesServerStart } from '@kbn/cases-plugin/server';
import { CaseSeverity } from '@kbn/cases-plugin/common';
import type { Conversation } from '@kbn/agent-builder-common';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import type { Proposal } from '@kbn/proposals-common';
import {
  AI_INVESTIGATION_TEMPLATE_ID,
  HYPOTHESES_CASE_ATTACHMENT_TYPE,
  IMPACT_CASE_ATTACHMENT_TYPE,
  PROPOSAL_CASE_ATTACHMENT_TYPE,
  parseAiVerdict,
  caseDecisionsQuerySchema,
  type CaseDecision,
  type CaseDecisionsQuery,
  type CaseDecisionsResponse,
  type CaseVisibility,
  type HypothesesCaseAttachmentData,
  type ImpactCaseAttachmentData,
} from '../../common/cases_bridge';
import type { Impact } from '../../common/impact';
import type { InvestigationHypotheses } from '../../common/hypotheses';
import type { CaseBridgeService } from './case_bridge_service';

type CasesClient = Awaited<ReturnType<CasesServerStart['getCasesClientWithRequest']>>;
export type CaseActionSource = NonNullable<
  Parameters<CasesServerStart['getCasesClientWithRequest']>[1]
>['actionSource'];

const INVESTIGATION_TEMPLATE_ID = 'investigation';
/** Marks the cases a Worker opened, so what follows onto a case only ever reaches those. */
export const WORKER_CASE_TAG = 'alertzero:worker';
const ACTOR_NAME = 'Elastic AI Agent';

/** The investigation fields that follow onto its case. */
const MIRRORED_FIELDS = ['verdict', 'summary', 'severity', 'status'] as const;

export interface WorkerCaseSettings {
  enabled: boolean;
  visibility: CaseVisibility;
}

export interface WorkerCaseServiceDeps {
  logger: Logger;
  getCases: () => CasesServerStart | undefined;
  getBridge: () => CaseBridgeService;
  getProposals: () => ProposalsPluginStart | undefined;
  getSettings: (request: KibanaRequest) => Promise<WorkerCaseSettings>;
  getSpaceId: (request: KibanaRequest) => string;
  readFindings: (
    conversationId: string,
    spaceId: string
  ) => Promise<{ impact?: Impact; hypotheses?: InvestigationHypotheses }>;
  /** Proposals manage API privilege (`decideProposals` in the browser). */
  canDecideProposals: (request: KibanaRequest) => Promise<boolean>;
}

const toMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const toCaseSeverity = (severity: unknown): CaseSeverity | undefined =>
  Object.values(CaseSeverity).find((value) => value === severity);

/** Case statuses as Cases stores them (its enum isn't on the plugin's common entry). */
const toCaseStatus = (status: unknown): 'open' | 'in-progress' | 'closed' | undefined => {
  switch (status) {
    case 'open':
      return 'open';
    case 'in_progress':
    case 'in-progress':
      return 'in-progress';
    case 'closed':
      return 'closed';
    default:
      return undefined;
  }
};

/** The proposals service's errors, as the proposals routes answer them. */
const toBoom = (error: unknown): Error => {
  const name = error instanceof Error ? error.name : '';
  const message = toMessage(error);
  switch (name) {
    case 'ProposalConflictError':
    case 'ProposalAlreadyExistsError':
      return Boom.conflict(message);
    case 'ProposalNotFoundError':
      return Boom.notFound(message);
    case 'ProposalForbiddenError':
      return Boom.forbidden(message);
    default:
      return error instanceof Error ? error : new Error(message);
  }
};

/** Released means someone decided and the gate is still writing it, so it no longer waits. */
const isAwaitingDecision = (
  proposal: Pick<Proposal, 'status' | 'decision' | 'gateReleasedAt'>
): boolean =>
  proposal.status === 'pending' &&
  proposal.decision === undefined &&
  proposal.gateReleasedAt === undefined;

const statusOf = (proposal: Proposal): string => {
  if (isAwaitingDecision(proposal)) return 'pending';
  if (proposal.decision === undefined && proposal.gateReleasedAt !== undefined) return 'deciding';
  return proposal.status;
};

const toCaseDecision = (proposal: Proposal): CaseDecision => ({
  proposal_id: proposal.id,
  title: proposal.title,
  comment: proposal.comment,
  ...(proposal.category ? { category: proposal.category } : {}),
  investigation_id: proposal.conversationId,
  status: statusOf(proposal),
  ...(proposal.decision ? { decision: proposal.decision } : {}),
  ...(proposal.createdAt ? { created_at: proposal.createdAt } : {}),
  ...(proposal.createdBy
    ? {
        created_by: {
          username: proposal.createdBy.username,
          full_name: proposal.createdBy.fullName,
        },
      }
    : {}),
  ...(proposal.decidedAt ? { decided_at: proposal.decidedAt } : {}),
  ...(proposal.decidedBy
    ? {
        decided_by: {
          username: proposal.decidedBy.username,
          full_name: proposal.decidedBy.fullName,
        },
      }
    : {}),
});

/**
 * Next-up, behind `agenticInvestigations:openCasesForInvestigations` (off by default): the case a
 * Worker's investigation opens, what follows onto it (verdict, severity, status, evidence), and
 * its decisions. Every method is a no-op with the setting off, and never fails the investigation
 * write that triggered it.
 */
export class WorkerCaseService {
  constructor(private readonly deps: WorkerCaseServiceDeps) {}

  private async getCasesClient(
    request: KibanaRequest,
    actionSource?: CaseActionSource
  ): Promise<CasesClient> {
    const cases = this.deps.getCases();
    if (!cases) {
      throw Boom.notFound('Cases is not available');
    }
    return cases.getCasesClientWithRequest(request, actionSource ? { actionSource } : undefined);
  }

  async isEnabled(request: KibanaRequest): Promise<boolean> {
    try {
      return (await this.deps.getSettings(request)).enabled;
    } catch (error) {
      this.deps.logger.debug(`Couldn't read the open-cases setting: ${toMessage(error)}`);
      return false;
    }
  }

  /** Opens the investigation's case. Returns its id, or undefined when the setting is off. */
  async onInvestigationCreated(
    request: KibanaRequest,
    investigation: Conversation,
    actionSource?: CaseActionSource
  ): Promise<string | undefined> {
    if (investigation.template_id !== INVESTIGATION_TEMPLATE_ID) return undefined;
    let settings: WorkerCaseSettings;
    try {
      settings = await this.deps.getSettings(request);
    } catch {
      return undefined;
    }
    if (!settings.enabled) return undefined;
    try {
      const opened = await this.deps.getBridge().openCase(
        request,
        investigation.id,
        {
          title: investigation.title,
          template_id: AI_INVESTIGATION_TEMPLATE_ID,
          visibility: settings.visibility,
          assignees: [],
          linked_investigation_ids: [],
          // A case a Worker opens never sends data out of Elastic on its own.
          push: false,
        },
        { actionSource, extraTags: [WORKER_CASE_TAG] }
      );
      return opened.case_id;
    } catch (error) {
      this.deps.logger.warn(
        `Investigation ${investigation.id} was created, but opening its case failed: ${toMessage(
          error
        )}`
      );
      return undefined;
    }
  }

  /**
   * Mirrors the investigation's verdict and summary, severity, and status onto its case. Only for
   * a case whose one linked investigation is this one: a case an analyst grew is the analyst's.
   */
  async onInvestigationPatched(
    request: KibanaRequest,
    investigation: Conversation,
    changedFields: string[],
    actionSource?: CaseActionSource
  ): Promise<void> {
    const changed = MIRRORED_FIELDS.filter((field) => changedFields.includes(field));
    const caseId = investigation.metadata?.case_id;
    if (changed.length === 0 || typeof caseId !== 'string' || caseId.length === 0) return;
    if (!(await this.isEnabled(request))) return;

    try {
      const casesClient = await this.getCasesClient(request, actionSource);
      const theCase = await casesClient.cases.get({ id: caseId, includeComments: false });
      // An analyst's case (opened from the queue) is never changed by its investigation.
      if (!theCase.tags.includes(WORKER_CASE_TAG)) return;
      const linked = await this.deps.getBridge().getLinkedInvestigationIds(request, caseId);
      if (linked.length !== 1 || linked[0] !== investigation.id) return;

      const metadata = investigation.metadata ?? {};
      const patch: Record<string, unknown> = {};

      if (changed.includes('verdict') || changed.includes('summary')) {
        const verdict = parseAiVerdict(
          typeof metadata.verdict === 'string' ? metadata.verdict : undefined
        );
        if (verdict) {
          patch.ai_verdict = {
            verdict,
            confidence: null,
            summary: typeof metadata.summary === 'string' ? metadata.summary : null,
            actor: {
              type: 'agent',
              id: investigation.agent_id,
              name: ACTOR_NAME,
              run_id: investigation.id,
            },
            updated_at: new Date().toISOString(),
          };
        }
      }
      const severity = changed.includes('severity') ? toCaseSeverity(metadata.severity) : undefined;
      if (severity && severity !== theCase.severity) {
        patch.severity = severity;
      }
      const status = changed.includes('status') ? toCaseStatus(metadata.status) : undefined;
      if (status && status !== theCase.status) {
        patch.status = status;
      }
      if (Object.keys(patch).length === 0) return;

      await casesClient.cases.bulkUpdate({
        cases: [{ id: theCase.id, version: theCase.version, ...patch }] as Parameters<
          CasesClient['cases']['bulkUpdate']
        >[0]['cases'],
      });
    } catch (error) {
      this.deps.logger.warn(
        `Investigation ${
          investigation.id
        } changed, but its case ${caseId} wasn't updated: ${toMessage(error)}`
      );
    }
  }

  /**
   * The case a Worker opened for this investigation, read as the caller, or undefined. `case_id` is
   * an ordinary investigation field, so it alone never decides where the Worker writes.
   */
  private async getWorkerCaseOf(
    request: KibanaRequest,
    casesClient: CasesClient,
    investigation: Conversation
  ) {
    const caseId = investigation.metadata?.case_id;
    if (typeof caseId !== 'string' || caseId.length === 0) return undefined;
    const theCase = await casesClient.cases.get({ id: caseId, includeComments: false });
    if (!theCase.tags.includes(WORKER_CASE_TAG)) return undefined;
    const linked = await this.deps.getBridge().getLinkedInvestigationIds(request, caseId);
    return linked.includes(investigation.id) ? theCase : undefined;
  }

  /** Copies the investigation's impact and hypotheses onto its case, one attachment each. */
  async onFindingsWritten(request: KibanaRequest, investigation: Conversation): Promise<void> {
    const caseId = investigation.metadata?.case_id;
    if (typeof caseId !== 'string' || caseId.length === 0) return;
    if (!(await this.isEnabled(request))) return;

    try {
      const casesClient = await this.getCasesClient(request);
      const theCase = await this.getWorkerCaseOf(request, casesClient, investigation);
      if (!theCase) return;
      const { impact, hypotheses } = await this.deps.readFindings(
        investigation.id,
        this.deps.getSpaceId(request)
      );
      const copiedAt = new Date().toISOString();

      if (impact && (impact.summary || (impact.entities ?? []).length > 0)) {
        const data: ImpactCaseAttachmentData = {
          investigation_id: investigation.id,
          investigation_title: investigation.title,
          ...(impact.summary ? { summary: impact.summary.slice(0, 10_000) } : {}),
          entities: (impact.entities ?? []).slice(0, 100).map(({ id, name, type }) => ({
            id,
            ...(name ? { name } : {}),
            ...(type ? { type } : {}),
          })),
          copied_at: copiedAt,
        };
        await this.upsertCopy(casesClient, theCase, IMPACT_CASE_ATTACHMENT_TYPE, data);
      }
      if (hypotheses && hypotheses.hypotheses.length > 0) {
        const data: HypothesesCaseAttachmentData = {
          investigation_id: investigation.id,
          investigation_title: investigation.title,
          hypotheses: hypotheses.hypotheses.slice(0, 50).map((hypothesis) => ({
            candidate: hypothesis.candidate.slice(0, 10_000),
            status: hypothesis.status,
            confidence: hypothesis.confidence,
            ...(hypothesis.reason ? { reason: hypothesis.reason.slice(0, 10_000) } : {}),
          })),
          copied_at: copiedAt,
        };
        await this.upsertCopy(casesClient, theCase, HYPOTHESES_CASE_ATTACHMENT_TYPE, data);
      }
    } catch (error) {
      this.deps.logger.warn(
        `The findings of investigation ${
          investigation.id
        } weren't copied to case ${caseId}: ${toMessage(error)}`
      );
    }
  }

  private async upsertCopy(
    casesClient: CasesClient,
    theCase: { id: string; owner: string },
    type: typeof IMPACT_CASE_ATTACHMENT_TYPE | typeof HYPOTHESES_CASE_ATTACHMENT_TYPE,
    data: ImpactCaseAttachmentData | HypothesesCaseAttachmentData
  ): Promise<void> {
    const found = await casesClient.attachments.find({
      caseID: theCase.id,
      findQueryParams: { type, perPage: 100 },
    });
    const existing = found.data.find(
      (attachment) =>
        'data' in attachment &&
        (attachment.data as { investigation_id?: string } | null)?.investigation_id ===
          data.investigation_id
    );
    const payload = { type, owner: theCase.owner, data };
    if (existing) {
      await casesClient.attachments.update({
        caseID: theCase.id,
        updateRequest: { ...payload, id: existing.id, version: existing.version },
      } as Parameters<CasesClient['attachments']['update']>[0]);
    } else {
      await casesClient.attachments.bulkCreate({
        caseId: theCase.id,
        attachments: [payload],
      } as Parameters<CasesClient['attachments']['bulkCreate']>[0]);
    }
  }

  /** Proposals extension: the case a new proposal belongs to, with the setting on. */
  async resolveCaseIdForProposal(
    request: KibanaRequest,
    getInvestigation: () => Promise<Conversation>
  ): Promise<string | undefined> {
    if (!(await this.isEnabled(request))) return undefined;
    const investigation = await getInvestigation();
    if (investigation.template_id !== INVESTIGATION_TEMPLATE_ID) return undefined;
    const theCase = await this.getWorkerCaseOf(
      request,
      await this.getCasesClient(request),
      investigation
    );
    return theCase?.id;
  }

  /** Proposals extension: adds the decision to its case and counts it. */
  async onProposalCreated(request: KibanaRequest, proposal: Proposal): Promise<void> {
    if (!proposal.caseId) return;
    const casesClient = await this.getCasesClient(request);
    const theCase = await casesClient.cases.get({ id: proposal.caseId, includeComments: false });
    await casesClient.attachments.bulkCreate({
      caseId: theCase.id,
      attachments: [
        {
          type: PROPOSAL_CASE_ATTACHMENT_TYPE,
          owner: theCase.owner,
          attachmentId: proposal.rootProposalId ?? proposal.id,
          metadata: { title: proposal.title, investigation_id: proposal.conversationId },
        },
      ],
    } as Parameters<CasesClient['attachments']['bulkCreate']>[0]);
    const { pending } = await this.countDecisions(request, theCase.id);
    await casesClient.cases.setPendingDecisions({ caseId: theCase.id, count: pending });
  }

  private requireProposals(): ProposalsPluginStart {
    const proposals = this.deps.getProposals();
    if (!proposals) {
      throw Boom.notFound('Proposals are not available');
    }
    return proposals;
  }

  /**
   * One page of the case's decisions. Proposals carry the case they belong to, so the read is one
   * query by case rather than a walk over the case's decision attachments.
   */
  private async searchDecisions(
    request: KibanaRequest,
    caseId: string,
    {
      awaiting,
      from,
      size,
      search,
      investigationId,
    }: { awaiting: boolean; from: number; size: number; search?: string; investigationId?: string }
  ): Promise<{ proposals: Proposal[]; total: number }> {
    const { proposals, total } = await this.requireProposals()
      .getProposalsService()
      .list(
        {
          caseId,
          awaitingDecision: awaiting,
          excludeSuperseded: true,
          excludeExpired: false,
          ...(search ? { titleSearch: search } : {}),
          ...(investigationId ? { conversationId: investigationId } : {}),
          // Waiting decisions in the queue's priority order; decided ones newest first.
          order: awaiting ? 'priority' : 'newest',
          from,
          size,
        },
        this.deps.getSpaceId(request),
        request
      );
    return { proposals, total };
  }

  private async countDecisions(
    request: KibanaRequest,
    caseId: string
  ): Promise<{ pending: number; decided: number }> {
    const [pending, decided] = await Promise.all([
      this.searchDecisions(request, caseId, { awaiting: true, from: 0, size: 1 }),
      this.searchDecisions(request, caseId, { awaiting: false, from: 0, size: 1 }),
    ]);
    return { pending: pending.total, decided: decided.total };
  }

  async listDecisions(
    request: KibanaRequest,
    caseId: string,
    rawQuery: CaseDecisionsQuery = {}
  ): Promise<CaseDecisionsResponse> {
    const query = caseDecisionsQuerySchema.parse(rawQuery);
    const casesClient = await this.getCasesClient(request);
    // Read as the caller first: a restricted case a non-member asks for is not found.
    const theCase = await casesClient.cases.get({ id: caseId, includeComments: false });
    const [page, counts, canDecide] = await Promise.all([
      this.searchDecisions(request, theCase.id, {
        awaiting: query.status === 'pending',
        from: (query.page - 1) * query.per_page,
        size: query.per_page,
        search: query.search || undefined,
        investigationId: query.investigation_id,
      }),
      this.countDecisions(request, theCase.id),
      this.deps.canDecideProposals(request),
    ]);

    // Decisions made in AlertZero don't reach the case, so a read by someone who can decide
    // corrects the counter (it needs Cases update too; without it the write is refused quietly).
    const recorded = (theCase as { pending_decisions?: number | null }).pending_decisions ?? 0;
    if (canDecide && recorded !== counts.pending) {
      await casesClient.cases
        .setPendingDecisions({ caseId: theCase.id, count: counts.pending })
        .catch((error: unknown) =>
          this.deps.logger.debug(
            `Case ${caseId}: pending decisions not corrected: ${toMessage(error)}`
          )
        );
    }
    return {
      decisions: page.proposals.map(toCaseDecision),
      total: page.total,
      pending: counts.pending,
      decided: counts.decided,
      can_decide: canDecide,
    };
  }

  /**
   * Recounts the case's pending decisions after its investigations changed under it (closing the
   * case dismisses their proposals). No-op with the setting off or without decisions.
   */
  async refreshPendingDecisions(request: KibanaRequest, caseId: string): Promise<void> {
    if (!(await this.isEnabled(request))) return;
    try {
      const casesClient = await this.getCasesClient(request);
      const theCase = await casesClient.cases.get({ id: caseId, includeComments: false });
      const recorded = (theCase as { pending_decisions?: number | null }).pending_decisions ?? 0;
      const { pending } = await this.countDecisions(request, theCase.id);
      if (pending !== recorded) {
        await casesClient.cases.setPendingDecisions({ caseId, count: pending });
      }
    } catch (error) {
      this.deps.logger.debug(
        `Case ${caseId}: pending decisions not recounted: ${toMessage(error)}`
      );
    }
  }

  async decide(
    request: KibanaRequest,
    caseId: string,
    proposalId: string,
    decision: 'approve' | 'dismiss'
  ): Promise<CaseDecisionsResponse> {
    const casesClient = await this.getCasesClient(request);
    const theCase = await casesClient.cases.get({ id: caseId, includeComments: false });
    const service = this.requireProposals().getProposalsService();
    const spaceId = this.deps.getSpaceId(request);
    let proposal: Proposal;
    try {
      // A decision made on an older revision is made on the live one.
      const latest = await service.getLatestRevision(proposalId, spaceId);
      proposal = await service.get(latest?.proposalId ?? proposalId, spaceId, request);
    } catch (error) {
      throw toBoom(error);
    }
    if (proposal.caseId !== theCase.id) {
      throw Boom.notFound(`Proposal ${proposalId} is not a decision on case ${caseId}`);
    }
    const { pending } = await this.countDecisions(request, theCase.id);
    if (!isAwaitingDecision(proposal)) {
      throw Boom.conflict(`Proposal ${proposalId} was already decided`);
    }

    // Cases update is checked before the gate is released: once released, the decision stands,
    // and a caller who can't write to the case would leave it without its Activity row.
    await casesClient.cases.setPendingDecisions({ caseId: theCase.id, count: pending });

    try {
      await service.releaseGate(proposal.id, {
        approved: decision === 'approve',
        ...(decision === 'dismiss' ? { dismissReason: 'no_reason' as const } : {}),
        spaceId,
        request,
      });
    } catch (error) {
      throw toBoom(error);
    }

    // The gate writes the decision after it resumes, so this one is counted as decided now.
    const pendingAfter = Math.max(0, pending - 1);
    await casesClient.cases.recordDecision({
      caseId: theCase.id,
      proposalId: proposal.id,
      title: proposal.title,
      outcome: decision === 'approve' ? 'approved' : 'dismissed',
      pendingDecisions: pendingAfter,
    });

    return this.listDecisions(request, caseId);
  }
}
