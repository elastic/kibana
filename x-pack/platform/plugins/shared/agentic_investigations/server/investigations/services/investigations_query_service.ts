/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type {
  ConversationSearchSort,
  ConversationWithoutRoundsWithPermissions,
  MetadataFieldValue,
  VersionedAttachment,
} from '@kbn/agent-builder-common';
import type { ConversationPublicClient } from '@kbn/agent-builder-server';
import type { KueryNode } from '@kbn/es-query';
import { nodeBuilder, nodeTypes } from '@kbn/es-query';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import type { ProposalWithMetadata } from '@kbn/proposals-common';
import { INVESTIGATION_TEMPLATE_ID } from '../../../common/escalations/constants';
import type { InvestigationHypotheses } from '../../../common/hypotheses/hypotheses';
import type { Impact } from '../../../common/impact/impact';
import {
  INVESTIGATION_SEVERITY_NONE,
  MAX_INVESTIGATION_CANDIDATES,
  MAX_INVESTIGATIONS_PAGE_SIZE,
} from '../../../common/investigations/constants';
import type {
  Investigation,
  InvestigationFilters,
  InvestigationImpactResponse,
  InvestigationMetadata,
  InvestigationProposalSummary,
  InvestigationSeverity,
  InvestigationSeverityCounts,
  InvestigationSubjectResponse,
  InvestigationSummary,
  ListInvestigationsQuery,
  ListInvestigationsResponse,
} from '../../../common/investigations/investigation';
import { countPendingProposals } from './count_pending_proposals';
import { isInvestigationSeverity } from '../../../common/investigations/severity';
import { isInvestigationTitlePending } from '../../../common/investigations/title';
import type {
  InvestigationSubject,
  InvestigationSubjectKey,
} from '../../../common/subjects/subject';
import { WrongTemplateError } from '../../assignments/errors';
import type { HypothesesService } from '../../hypotheses/services/hypotheses_service';
import type { ImpactService } from '../../impact/services/impact_service';
import type { SubjectsService } from '../../subjects/services/subjects_service';
import { retryWhileShardUnavailable } from '../../investigation_attachments';
import { MAX_INVESTIGATION_CANDIDATE_CONVERSATION_IDS } from '../../investigation_attachments/attachment_doc_service';
import { bulkGetReadableConversations } from './readable_conversation_ids';
import type { InProgressResolver } from './in_progress';

/** Bound on the proposals one investigation read returns. */
const MAX_INVESTIGATION_PROPOSALS = 100;

/**
 * Attachment ids one conversation search filters on. Agent Builder caps a filter at 100
 * expressions, and an `or` of N comparisons counts N + 1.
 */
const MAX_ATTACHMENT_IDS_PER_SEARCH = 50;

/** Pages of {@link MAX_INVESTIGATION_CANDIDATES} a candidate search reads: Elasticsearch's result window. */
const MAX_CANDIDATE_SEARCH_PAGES = 10_000 / MAX_INVESTIGATION_CANDIDATES;

const SEVERITY_RANK: Record<InvestigationSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

type ConversationSummary = ConversationWithoutRoundsWithPermissions;

export interface InvestigationsQueryServiceDeps {
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
  getSpaceId: (request: KibanaRequest) => string;
  getImpactService: () => ImpactService;
  getSubjectsService: () => SubjectsService;
  getHypothesesService: () => HypothesesService;
  getProposals: () => ProposalsPluginStart | undefined;
  inProgress: InProgressResolver;
  logger: Logger;
}

/**
 * Reads investigations: Agent Builder conversations on the `investigation` template, joined with
 * the side indexes (subjects, impact, hypotheses), proposals, and the in-progress state.
 *
 * Two phases. The side indexes are read as the internal user, scoped by space, and only yield
 * candidate conversation ids; the conversations are then read as the caller (`bulkGet` or
 * `search`), so an investigation the caller cannot read never appears. Filters Agent Builder
 * cannot apply run in memory over at most {@link MAX_INVESTIGATION_CANDIDATES} candidates, and
 * only the requested page is hydrated.
 *
 * A side-index document whose conversation attachment exists but is inactive (the user removed
 * it) is hidden; a document that was never attached (an agent turn that has not ended yet) stays
 * visible. See {@link InvestigationsQueryService.findRemovedDocumentIds} for how lists tell the
 * two apart without reading every conversation in full.
 */
export class InvestigationsQueryService {
  constructor(private readonly deps: InvestigationsQueryServiceDeps) {}

  async get(request: KibanaRequest, id: string): Promise<Investigation> {
    const client = await this.deps.getConversationClient(request);
    const conversation = await retryWhileShardUnavailable(() => client.get(id));
    if (conversation.template_id !== INVESTIGATION_TEMPLATE_ID) {
      throw new WrongTemplateError(id, INVESTIGATION_TEMPLATE_ID);
    }

    const spaceId = this.deps.getSpaceId(request);
    const [subjects, impact, hypotheses, inProgress, proposals] = await Promise.all([
      this.deps.getSubjectsService().listByConversationIds([id], spaceId),
      this.deps.getImpactService().findByConversationId(id, spaceId),
      this.deps.getHypothesesService().findByConversationId(id, spaceId),
      this.deps.inProgress.isInProgress(request, spaceId, id),
      this.listProposals(request, id, spaceId),
    ]);

    const removed = removedAttachmentIds(conversation.attachments);
    const visibleHypotheses = hypotheses && !removed.has(hypotheses.id) ? hypotheses : undefined;
    return {
      ...toSummary({
        conversation,
        inProgress,
        subjects: subjects.filter(({ id: docId }) => !removed.has(docId)),
        impact: impact && !removed.has(impact.id) ? impact : undefined,
      }),
      ...(visibleHypotheses && { hypotheses: toHypothesesResponse(visibleHypotheses) }),
      proposals,
    };
  }

  async list(
    request: KibanaRequest,
    query: ListInvestigationsQuery
  ): Promise<ListInvestigationsResponse> {
    const { page, per_page: perPage, sort_field: sortField, sort_order: sortOrder } = query;
    const spaceId = this.deps.getSpaceId(request);
    const client = await this.deps.getConversationClient(request);
    const inProgressIds = await this.deps.inProgress.findInProgressIds(request, spaceId);

    const candidates = await this.findCandidates({
      client,
      spaceId,
      filters: query,
      inProgressIds,
      searchSort:
        sortField === 'severity'
          ? { field: 'updated_at', order: 'desc' }
          : { field: sortField, order: sortOrder },
      compare: compareConversations(sortField, sortOrder),
    });
    candidates.sort(compareConversations(sortField, sortOrder));

    const start = (page - 1) * perPage;
    const results = await this.hydrate({
      request,
      client,
      spaceId,
      conversations: candidates.slice(start, start + perPage),
      inProgressIds,
    });
    return { results, pagination: { total: candidates.length, page, per_page: perPage } };
  }

  async severityCounts(
    request: KibanaRequest,
    filters: InvestigationFilters
  ): Promise<InvestigationSeverityCounts> {
    const spaceId = this.deps.getSpaceId(request);
    const client = await this.deps.getConversationClient(request);
    const inProgressIds =
      filters.in_progress === undefined
        ? new Set<string>()
        : await this.deps.inProgress.findInProgressIds(request, spaceId);

    const candidates = await this.findCandidates({
      client,
      spaceId,
      filters,
      inProgressIds,
      searchSort: { field: 'updated_at', order: 'desc' },
      compare: compareConversations('updated_at', 'desc'),
    });

    const counts: InvestigationSeverityCounts = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const conversation of candidates) {
      const { severity } = toMetadata(conversation.metadata);
      if (severity) {
        counts[severity] += 1;
      }
    }
    return counts;
  }

  /**
   * Open investigations the caller can read that hold any of the subjects, most recently updated
   * first. A subject the user removed from an investigation does not match it.
   */
  async findOpenBySubjects(
    request: KibanaRequest,
    subjects: InvestigationSubjectKey[]
  ): Promise<InvestigationSummary[]> {
    if (subjects.length === 0) {
      return [];
    }
    const spaceId = this.deps.getSpaceId(request);
    const client = await this.deps.getConversationClient(request);
    const ids = await this.deps
      .getSubjectsService()
      .findConversationIdsBySubjects(subjects, spaceId);
    if (ids.length === 0) {
      return [];
    }

    const open = [...(await retryWhileShardUnavailable(() => client.bulkGet(ids))).values()]
      .filter(
        (conversation) =>
          conversation.template_id === INVESTIGATION_TEMPLATE_ID &&
          toMetadata(conversation.metadata).status === 'open'
      )
      .sort(compareConversations('updated_at', 'desc'))
      .slice(0, MAX_INVESTIGATIONS_PAGE_SIZE);
    if (open.length === 0) {
      return [];
    }

    const inProgressIds = await this.deps.inProgress.findInProgressIds(request, spaceId);
    const wanted = new Set(subjects.map(subjectKey));
    const hydrated = await this.hydrate({
      request,
      client,
      spaceId,
      conversations: open,
      inProgressIds,
    });
    return hydrated.filter((investigation) =>
      investigation.subjects.some((subject) => wanted.has(subjectKey(subject)))
    );
  }

  /**
   * Every investigation the caller can read that matches the filters, capped at
   * {@link MAX_INVESTIGATION_CANDIDATES}, the first ones in `compare` order. The cap applies only
   * after the access check and every filter, so investigations the caller cannot read, or that a
   * filter Agent Builder cannot apply drops, never take a candidate slot.
   */
  private async findCandidates({
    client,
    spaceId,
    filters,
    inProgressIds,
    searchSort,
    compare,
  }: {
    client: ConversationPublicClient;
    spaceId: string;
    filters: InvestigationFilters;
    inProgressIds: Set<string>;
    searchSort: ConversationSearchSort;
    compare: (a: ConversationSummary, b: ConversationSummary) => number;
  }): Promise<ConversationSummary[]> {
    const matches = (conversation: ConversationSummary) =>
      matchesFilters(conversation, filters, inProgressIds);

    const ids = await this.findCandidateIds(spaceId, filters, inProgressIds);
    if (ids === undefined) {
      return this.searchCandidates({ client, filters, searchSort, matches });
    }
    if (ids.length === 0) {
      return [];
    }

    const readable = await bulkGetReadableConversations(client, ids);
    return [...readable.values()]
      .filter(matches)
      .sort(compare)
      .slice(0, MAX_INVESTIGATION_CANDIDATES);
  }

  /**
   * Candidates from an access-checked conversation search, read page by page in `searchSort`
   * order until {@link MAX_INVESTIGATION_CANDIDATES} of them pass the in-memory filters (the ones
   * the search filter cannot express, such as `in_progress` or the free-text query) or the
   * search runs out, within Elasticsearch's result window.
   */
  private async searchCandidates({
    client,
    filters,
    searchSort,
    matches,
  }: {
    client: ConversationPublicClient;
    filters: InvestigationFilters;
    searchSort: ConversationSearchSort;
    matches: (conversation: ConversationSummary) => boolean;
  }): Promise<ConversationSummary[]> {
    const filter = buildSearchFilter(filters);
    const candidates: ConversationSummary[] = [];
    for (let page = 1; page <= MAX_CANDIDATE_SEARCH_PAGES; page++) {
      const { results } = await retryWhileShardUnavailable(() =>
        client.search({ filter, sort: searchSort, page, perPage: MAX_INVESTIGATION_CANDIDATES })
      );
      candidates.push(...results.filter(matches));
      if (
        candidates.length >= MAX_INVESTIGATION_CANDIDATES ||
        results.length < MAX_INVESTIGATION_CANDIDATES
      ) {
        break;
      }
    }
    return candidates.slice(0, MAX_INVESTIGATION_CANDIDATES);
  }

  /**
   * Candidate ids from the side indexes and the in-progress set, intersected. Undefined when no
   * such filter is set, so candidates come from a conversation search instead.
   */
  private async findCandidateIds(
    spaceId: string,
    filters: InvestigationFilters,
    inProgressIds: Set<string>
  ): Promise<string[] | undefined> {
    const sets: string[][] = [];

    if (filters.id) {
      sets.push(filters.id);
    }

    const subjectFilter: QueryDslQueryContainer[] = [
      ...(filters.subject_type ? [{ terms: { subjectType: filters.subject_type } }] : []),
      ...(filters.subject_id ? [{ terms: { subjectId: filters.subject_id } }] : []),
    ];
    if (subjectFilter.length > 0) {
      sets.push(
        await this.deps.getSubjectsService().getDocumentService().searchConversationIds({
          spaceId,
          filter: subjectFilter,
          size: MAX_INVESTIGATION_CANDIDATE_CONVERSATION_IDS,
        })
      );
    }

    if (filters.entity !== undefined) {
      sets.push(
        await this.deps
          .getImpactService()
          .getDocumentService()
          .searchConversationIds({
            spaceId,
            size: MAX_INVESTIGATION_CANDIDATE_CONVERSATION_IDS,
            filter: [
              {
                nested: {
                  path: 'entities',
                  query: {
                    bool: {
                      should: [
                        { term: { 'entities.id': filters.entity } },
                        { term: { 'entities.name': filters.entity } },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                },
              },
            ],
          })
      );
    }

    if (filters.in_progress === true) {
      sets.push([...inProgressIds]);
    }

    if (sets.length === 0) {
      return undefined;
    }
    const [first, ...rest] = sets;
    return rest.reduce(
      (intersection, next) => {
        const keep = new Set(next);
        return intersection.filter((id) => keep.has(id));
      },
      [...new Set(first)]
    );
  }

  private async hydrate({
    request,
    client,
    spaceId,
    conversations,
    inProgressIds,
  }: {
    request: KibanaRequest;
    client: ConversationPublicClient;
    spaceId: string;
    conversations: ConversationSummary[];
    inProgressIds: Set<string>;
  }): Promise<InvestigationSummary[]> {
    if (conversations.length === 0) {
      return [];
    }
    const ids = conversations.map(({ id }) => id);
    const [subjects, impacts, pendingProposalCounts] = await Promise.all([
      this.deps.getSubjectsService().listByConversationIds(ids, spaceId),
      this.deps.getImpactService().listByConversationIds(ids, spaceId),
      countPendingProposals({
        proposals: this.deps.getProposals(),
        request,
        conversationIds: ids,
        spaceId,
        logger: this.deps.logger,
      }),
    ]);
    const subjectsByConversation = groupBy(subjects, ({ conversationId }) => conversationId);
    const impactByConversation = new Map(impacts.map((impact) => [impact.conversationId, impact]));

    const removed = await this.findRemovedDocumentIds(
      client,
      conversations.map((conversation) => {
        const impact = impactByConversation.get(conversation.id);
        return {
          conversation,
          documentIds: [
            ...(subjectsByConversation.get(conversation.id) ?? []).map(({ id }) => id),
            ...(impact ? [impact.id] : []),
          ],
        };
      })
    );

    return conversations.map((conversation) => {
      const impact = impactByConversation.get(conversation.id);
      const summary = toSummary({
        conversation,
        inProgress: inProgressIds.has(conversation.id),
        subjects: (subjectsByConversation.get(conversation.id) ?? []).filter(
          ({ id }) => !removed.has(id)
        ),
        impact: impact && !removed.has(impact.id) ? impact : undefined,
      });
      return pendingProposalCounts
        ? { ...summary, pending_proposal_count: pendingProposalCounts.get(conversation.id) ?? 0 }
        : summary;
    });
  }

  /**
   * Document ids on the page whose conversation attachment the user removed.
   *
   * List rows carry only active attachment ids, so a document missing from its row was either
   * removed or never attached (an agent turn that has not ended). The conversation search filter
   * on `attachment_id` matches an attachment whether or not it is active, so one search per
   * chunk of such ids finds the conversations that hold one: a held id that is still not active
   * was removed. Only a conversation with several such ids in the same search is read in full,
   * to tell them apart. The cost no longer grows with every list call for every removed
   * attachment: steady state is one light search per page.
   */
  private async findRemovedDocumentIds(
    client: ConversationPublicClient,
    rows: Array<{ conversation: ConversationSummary; documentIds: string[] }>
  ): Promise<Set<string>> {
    const unconfirmed = rows.flatMap(({ conversation, documentIds }) => {
      const active = new Set((conversation.attachments ?? []).map(({ id }) => id));
      return documentIds
        .filter((id) => !active.has(id))
        .map((id) => ({ conversationId: conversation.id, id }));
    });

    const removed = new Set<string>();
    const ambiguous = new Set<string>();
    for (let start = 0; start < unconfirmed.length; start += MAX_ATTACHMENT_IDS_PER_SEARCH) {
      const chunk = unconfirmed.slice(start, start + MAX_ATTACHMENT_IDS_PER_SEARCH);
      let holders: ConversationSummary[];
      try {
        ({ results: holders } = await client.search({
          filter: nodeBuilder.or(chunk.map(({ id }) => nodeBuilder.is('attachment_id', id))),
          page: 1,
          perPage: chunk.length,
        }));
      } catch (error) {
        this.deps.logger.debug(`Could not look up removed attachments: ${errorMessage(error)}`);
        continue;
      }
      for (const holder of holders) {
        // Active by now (the turn ended after the list read): not removed.
        const activeNow = new Set((holder.attachments ?? []).map(({ id }) => id));
        const held = chunk.filter(
          ({ conversationId, id }) => conversationId === holder.id && !activeNow.has(id)
        );
        if (held.length === 1) {
          removed.add(held[0].id);
        } else if (held.length > 1) {
          ambiguous.add(holder.id);
        }
      }
    }

    await Promise.all(
      [...ambiguous].map(async (conversationId) => {
        try {
          const { attachments } = await client.get(conversationId);
          removedAttachmentIds(attachments).forEach((id) => removed.add(id));
        } catch (error) {
          this.deps.logger.debug(
            `Could not read attachments of investigation ${conversationId}: ${errorMessage(error)}`
          );
        }
      })
    );
    return removed;
  }

  /**
   * The investigation's live proposals. Empty when the proposals plugin is absent or the caller
   * may not read proposals, so an investigation read does not need the proposals privilege.
   */
  private async listProposals(
    request: KibanaRequest,
    conversationId: string,
    spaceId: string
  ): Promise<InvestigationProposalSummary[]> {
    const proposals = this.deps.getProposals();
    if (!proposals) {
      return [];
    }
    try {
      await proposals.getProposalPrivileges().assertCanRead(request);
    } catch {
      return [];
    }
    const { proposals: found } = await retryWhileShardUnavailable(() =>
      proposals.getProposalsService().list(
        {
          conversationId,
          excludeSuperseded: true,
          excludeExpired: false,
          size: MAX_INVESTIGATION_PROPOSALS,
          from: 0,
        },
        spaceId,
        request
      )
    );
    return found.map(toProposalSummary);
  }
}

const buildSearchFilter = (filters: InvestigationFilters): KueryNode => {
  const clauses: KueryNode[] = [nodeBuilder.is('template_id', INVESTIGATION_TEMPLATE_ID)];

  const statuses = filters.status ? [...new Set(filters.status)] : [];
  if (statuses.length === 1) {
    // A missing status reads as open, so "open" is "not closed".
    const closed = nodeBuilder.is('metadata.status', 'closed');
    clauses.push(statuses[0] === 'closed' ? closed : nodeTypes.function.buildNode('not', closed));
  }
  // `none` (no severity yet) is matched in memory, so the search must not narrow by severity.
  if (filters.severity && !filters.severity.includes(INVESTIGATION_SEVERITY_NONE)) {
    clauses.push(
      nodeBuilder.or(
        [...new Set(filters.severity)].map((severity) =>
          nodeBuilder.is('metadata.severity', severity)
        )
      )
    );
  }
  if (filters.created_after) {
    clauses.push(nodeTypes.function.buildNode('range', 'created_at', 'gte', filters.created_after));
  }
  if (filters.created_before) {
    clauses.push(
      nodeTypes.function.buildNode('range', 'created_at', 'lte', filters.created_before)
    );
  }
  return nodeBuilder.and(clauses);
};

const matchesFilters = (
  conversation: ConversationSummary,
  filters: InvestigationFilters,
  inProgressIds: Set<string>
): boolean => {
  if (conversation.template_id !== INVESTIGATION_TEMPLATE_ID) {
    return false;
  }
  const metadata = toMetadata(conversation.metadata);
  if (filters.status && !filters.status.includes(metadata.status)) {
    return false;
  }
  if (
    filters.severity &&
    !filters.severity.includes(metadata.severity ?? INVESTIGATION_SEVERITY_NONE)
  ) {
    return false;
  }
  const createdAt = Date.parse(conversation.created_at);
  if (filters.created_after && !(createdAt >= Date.parse(filters.created_after))) {
    return false;
  }
  if (filters.created_before && !(createdAt <= Date.parse(filters.created_before))) {
    return false;
  }
  if (filters.in_progress !== undefined) {
    if (inProgressIds.has(conversation.id) !== filters.in_progress) {
      return false;
    }
  }
  if (filters.query !== undefined) {
    // A title Agent Builder has not generated yet is its placeholder, which says nothing about
    // the investigation.
    const title = isInvestigationTitlePending(conversation.title) ? undefined : conversation.title;
    const text = [title, metadata.summary, metadata.verdict]
      .filter((part): part is string => part !== undefined)
      .join('\n')
      .toLowerCase();
    const terms = filters.query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.every((term) => text.includes(term))) {
      return false;
    }
  }
  return true;
};

const compareConversations =
  (field: ListInvestigationsQuery['sort_field'], order: ListInvestigationsQuery['sort_order']) =>
  (a: ConversationSummary, b: ConversationSummary): number => {
    const primary =
      field === 'severity'
        ? severityRank(a) - severityRank(b)
        : Date.parse(a[field]) - Date.parse(b[field]);
    const ordered = order === 'asc' ? primary : -primary;
    if (ordered !== 0) {
      return ordered;
    }
    // Stable across pages: most recently updated first, then by id.
    return Date.parse(b.updated_at) - Date.parse(a.updated_at) || a.id.localeCompare(b.id);
  };

const severityRank = (conversation: ConversationSummary): number => {
  const { severity } = toMetadata(conversation.metadata);
  return severity ? SEVERITY_RANK[severity] : 0;
};

const optionalText = (value: MetadataFieldValue | undefined): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

export const toMetadata = (
  metadata: Record<string, MetadataFieldValue> | undefined
): InvestigationMetadata => {
  const severity = metadata?.severity;
  const summary = optionalText(metadata?.summary);
  const verdict = optionalText(metadata?.verdict);
  return {
    status: metadata?.status === 'closed' ? 'closed' : 'open',
    ...(isInvestigationSeverity(severity) && { severity }),
    ...(summary !== undefined && { summary }),
    ...(verdict !== undefined && { verdict }),
  };
};

const toSummary = ({
  conversation,
  inProgress,
  subjects,
  impact,
}: {
  conversation: Pick<
    ConversationSummary,
    'id' | 'title' | 'created_at' | 'updated_at' | 'agent_id' | 'metadata'
  >;
  inProgress: boolean;
  subjects: InvestigationSubject[];
  impact: Impact | undefined;
}): InvestigationSummary => ({
  id: conversation.id,
  title: conversation.title,
  title_pending: isInvestigationTitlePending(conversation.title),
  created_at: conversation.created_at,
  updated_at: conversation.updated_at,
  agent_id: conversation.agent_id,
  metadata: toMetadata(conversation.metadata),
  in_progress: inProgress,
  subjects: [...subjects]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(toSubjectResponse),
  ...(impact && { impact: toImpactResponse(impact) }),
});

const toSubjectResponse = (subject: InvestigationSubject): InvestigationSubjectResponse => ({
  type: subject.subjectType,
  id: subject.subjectId,
  ...(subject.summary !== undefined && { summary: subject.summary }),
  ...(subject.triggerType !== undefined && { trigger_type: subject.triggerType }),
  ...(subject.snapshot !== undefined && { snapshot: subject.snapshot }),
  ...(subject.slack !== undefined && { slack: subject.slack }),
  created_at: subject.createdAt,
  ...(subject.updatedAt !== undefined && { updated_at: subject.updatedAt }),
});

const toImpactResponse = (impact: Impact): InvestigationImpactResponse => ({
  ...(impact.summary !== undefined && { summary: impact.summary }),
  ...(impact.evidence !== undefined && { evidence: impact.evidence }),
  entities: (impact.entities ?? []).map((entity) => ({
    id: entity.id,
    ...(entity.name !== undefined && { name: entity.name }),
    ...(entity.type !== undefined && { type: entity.type }),
    ...(entity.featureId !== undefined && { feature_id: entity.featureId }),
    ...(entity.streamName !== undefined && { stream_name: entity.streamName }),
    ...(entity.evidence !== undefined && { evidence: entity.evidence }),
  })),
  created_at: impact.createdAt,
  ...(impact.updatedAt !== undefined && { updated_at: impact.updatedAt }),
});

const toHypothesesResponse = (
  hypotheses: InvestigationHypotheses
): NonNullable<Investigation['hypotheses']> => ({
  hypotheses: hypotheses.hypotheses,
  created_at: hypotheses.createdAt,
  ...(hypotheses.updatedAt !== undefined && { updated_at: hypotheses.updatedAt }),
});

const toProposalSummary = (proposal: ProposalWithMetadata): InvestigationProposalSummary => ({
  id: proposal.id,
  title: proposal.title,
  comment: proposal.comment,
  status: proposal.status,
  impact: proposal.impact,
  confidence: proposal.confidence,
  ...(proposal.category !== undefined && { category: proposal.category }),
  created_at: proposal.createdAt,
  ...(proposal.decidedAt !== undefined && { decided_at: proposal.decidedAt }),
});

const removedAttachmentIds = (
  attachments: Array<Pick<VersionedAttachment, 'id' | 'active'>> | undefined
): Set<string> =>
  new Set((attachments ?? []).filter(({ active }) => active === false).map(({ id }) => id));

const subjectKey = ({ type, id }: InvestigationSubjectKey): string => `${type}\u0000${id}`;

const groupBy = <T>(items: T[], key: (item: T) => string): Map<string, T[]> => {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const group = groups.get(key(item));
    if (group) {
      group.push(item);
    } else {
      groups.set(key(item), [item]);
    }
  }
  return groups;
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
