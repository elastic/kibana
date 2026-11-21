/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import Boom from '@hapi/boom';
import type {
  AggregationsAggregate,
  QueryDslQueryContainer,
  SearchHit,
  Sort,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { CaseStatuses } from '@kbn/cases-components';
import type { CasesClient } from '../client';
import {
  INVESTIGATION_ACTIVITY_INDEX,
  INVESTIGATION_CONFIG_INDEX,
  INVESTIGATION_ITEMS_INDEX,
  INVESTIGATION_LIMITS,
  INVESTIGATION_RECORDS_INDEX,
  INVESTIGATIONS_OWNER,
  ITEM_REF_PREFIX,
} from '../../common/investigations/constants';
import type {
  ActivityEntry,
  Actor,
  BulkCreateItemsRequest,
  BulkCreateItemsResponse,
  BulkUpdateItemsRequest,
  BulkUpdateItemsResponse,
  CapabilitiesResponse,
  ChangeHistoryResponse,
  ClaimItem,
  CloseRecordRequest,
  CreateActivityRequest,
  CreateRecordRequest,
  CreateThreadRequest,
  DuplicateCheckRequest,
  EvidenceItem,
  ExportItemsRequest,
  FindActivityRequest,
  FindActivityResponse,
  FindItemsRequest,
  FindItemsResponse,
  FindRecordsRequest,
  FindRecordsResponse,
  GetRecordResponse,
  ImportIndicatorsResponse,
  IndicatorLookupResponse,
  InvestigationItem,
  InvestigationRecord,
  InvestigationType,
  ItemFacets,
  ItemInput,
  ItemKind,
  ItemPatch,
  MergeRecordResponse,
  ProcedureTemplate,
  ProcedureTemplateTask,
  ProposalItem,
  RecordCounters,
  RelatedRecord,
  RelatedRecordsResponse,
  ReportResponse,
  SinceLastHandoffResponse,
  TaskItem,
  ThreadRef,
  UpdateItemRequest,
  UpdateRecordRequest,
  Verdict,
} from '../../common/investigations/types';
import { VERDICT_LABELS, INDICATOR_TYPE_LABELS, EVIDENCE_TYPE_LABELS } from '../../common/investigations/types';
import { DEFAULT_INVESTIGATION_TYPES, DEFAULT_PROCEDURE_TEMPLATES } from './default_templates';
import {
  PRIORITY_RANK,
  SEVERITY_RANK,
  clip,
  decodeCursor,
  decodeVersion,
  encodeCursor,
  encodeVersion,
  hashSnapshot,
  parseCsv,
  parseIndicatorType,
  plural,
  sha256,
  toCsvCell,
} from './utils';
import { buildReport } from './report';

type StoredRecord = Omit<InvestigationRecord, 'version'> & {
  ref_counters?: Record<string, number>;
  verdict_effective?: Verdict | null;
  priority_rank?: number;
  severity_rank?: number;
};
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type StoredItem = DistributiveOmit<InvestigationItem, 'version'> & { ref_num: number };

export interface AlertsClientLike {
  bulkUpdateCases(args: { alerts: Array<{ id: string; index: string }>; caseIds: string[] }): Promise<unknown>;
  bulkUpdate(args: { ids: string[]; status: 'open' | 'closed' | 'acknowledged'; index: string }): Promise<unknown>;
}

export interface InvestigationsServiceDeps {
  /** Internal-user client for the investigation indices. */
  esClient: ElasticsearchClient;
  /** Current-user client for reading source data (alerts). */
  scopedEsClient: ElasticsearchClient;
  casesClient: CasesClient;
  logger: Logger;
  spaceId: string;
  user: { username: string; fullName: string; profileUid?: string | null };
  allowBackdate: boolean;
  /** Default actor for writes; agent tools pass an agent actor. */
  actor?: Actor;
  getAlertsClient: () => Promise<AlertsClientLike | undefined>;
  agent: {
    isAvailable: () => Promise<{ available: boolean; reason?: string }>;
    createConversation?: (args: { title: string; recordId: string }) => Promise<string>;
    agentId: string;
    agentName: string;
  };
}

const now = (): string => new Date().toISOString();
const HISTORY_ACTIONS = [
  'record.created',
  'record.description_changed',
  'record.summary_changed',
  'record.closed',
  'claim.conclusion_changed',
  'item.text_changed',
];

const emptyCounters = (): RecordCounters => ({
  evidence: 0,
  evidence_by_type: {},
  alerts: 0,
  indicators: 0,
  claims: 0,
  claims_by_status: {},
  claims_needs_review: 0,
  entities: 0,
  entities_by_type: {},
  entities_in_scope: 0,
  entities_suspected: 0,
  links: 0,
  tasks: 0,
  tasks_done: 0,
  tasks_skipped: 0,
  required_tasks_left: 0,
  proposals: 0,
  proposals_pending: 0,
  proposals_pending_disruptive: 0,
  comments: 0,
  timeline_events: 0,
  activity: 0,
});

interface Bucket {
  key: string;
  doc_count: number;
}
const buckets = (agg: AggregationsAggregate | undefined): Bucket[] =>
  ((agg as { buckets?: Bucket[] } | undefined)?.buckets ?? []) as Bucket[];
const filterCount = (agg: AggregationsAggregate | undefined): number =>
  (agg as { doc_count?: number } | undefined)?.doc_count ?? 0;
const toMap = (list: Bucket[]): Record<string, number> =>
  Object.fromEntries(list.map((b) => [b.key, b.doc_count]));

const term = (field: string, value: string | number | boolean): QueryDslQueryContainer => ({
  term: { [field]: value },
});
const terms = (field: string, values: Array<string | number | boolean>): QueryDslQueryContainer => ({
  terms: { [field]: values },
});

const RECORD_SORT_FIELDS: Record<string, string> = {
  display_id: 'display_num',
  display_num: 'display_num',
  title: 'title.keyword',
  priority: 'priority_rank',
  severity: 'severity_rank',
  status: 'status',
  investigation_type: 'investigation_type',
  created_at: 'created_at',
  updated_at: 'updated_at',
  closed_at: 'closed_at',
  owner: 'owner.name',
  verdict: 'verdict_effective',
};

const ITEM_SORT_FIELDS: Record<string, string> = {
  created_at: 'created_at',
  updated_at: 'updated_at',
  title: 'title.keyword',
  ref_num: 'ref_num',
  kind: 'kind',
  'evidence.type': 'evidence.type',
  status: 'status',
};

const pluralNoun = (noun: string): string =>
  /[^aeiou]y$/.test(noun) ? `${noun.slice(0, -1)}ies` : /(s|sh|ch|x)$/.test(noun) ? `${noun}es` : `${noun}s`;

const isLayoutOnly = (patch: ItemPatch): boolean => {
  const keys = Object.keys(patch).filter((k) => patch[k as keyof ItemPatch] !== undefined);
  return (
    keys.length === 1 &&
    keys[0] === 'entity' &&
    Object.keys(patch.entity ?? {}).every((k) => k === 'position')
  );
};

const describeItem = (item: { kind: ItemKind; ref: string; title: string }): string =>
  `${item.ref}: ${clip(item.title, 120)}`;

/**
 * Owns every read and write of investigation records, items and activity. Every public method
 * authorizes against the case first, then applies `restricted_to`, then touches the indices.
 */
export class InvestigationsService {
  constructor(private readonly deps: InvestigationsServiceDeps) {}

  /* ---------------------------------------------------------------- */
  /* Actors, time and authorization                                    */
  /* ---------------------------------------------------------------- */

  private get es() {
    return this.deps.esClient;
  }

  public currentUserActor(): Actor {
    return { type: 'user', id: this.deps.user.username, name: this.deps.user.fullName };
  }

  private actor(override?: Actor | null): Actor {
    if (override && this.deps.allowBackdate) {
      return override;
    }
    return this.deps.actor ?? this.currentUserActor();
  }

  private ts(override?: string | null): string {
    if (override && this.deps.allowBackdate) {
      const parsed = Date.parse(override);
      if (Number.isNaN(parsed)) {
        throw Boom.badRequest(`Invalid timestamp "${override}"`);
      }
      return new Date(parsed).toISOString();
    }
    return now();
  }

  private canRead(record: StoredRecord): boolean {
    return (
      !record.restricted_to?.length || record.restricted_to.includes(this.deps.user.username)
    );
  }

  private restrictionFilter(): QueryDslQueryContainer {
    return {
      bool: {
        should: [
          { bool: { must_not: { exists: { field: 'restricted_to' } } } },
          term('restricted_to', this.deps.user.username),
        ],
        minimum_should_match: 1,
      },
    };
  }

  private static ownerAuthCache = new Map<string, number>();

  /** Cases authorization is per owner and space; verify the caller can read Security cases. */
  private async ensureCanReadOwner(): Promise<void> {
    const key = `${this.deps.spaceId}:${this.deps.user.username}`;
    const cachedAt = InvestigationsService.ownerAuthCache.get(key);
    if (cachedAt && Date.now() - cachedAt < 30_000) {
      return;
    }
    await this.deps.casesClient.cases.find({
      owner: [INVESTIGATIONS_OWNER],
      perPage: 1,
      page: 1,
    });
    InvestigationsService.ownerAuthCache.set(key, Date.now());
  }

  /** Authorizes against the case and loads the record document. */
  private async load(recordId: string): Promise<{
    record: StoredRecord;
    seqNo: number;
    primaryTerm: number;
    theCase: Awaited<ReturnType<CasesClient['cases']['get']>>;
  }> {
    const theCase = await this.deps.casesClient.cases.get({ id: recordId, includeComments: false });
    const doc = await this.es.get<StoredRecord>(
      { index: INVESTIGATION_RECORDS_INDEX, id: recordId },
      { ignore: [404] }
    );
    if (!doc.found || !doc._source) {
      throw Boom.notFound(`Investigation ${recordId} not found`);
    }
    const record = doc._source;
    if (record.space_id !== this.deps.spaceId || !this.canRead(record)) {
      throw Boom.notFound(`Investigation ${recordId} not found`);
    }
    return {
      record,
      seqNo: doc._seq_no ?? 0,
      primaryTerm: doc._primary_term ?? 0,
      theCase,
    };
  }

  private toRecord(source: StoredRecord, seqNo?: number, primaryTerm?: number): InvestigationRecord {
    const { ref_counters: _refCounters, verdict_effective: _v, priority_rank: _p, severity_rank: _s, ...rest } =
      source;
    return {
      ...rest,
      counters: { ...emptyCounters(), ...(rest.counters ?? {}) },
      participants: rest.participants ?? [],
      threads: rest.threads ?? [],
      conversation_ids: rest.conversation_ids ?? [],
      merged_from: rest.merged_from ?? [],
      restricted_to: rest.restricted_to ?? [],
      tags: rest.tags ?? [],
      fields: rest.fields ?? {},
      version: encodeVersion(seqNo, primaryTerm),
    };
  }

  private toItem(hit: SearchHit<StoredItem>): InvestigationItem {
    const { ref_num: _refNum, ...rest } = hit._source as StoredItem;
    return { ...rest, version: encodeVersion(hit._seq_no, hit._primary_term) } as InvestigationItem;
  }

  /* ---------------------------------------------------------------- */
  /* Activity                                                          */
  /* ---------------------------------------------------------------- */

  private async appendActivity(
    recordId: string,
    entries: Array<Omit<ActivityEntry, 'id' | 'record_id' | 'space_id' | 'links'> & { links?: ActivityEntry['links'] }>
  ): Promise<ActivityEntry[]> {
    if (!entries.length) return [];
    const docs: ActivityEntry[] = entries.map((entry) => ({
      ...entry,
      id: uuidv4(),
      record_id: recordId,
      space_id: this.deps.spaceId,
      links: entry.links ?? [],
    }));
    await this.es.bulk({
      refresh: true,
      operations: docs.flatMap((doc) => [
        { create: { _index: INVESTIGATION_ACTIVITY_INDEX, _id: doc.id } },
        doc,
      ]),
    });
    return docs;
  }

  public async findActivity(recordId: string, req: FindActivityRequest): Promise<FindActivityResponse> {
    const { record } = await this.load(recordId);
    const recordIds = [recordId, ...(record.merged_from ?? [])];
    const perPage = Math.min(req.per_page ?? INVESTIGATION_LIMITS.defaultPerPage, INVESTIGATION_LIMITS.maxPerPage);
    const page = Math.max(req.page ?? 1, 1);
    const filter: QueryDslQueryContainer[] = [terms('record_id', recordIds)];
    if (req.since) filter.push({ range: { ts: { gt: req.since } } });
    if (req.actor_type?.length) filter.push(terms('actor.type', req.actor_type));
    if (req.target_id) filter.push(term('target.id', req.target_id));
    if (req.action?.length) filter.push(terms('action', req.action));
    const must: QueryDslQueryContainer[] = req.search
      ? [
          {
            multi_match: {
              query: req.search,
              fields: ['message^2', 'details', 'actor.name', 'target.title'],
              operator: 'and',
            },
          },
        ]
      : [];
    const res = await this.es.search<ActivityEntry>({
      index: INVESTIGATION_ACTIVITY_INDEX,
      from: (page - 1) * perPage,
      size: perPage,
      track_total_hits: true,
      query: { bool: { filter, must } },
      sort: [{ ts: { order: req.sort_order ?? 'desc' } }, { id: { order: 'asc' } }],
      aggs: { latest: { max: { field: 'ts' } } },
    });
    const latest = (res.aggregations?.latest as { value_as_string?: string } | undefined)?.value_as_string;
    return {
      entries: res.hits.hits.map((h) => h._source as ActivityEntry),
      total: typeof res.hits.total === 'number' ? res.hits.total : res.hits.total?.value ?? 0,
      page,
      per_page: perPage,
      latest_ts: latest ?? req.since ?? null,
    };
  }

  public async createActivity(recordId: string, req: CreateActivityRequest): Promise<ActivityEntry> {
    await this.load(recordId);
    const actor = this.actor(req.actor);
    const [entry] = await this.appendActivity(recordId, [
      {
        ts: this.ts(req.ts),
        actor,
        action: req.action ?? 'note',
        target: req.target ?? null,
        message: req.message,
        details: req.details ?? null,
        links: req.links ?? [],
        ...(this.deps.allowBackdate && req.before !== undefined ? { before: req.before } : {}),
        ...(this.deps.allowBackdate && req.after !== undefined ? { after: req.after } : {}),
      },
    ]);
    await this.refreshCounters(recordId, actor, { touch: !req.ts });
    return entry;
  }

  /* ---------------------------------------------------------------- */
  /* Counters                                                          */
  /* ---------------------------------------------------------------- */

  public async computeCounters(recordId: string, mergedFrom: string[] = []): Promise<RecordCounters> {
    const [items, activity] = await Promise.all([
      this.es.search({
        index: INVESTIGATION_ITEMS_INDEX,
        size: 0,
        query: term('record_id', recordId),
        aggs: {
          kind: { terms: { field: 'kind', size: 20 } },
          evidence: {
            filter: term('kind', 'evidence'),
            aggs: { type: { terms: { field: 'evidence.type', size: 20 } } },
          },
          claims: {
            filter: term('kind', 'claim'),
            aggs: {
              status: { terms: { field: 'status', size: 10 } },
              review: { filter: term('claim.needs_review', true) },
            },
          },
          entities: {
            filter: term('kind', 'entity'),
            aggs: {
              type: { terms: { field: 'entity.type', size: 10 } },
              in_scope: { filter: terms('status', ['primary', 'scoped']) },
              suspected: { filter: term('status', 'suspected') },
            },
          },
          tasks: {
            filter: term('kind', 'task'),
            aggs: {
              status: { terms: { field: 'status', size: 10 } },
              required_left: {
                filter: {
                  bool: {
                    filter: [term('task.required', true)],
                    must_not: [terms('status', ['done', 'skipped'])],
                  },
                },
              },
            },
          },
          proposals: {
            filter: term('kind', 'proposal'),
            aggs: {
              pending: {
                filter: term('status', 'pending'),
                aggs: { disruptive: { filter: term('proposal.disruption', 'high') } },
              },
            },
          },
        },
      }),
      this.es.count({
        index: INVESTIGATION_ACTIVITY_INDEX,
        query: terms('record_id', [recordId, ...mergedFrom]),
      }),
    ]);
    const aggs = items.aggregations ?? {};
    const kinds = toMap(buckets(aggs.kind));
    const evidenceAgg = aggs.evidence as Record<string, AggregationsAggregate> | undefined;
    const evidenceByType = toMap(buckets(evidenceAgg?.type));
    const claimsAgg = aggs.claims as Record<string, AggregationsAggregate> | undefined;
    const entitiesAgg = aggs.entities as Record<string, AggregationsAggregate> | undefined;
    const tasksAgg = aggs.tasks as Record<string, AggregationsAggregate> | undefined;
    const taskStatus = toMap(buckets(tasksAgg?.status));
    const proposalsAgg = aggs.proposals as Record<string, AggregationsAggregate> | undefined;
    const pendingAgg = proposalsAgg?.pending as Record<string, AggregationsAggregate> | undefined;
    return {
      evidence: kinds.evidence ?? 0,
      evidence_by_type: evidenceByType,
      alerts: evidenceByType.alert ?? 0,
      indicators: evidenceByType.indicator ?? 0,
      claims: kinds.claim ?? 0,
      claims_by_status: toMap(buckets(claimsAgg?.status)),
      claims_needs_review: filterCount(claimsAgg?.review),
      entities: kinds.entity ?? 0,
      entities_by_type: toMap(buckets(entitiesAgg?.type)),
      entities_in_scope: filterCount(entitiesAgg?.in_scope),
      entities_suspected: filterCount(entitiesAgg?.suspected),
      links: kinds.link ?? 0,
      tasks: kinds.task ?? 0,
      tasks_done: taskStatus.done ?? 0,
      tasks_skipped: taskStatus.skipped ?? 0,
      required_tasks_left: filterCount(tasksAgg?.required_left),
      proposals: kinds.proposal ?? 0,
      proposals_pending: filterCount(proposalsAgg?.pending),
      proposals_pending_disruptive: filterCount(pendingAgg?.disruptive),
      comments: kinds.comment ?? 0,
      timeline_events: kinds.timeline_event ?? 0,
      activity: activity.count,
    };
  }

  /** Recomputes counters and records the actor as a participant, in one update. */
  private async refreshCounters(
    recordId: string,
    actor: Actor | null,
    { touch = true, ts }: { touch?: boolean; ts?: string } = {}
  ): Promise<void> {
    const current = await this.es.get<StoredRecord>(
      { index: INVESTIGATION_RECORDS_INDEX, id: recordId, _source_includes: ['merged_from'] },
      { ignore: [404] }
    );
    if (!current.found) return;
    const counters = await this.computeCounters(recordId, current._source?.merged_from ?? []);
    const participant = actor && actor.type !== 'automation' ? actor : null;
    await this.es.update({
      index: INVESTIGATION_RECORDS_INDEX,
      id: recordId,
      retry_on_conflict: 5,
      refresh: true,
      script: {
        lang: 'painless',
        source: `
          ctx._source.counters = params.counters;
          if (params.touch) { ctx._source.updated_at = params.now; ctx._source.updated_by = params.actor; }
          if (params.participant != null) {
            if (ctx._source.participants == null) { ctx._source.participants = []; }
            boolean found = false;
            for (def p : ctx._source.participants) { if (p.id == params.participant.id) { found = true; } }
            if (!found && ctx._source.participants.size() < 50) { ctx._source.participants.add(params.participant); }
          }`,
        params: {
          counters,
          touch,
          now: ts ?? now(),
          actor: actor ?? this.currentUserActor(),
          participant,
        },
      },
    });
  }

  /** Atomically reserves `count` refs per kind; returns the first number of each range. */
  private async reserveRefs(recordId: string, counts: Partial<Record<ItemKind, number>>): Promise<Record<string, number>> {
    const inc = Object.fromEntries(Object.entries(counts).filter(([, n]) => (n ?? 0) > 0));
    if (!Object.keys(inc).length) return {};
    const res = await this.es.update<StoredRecord, unknown, StoredRecord>({
      index: INVESTIGATION_RECORDS_INDEX,
      id: recordId,
      retry_on_conflict: 10,
      _source: ['ref_counters'],
      script: {
        lang: 'painless',
        source: `
          if (ctx._source.ref_counters == null) { ctx._source.ref_counters = [:]; }
          for (def k : params.inc.keySet()) {
            def cur = ctx._source.ref_counters.containsKey(k) ? ctx._source.ref_counters[k] : 0;
            ctx._source.ref_counters[k] = cur + params.inc[k];
          }`,
        params: { inc },
      },
    });
    const after = res.get?._source?.ref_counters ?? {};
    return Object.fromEntries(
      Object.entries(inc).map(([kind, n]) => [kind, (after[kind] ?? n) - (n as number) + 1])
    );
  }

  /* ---------------------------------------------------------------- */
  /* Records                                                           */
  /* ---------------------------------------------------------------- */

  public async capabilities(): Promise<CapabilitiesResponse> {
    const { available, reason } = await this.deps.agent.isAvailable();
    return {
      agent_builder_available: available,
      agent_id: available ? this.deps.agent.agentId : null,
      connector_configured: available,
      reason: reason ?? null,
    };
  }

  private async nextDisplayNum(): Promise<number> {
    const res = await this.es.search({
      index: INVESTIGATION_RECORDS_INDEX,
      size: 0,
      query: term('space_id', this.deps.spaceId),
      aggs: { max: { max: { field: 'display_num' } } },
    });
    const max = (res.aggregations?.max as { value?: number | null } | undefined)?.value ?? 0;
    return Math.max(Math.floor(max ?? 0), 0) + 1;
  }

  public async createRecord(req: CreateRecordRequest): Promise<InvestigationRecord> {
    const actor = this.actor(req.actor);
    const createdAt = this.ts(req.created_at);
    let displayNum: number;
    let displayId: string;
    if (req.display_id) {
      displayId = req.display_id;
      displayNum = Number(req.display_id.replace(/\D/g, '')) || (await this.nextDisplayNum());
    } else {
      displayNum = await this.nextDisplayNum();
      displayId = `INV-${displayNum}`;
    }
    const severity = req.severity ?? req.priority ?? 'medium';
    const priority = req.priority ?? severity;
    const theCase = await this.deps.casesClient.cases.create({
      title: req.title,
      description: req.description,
      tags: Array.from(new Set(['investigation', ...(req.tags ?? [])])),
      owner: INVESTIGATIONS_OWNER,
      severity,
      category: req.investigation_type.slice(0, 50),
      connector: { id: 'none', name: 'none', type: '.none' as const, fields: null },
      settings: { syncAlerts: true },
    } as Parameters<CasesClient['cases']['create']>[0]);

    const aiEnabled = req.ai_enabled ?? true;
    const record: StoredRecord = {
      id: theCase.id,
      case_id: theCase.id,
      space_id: this.deps.spaceId,
      display_id: displayId,
      display_num: displayNum,
      title: req.title,
      description: req.description,
      status: 'open',
      severity,
      severity_rank: SEVERITY_RANK[severity],
      priority,
      priority_rank: PRIORITY_RANK[priority],
      priority_note: null,
      tags: req.tags ?? [],
      assignees: [],
      owner: null,
      participants: actor.type === 'automation' ? [] : [actor],
      created_at: createdAt,
      created_by: actor,
      updated_at: createdAt,
      updated_by: actor,
      closed_at: null,
      investigation_type: req.investigation_type,
      template_id: null,
      stage: 'Triage',
      summary: req.summary ?? null,
      fields: req.fields ?? {},
      agent_verdict: null,
      analyst_verdict: null,
      verdict_effective: null,
      close_outcome: null,
      origin: req.origin ?? { type: actor.type === 'agent' ? 'agent' : 'user', label: `Started by ${actor.name}`, actor },
      conversation_id: null,
      conversation_ids: [],
      threads: [],
      ai_enabled: aiEnabled,
      agent_id: aiEnabled ? this.deps.agent.agentId : null,
      agent_name: aiEnabled ? this.deps.agent.agentName : null,
      restricted_to: req.restricted_to?.length
        ? Array.from(new Set([...req.restricted_to, this.deps.user.username]))
        : [],
      counters: emptyCounters(),
      last_handoff: null,
      merged_into: null,
      merged_from: [],
      ref_counters: {},
    };
    try {
      await this.es.index({
        index: INVESTIGATION_RECORDS_INDEX,
        id: record.id,
        op_type: 'create',
        refresh: true,
        document: record,
      });
    } catch (error) {
      await this.deps.casesClient.cases.delete([theCase.id]).catch(() => undefined);
      throw error;
    }

    if (req.create_conversation ?? aiEnabled) {
      await this.attachMainConversation(record.id, `${displayId}: ${req.title}`);
    }

    await this.appendActivity(record.id, [
      {
        ts: createdAt,
        actor,
        action: 'record.created',
        target: { kind: 'record', id: record.id, title: req.title },
        message: /\b(from .+)$/.test(record.origin.label)
          ? `Started the investigation ${(/\b(from .+)$/.exec(record.origin.label) as RegExpExecArray)[1]}`
          : 'Started the investigation',
        details: null,
        after: { description: req.description, summary: req.summary ?? null },
      },
    ]);

    if (req.apply_procedure ?? true) {
      await this.applyProcedureInternal(record, req.investigation_type, false, actor, createdAt);
    }
    if (req.alerts?.length) {
      await this.bulkCreateItemsInternal(
        record,
        req.alerts.map((alert) => ({
          kind: 'evidence' as const,
          title: alert.rule_name ?? `Alert ${alert.id}`,
          evidence: {
            type: 'alert' as const,
            source: { label: 'Alerts index', kind: 'alert' as const, index: alert.index, id: alert.id },
            alert: { id: alert.id, index: alert.index, rule_id: alert.rule_id ?? null, rule_name: alert.rule_name ?? null },
          },
        })),
        actor,
        { extractIndicators: true, linkAlerts: true }
      );
    }
    await this.refreshCounters(record.id, actor, { touch: false });
    return (await this.getRecord(record.id)).record;
  }

  private async attachMainConversation(recordId: string, title: string): Promise<void> {
    const create = this.deps.agent.createConversation;
    if (!create) return;
    try {
      const { available } = await this.deps.agent.isAvailable();
      if (!available) return;
      const conversationId = await create({ title, recordId });
      await this.es.update({
        index: INVESTIGATION_RECORDS_INDEX,
        id: recordId,
        refresh: true,
        retry_on_conflict: 5,
        doc: { conversation_id: conversationId, conversation_ids: [conversationId] },
      });
    } catch (error) {
      this.deps.logger.warn(`Investigation ${recordId}: could not create its conversation: ${error}`);
    }
  }

  public async findRecords(req: FindRecordsRequest): Promise<FindRecordsResponse> {
    await this.ensureCanReadOwner();
    const perPage = Math.min(req.per_page ?? INVESTIGATION_LIMITS.defaultPerPage, INVESTIGATION_LIMITS.maxPerPage);
    const page = Math.max(req.page ?? 1, 1);
    if ((page - 1) * perPage + perPage > INVESTIGATION_LIMITS.maxDeepPageFrom) {
      throw Boom.badRequest('Page is too deep; narrow the search or filters.');
    }
    const filter: QueryDslQueryContainer[] = [term('space_id', this.deps.spaceId), this.restrictionFilter()];
    const mustNot: QueryDslQueryContainer[] = [];
    if (req.status?.length) filter.push(terms('status', req.status));
    if (req.priority?.length) filter.push(terms('priority', req.priority));
    if (req.severity?.length) filter.push(terms('severity', req.severity));
    if (req.investigation_type?.length) filter.push(terms('investigation_type', req.investigation_type));
    if (req.verdict?.length) filter.push(terms('verdict_effective', req.verdict));
    if (req.tags?.length) filter.push(terms('tags', req.tags));
    if (req.owner) {
      if (req.owner === 'unassigned') mustNot.push({ exists: { field: 'owner.id' } });
      else filter.push(term('owner.id', req.owner));
    }
    for (const f of req.field ?? []) {
      const idx = f.indexOf(':');
      if (idx <= 0) throw Boom.badRequest(`Invalid field filter "${f}"; expected key:value`);
      const key = f.slice(0, idx);
      if (!/^[a-z0-9_]+$/i.test(key)) throw Boom.badRequest(`Invalid field key "${key}"`);
      filter.push(term(`fields.${key}`, f.slice(idx + 1)));
    }
    const must: QueryDslQueryContainer[] = [];
    if (req.search?.trim()) {
      const q = req.search.trim();
      must.push({
        bool: {
          should: [
            { multi_match: { query: q, fields: ['title^3', 'description', 'summary', 'investigation_type'] } },
            term('display_id', q),
            { prefix: { 'title.keyword': q.toLowerCase() } },
          ],
          minimum_should_match: 1,
        },
      });
    }
    const sort = this.recordSort(req.sort_field, req.sort_order);
    const started = Date.now();
    const res = await this.es.search<StoredRecord>({
      index: INVESTIGATION_RECORDS_INDEX,
      from: (page - 1) * perPage,
      size: perPage,
      track_total_hits: true,
      seq_no_primary_term: true,
      _source: { excludes: ['ref_counters'] },
      query: { bool: { filter, must, must_not: mustNot } },
      sort,
    });
    return {
      records: res.hits.hits.map((h) => this.toRecord(h._source as StoredRecord, h._seq_no, h._primary_term)),
      total: typeof res.hits.total === 'number' ? res.hits.total : res.hits.total?.value ?? 0,
      page,
      per_page: perPage,
      took_ms: Date.now() - started,
    };
  }

  private recordSort(field?: string, order: 'asc' | 'desc' = 'desc'): Sort {
    if (!field) return [{ updated_at: { order: 'desc' } }, { display_num: { order: 'desc' } }];
    let target = RECORD_SORT_FIELDS[field];
    let unmapped: 'keyword' | 'long' | 'date' | 'double' | 'boolean' = 'keyword';
    if (!target && /^fields\.[a-z0-9_]+$/i.test(field)) {
      target = field;
      if (field.endsWith('_long')) unmapped = 'long';
      else if (field.endsWith('_double')) unmapped = 'double';
      else if (field.endsWith('_date')) unmapped = 'date';
      else if (field.endsWith('_bool')) unmapped = 'boolean';
      else if (field.endsWith('_text')) target = `${field}.keyword`;
    } else if (!target && /^counters\.[a-z_]+$/.test(field)) {
      target = field;
      unmapped = 'long';
    }
    if (!target) throw Boom.badRequest(`Cannot sort on "${field}"`);
    return [
      { [target]: { order, unmapped_type: unmapped, missing: order === 'asc' ? '_last' : '_last' } },
      { display_num: { order: 'desc' } },
    ];
  }

  public async getRecord(recordId: string): Promise<GetRecordResponse> {
    const { record, seqNo, primaryTerm, theCase } = await this.load(recordId);
    const synced = await this.syncFromCase(record, theCase, seqNo, primaryTerm);
    const { available } = await this.deps.agent.isAvailable().catch(() => ({ available: false }));
    return {
      record: synced,
      case: {
        id: theCase.id,
        version: theCase.version,
        status: theCase.status as GetRecordResponse['case']['status'],
        title: theCase.title,
        description: theCase.description,
        severity: theCase.severity as GetRecordResponse['case']['severity'],
        tags: theCase.tags,
        assignees: theCase.assignees,
        created_at: theCase.created_at,
        updated_at: theCase.updated_at,
        created_by: { username: theCase.created_by?.username, full_name: theCase.created_by?.full_name },
      },
      agent_available: available && synced.ai_enabled,
    };
  }

  /** Refreshes the record copy when the case was changed outside the investigation API. */
  private async syncFromCase(
    record: StoredRecord,
    theCase: Awaited<ReturnType<CasesClient['cases']['get']>>,
    seqNo: number,
    primaryTerm: number
  ): Promise<InvestigationRecord> {
    const tags = (theCase.tags ?? []).filter((tag) => tag !== 'investigation');
    const patch: Partial<StoredRecord> = {};
    if (theCase.title !== record.title) patch.title = theCase.title;
    if (theCase.description !== record.description) patch.description = theCase.description;
    if (theCase.status !== record.status) patch.status = theCase.status as StoredRecord['status'];
    if (theCase.severity !== record.severity) {
      patch.severity = theCase.severity as StoredRecord['severity'];
      patch.severity_rank = SEVERITY_RANK[patch.severity];
    }
    if (JSON.stringify(tags) !== JSON.stringify(record.tags ?? [])) patch.tags = tags;
    if (!Object.keys(patch).length) return this.toRecord(record, seqNo, primaryTerm);
    const res = await this.es.update<StoredRecord>({
      index: INVESTIGATION_RECORDS_INDEX,
      id: record.id,
      refresh: true,
      retry_on_conflict: 3,
      doc: patch,
    });
    return this.toRecord({ ...record, ...patch }, res._seq_no, res._primary_term);
  }

  public async updateRecord(recordId: string, req: UpdateRecordRequest): Promise<InvestigationRecord> {
    const { record, theCase, seqNo, primaryTerm } = await this.load(recordId);
    if (req.version && req.version !== encodeVersion(seqNo, primaryTerm)) {
      throw Boom.conflict('The investigation was changed by someone else. Reload and try again.');
    }
    const actor = this.actor(req.actor);
    const ts = this.ts(req.ts);
    const patch: Partial<StoredRecord> = {};
    const casePatch: Record<string, unknown> = {};
    const entries: Array<Omit<ActivityEntry, 'id' | 'record_id' | 'space_id'>> = [];
    const log = (
      action: string,
      message: string,
      extra: Partial<Omit<ActivityEntry, 'id' | 'record_id' | 'space_id'>> = {}
    ) =>
      entries.push({
        ts,
        actor,
        action,
        message,
        target: { kind: 'record', id: recordId, title: record.title },
        links: [],
        ...extra,
      });

    if (req.title !== undefined && req.title !== record.title) {
      patch.title = req.title;
      casePatch.title = req.title;
      log('record.title_changed', `Renamed the investigation to "${clip(req.title, 120)}"`, {
        before: record.title,
        after: req.title,
      });
    }
    if (req.description !== undefined && req.description !== record.description) {
      patch.description = req.description;
      casePatch.description = req.description;
      log('record.description_changed', 'Edited the description', {
        before: record.description,
        after: req.description,
      });
    }
    if (req.summary !== undefined && req.summary !== record.summary) {
      patch.summary = req.summary;
      log('record.summary_changed', 'Edited the summary', { before: record.summary, after: req.summary });
    }
    if (req.priority !== undefined && req.priority !== record.priority) {
      patch.priority = req.priority;
      patch.priority_rank = PRIORITY_RANK[req.priority];
      const verb = PRIORITY_RANK[req.priority] > PRIORITY_RANK[record.priority] ? 'Raised' : 'Lowered';
      log('record.priority_changed', `${verb} the priority from ${record.priority} to ${req.priority}`, {
        details: req.priority_note ?? null,
        before: record.priority,
        after: req.priority,
      });
    }
    if (req.priority_note !== undefined) patch.priority_note = req.priority_note;
    if (req.severity !== undefined && req.severity !== record.severity) {
      patch.severity = req.severity;
      patch.severity_rank = SEVERITY_RANK[req.severity];
      casePatch.severity = req.severity;
      log('record.severity_changed', `Changed the severity from ${record.severity} to ${req.severity}`);
    }
    if (req.tags !== undefined) {
      patch.tags = req.tags;
      casePatch.tags = Array.from(new Set(['investigation', ...req.tags]));
      log('record.tags_changed', 'Changed the tags', { before: record.tags, after: req.tags });
    }
    if (req.fields !== undefined) {
      const changed = Object.entries(req.fields).filter(([k, v]) => (record.fields ?? {})[k] !== v);
      if (changed.length) {
        patch.fields = { ...(record.fields ?? {}), ...req.fields };
        const label = (key: string) => key.replace(/_(keyword|text|long|double|date|bool)$/, '').replace(/_/g, ' ');
        log(
          'record.fields_changed',
          changed.length === 1
            ? `Set ${label(changed[0][0])} to ${changed[0][1] === null || changed[0][1] === '' ? 'empty' : String(changed[0][1])}`
            : `Changed ${changed.length} fields`,
          {
            before: Object.fromEntries(changed.map(([k]) => [k, (record.fields ?? {})[k] ?? null])),
            after: Object.fromEntries(changed),
          }
        );
      }
    }
    if (req.investigation_type !== undefined && req.investigation_type !== record.investigation_type) {
      patch.investigation_type = req.investigation_type;
      log('record.type_changed', `Changed the investigation type to ${req.investigation_type}`, {
        before: record.investigation_type,
        after: req.investigation_type,
      });
    }
    if (req.stage !== undefined) patch.stage = req.stage;
    if (req.owner !== undefined) {
      const nextOwner: Actor | null =
        req.owner && 'self' in req.owner ? this.currentUserActor() : (req.owner as Actor | null);
      const previous = record.owner ?? null;
      if ((nextOwner?.id ?? null) !== (previous?.id ?? null)) {
        patch.owner = nextOwner;
        if (nextOwner && record.status === 'open') {
          patch.status = 'in-progress';
          casePatch.status = CaseStatuses['in-progress'];
        }
        if (!nextOwner && record.status === 'in-progress') {
          patch.status = 'open';
          casePatch.status = CaseStatuses.open;
        }
        if (nextOwner?.id === this.deps.user.username && this.deps.user.profileUid) {
          casePatch.assignees = [{ uid: this.deps.user.profileUid }];
          patch.assignees = [this.deps.user.profileUid];
        }
        const message = !nextOwner
          ? 'Left the investigation without an owner'
          : nextOwner.id === actor.id
          ? 'Took ownership of the investigation'
          : req.handoff_note || previous
          ? `Handed the investigation to ${nextOwner.name}`
          : `Assigned the investigation to ${nextOwner.name}`;
        log('record.owner_changed', message, {
          details: req.handoff_note ?? null,
          before: previous,
          after: nextOwner,
          links: req.handoff_note ? [{ kind: 'tab', id: 'overview', label: 'Handoff summary' }] : [],
        });
        if (req.handoff_note || (previous && nextOwner && nextOwner.id !== actor.id)) {
          patch.last_handoff = { at: ts, by: actor, to: nextOwner, note: req.handoff_note ?? null };
        }
      }
    }
    if (req.agent_verdict !== undefined) {
      patch.agent_verdict = req.agent_verdict ? { ...req.agent_verdict, set_by: actor, set_at: ts } : null;
      log(
        'record.agent_verdict_changed',
        req.agent_verdict
          ? `Concluded ${req.agent_verdict.label.toLowerCase()} at ${req.agent_verdict.confidence}%`
          : 'Cleared the agent verdict',
        {
          before: record.agent_verdict ? { label: record.agent_verdict.label, confidence: record.agent_verdict.confidence } : null,
          after: req.agent_verdict ? { label: req.agent_verdict.label, confidence: req.agent_verdict.confidence } : null,
          links: [{ kind: 'verdict', id: 'V', label: 'Verdict' }],
        }
      );
    }
    if (req.analyst_verdict !== undefined) {
      patch.analyst_verdict = req.analyst_verdict ? { ...req.analyst_verdict, set_by: actor, set_at: ts } : null;
      log(
        'record.analyst_verdict_changed',
        req.analyst_verdict
          ? `Set the determination to ${VERDICT_LABELS[req.analyst_verdict.verdict].toLowerCase()}`
          : 'Reverted to the agent verdict',
        {
          details: req.analyst_verdict?.reason ?? null,
          before: record.analyst_verdict ?? null,
          after: patch.analyst_verdict,
          links: [{ kind: 'verdict', id: 'V', label: 'Verdict' }],
        }
      );
    }
    if (req.status !== undefined && req.status !== record.status && record.status !== 'closed') {
      patch.status = req.status;
      casePatch.status = req.status === 'open' ? CaseStatuses.open : CaseStatuses['in-progress'];
      log('record.status_changed', `Changed the status to ${req.status}`);
    }
    if (req.restricted_to !== undefined) {
      patch.restricted_to = req.restricted_to;
      log(
        'record.restriction_changed',
        req.restricted_to.length
          ? `Restricted the investigation to ${plural(req.restricted_to.length, 'person', 'people')}`
          : 'Removed the access restriction',
        { before: record.restricted_to, after: req.restricted_to }
      );
    }
    if (req.ai_enabled !== undefined && req.ai_enabled !== record.ai_enabled) {
      patch.ai_enabled = req.ai_enabled;
      log('record.ai_changed', req.ai_enabled ? 'Enabled agents on this investigation' : 'Disabled agents on this investigation');
    }
    if (patch.analyst_verdict !== undefined || patch.agent_verdict !== undefined) {
      const analyst = patch.analyst_verdict !== undefined ? patch.analyst_verdict : record.analyst_verdict;
      const agent = patch.agent_verdict !== undefined ? patch.agent_verdict : record.agent_verdict;
      patch.verdict_effective = record.close_outcome?.verdict ?? analyst?.verdict ?? agent?.classification ?? null;
    }
    if (!Object.keys(patch).length) {
      return this.toRecord(record, seqNo, primaryTerm);
    }

    if (Object.keys(casePatch).length) {
      await this.deps.casesClient.cases.bulkUpdate({
        cases: [{ id: recordId, version: theCase.version, ...casePatch }],
      } as Parameters<CasesClient['cases']['bulkUpdate']>[0]);
    }
    patch.updated_at = ts;
    patch.updated_by = actor;
    try {
      await this.es.update({
        index: INVESTIGATION_RECORDS_INDEX,
        id: recordId,
        refresh: true,
        ...(req.version ? decodeVersion(req.version) : { retry_on_conflict: 3 }),
        doc: patch,
      });
    } catch (error) {
      if (error?.meta?.statusCode === 409) {
        throw Boom.conflict('The investigation was changed by someone else. Reload and try again.');
      }
      throw error;
    }
    await this.appendActivity(recordId, entries);
    await this.refreshCounters(recordId, actor, { touch: false });
    if (patch.restricted_to?.length && !patch.restricted_to.includes(this.deps.user.username)) {
      return this.toRecord({ ...record, ...patch } as StoredRecord);
    }
    return (await this.getRecord(recordId)).record;
  }

  public async closeRecord(recordId: string, req: CloseRecordRequest): Promise<InvestigationRecord> {
    const { record, theCase } = await this.load(recordId);
    if (record.status === 'closed') throw Boom.badRequest('The investigation is already closed.');
    const actor = this.actor(req.actor);
    const ts = this.ts(req.closed_at);
    const left = await this.searchItems<TaskItem>(recordId, {
      bool: {
        filter: [term('kind', 'task'), term('task.required', true)],
        must_not: [terms('status', ['done', 'skipped'])],
      },
    }, 100);
    if (left.length) {
      throw Boom.badRequest(
        `${plural(left.length, 'required task')} must be done first: ${left.map((t) => t.title).join('; ')}`
      );
    }

    // Withdraw pending proposals.
    const pending = await this.searchItems<ProposalItem>(
      recordId,
      { bool: { filter: [term('kind', 'proposal'), term('status', 'pending')] } },
      1000
    );
    if (pending.length) {
      await this.es.bulk({
        refresh: true,
        operations: pending.flatMap((p) => [
          { update: { _index: INVESTIGATION_ITEMS_INDEX, _id: p.id } },
          {
            doc: {
              status: 'withdrawn',
              updated_at: ts,
              updated_by: actor,
              proposal: { decision: { by: actor, at: ts, reason: 'Investigation closed', note: null } },
            },
          },
        ]),
      });
    }

    const alertsClosed = await this.setAlertsStatus(recordId, 'closed');

    await this.deps.casesClient.cases.bulkUpdate({
      cases: [
        {
          id: recordId,
          version: theCase.version,
          status: CaseStatuses.closed,
          ...(theCase.settings?.syncAlerts
            ? {
                closeReason:
                  req.verdict === 'true_positive'
                    ? 'true_positive'
                    : req.verdict === 'benign'
                    ? 'benign_positive'
                    : 'other',
              }
            : {}),
        },
      ],
    } as Parameters<CasesClient['cases']['bulkUpdate']>[0]);

    const outcome = {
      verdict: req.verdict,
      reason: req.reason,
      root_cause: req.root_cause,
      summary: req.summary,
      closed_by: actor,
      closed_at: ts,
      alerts_closed: alertsClosed,
      proposals_withdrawn: pending.length,
    };
    await this.es.update({
      index: INVESTIGATION_RECORDS_INDEX,
      id: recordId,
      refresh: true,
      retry_on_conflict: 5,
      doc: {
        status: 'closed',
        closed_at: ts,
        close_outcome: outcome,
        verdict_effective: req.verdict,
        stage: 'Close out',
        updated_at: ts,
        updated_by: actor,
      },
    });
    const entries: Array<Omit<ActivityEntry, 'id' | 'record_id' | 'space_id'>> = [
      {
        ts,
        actor,
        action: 'record.closed',
        target: { kind: 'record', id: recordId, title: record.title },
        message: `Closed the investigation as ${VERDICT_LABELS[req.verdict].toLowerCase()} (${req.reason.toLowerCase()})`,
        details: req.summary,
        links: [{ kind: 'tab', id: 'overview', label: 'Outcome' }],
        before: record.close_outcome?.summary ?? null,
        after: req.summary,
      },
    ];
    const automation: Actor = { type: 'automation', id: 'cases-investigations', name: 'Workflow', on_behalf_of: actor.name };
    if (alertsClosed) {
      entries.push({
        ts,
        actor: automation,
        action: 'alerts.closed',
        message: `Closed the ${plural(alertsClosed, 'alert')} in this investigation`,
        links: [],
      });
    }
    if (pending.length) {
      entries.push({
        ts,
        actor: automation,
        action: 'proposals.withdrawn',
        message: `Withdrew ${plural(pending.length, 'pending proposal')}`,
        links: [],
      });
    }
    await this.appendActivity(recordId, entries);
    await this.refreshCounters(recordId, actor, { touch: false });
    return (await this.getRecord(recordId)).record;
  }

  /** Updates the workflow status of every alert attached to the record. Returns how many. */
  private async setAlertsStatus(recordId: string, status: 'open' | 'closed'): Promise<number> {
    const alertsClient = await this.deps.getAlertsClient().catch(() => undefined);
    if (!alertsClient) return 0;
    let count = 0;
    const byIndex = new Map<string, string[]>();
    await this.scanItems<EvidenceItem>(
      recordId,
      { bool: { filter: [term('kind', 'evidence'), term('evidence.type', 'alert')] } },
      ['evidence.alert'],
      (batch) => {
        for (const item of batch) {
          const alert = item.evidence?.alert;
          if (alert?.id && alert.index) {
            const list = byIndex.get(alert.index) ?? [];
            list.push(alert.id);
            byIndex.set(alert.index, list);
          }
        }
      }
    );
    for (const [index, ids] of byIndex) {
      for (let i = 0; i < ids.length; i += 1000) {
        const chunk = ids.slice(i, i + 1000);
        try {
          await alertsClient.bulkUpdate({ ids: chunk, status, index });
          count += chunk.length;
        } catch (error) {
          this.deps.logger.warn(`Investigation ${recordId}: alert status update failed for ${index}: ${error}`);
        }
      }
    }
    return count;
  }

  public async reopenRecord(recordId: string): Promise<InvestigationRecord> {
    const { record, theCase } = await this.load(recordId);
    if (record.status !== 'closed') throw Boom.badRequest('The investigation is not closed.');
    if (record.merged_into) throw Boom.badRequest('A merged investigation cannot be reopened.');
    const actor = this.actor();
    const ts = now();
    const nextStatus = record.owner ? 'in-progress' : 'open';
    await this.deps.casesClient.cases.bulkUpdate({
      cases: [
        {
          id: recordId,
          version: theCase.version,
          status: nextStatus === 'open' ? CaseStatuses.open : CaseStatuses['in-progress'],
        },
      ],
    } as Parameters<CasesClient['cases']['bulkUpdate']>[0]);
    const reopenedAlerts = await this.setAlertsStatus(recordId, 'open');
    await this.es.update({
      index: INVESTIGATION_RECORDS_INDEX,
      id: recordId,
      refresh: true,
      retry_on_conflict: 5,
      doc: {
        status: nextStatus,
        closed_at: null,
        close_outcome: null,
        verdict_effective: record.analyst_verdict?.verdict ?? record.agent_verdict?.classification ?? null,
        updated_at: ts,
        updated_by: actor,
      },
    });
    await this.appendActivity(recordId, [
      {
        ts,
        actor,
        action: 'record.reopened',
        target: { kind: 'record', id: recordId, title: record.title },
        message: 'Reopened the investigation',
        details: reopenedAlerts ? `Reopened ${plural(reopenedAlerts, 'alert')}.` : null,
        before: record.close_outcome ?? null,
        links: [],
      },
    ]);
    await this.refreshCounters(recordId, actor, { touch: false });
    return (await this.getRecord(recordId)).record;
  }

  public async mergeRecord(recordId: string, otherId: string, keep: 'this' | 'other'): Promise<MergeRecordResponse> {
    if (recordId === otherId) throw Boom.badRequest('Cannot merge an investigation with itself.');
    const [a, b] = await Promise.all([this.load(recordId), this.load(otherId)]);
    const primary = keep === 'this' ? a : b;
    const merged = keep === 'this' ? b : a;
    if (merged.record.merged_into || primary.record.merged_into) {
      throw Boom.badRequest('One of these investigations was already merged.');
    }
    const actor = this.actor();
    const ts = now();

    // Move items in pages, renumbering refs so they stay unique on the primary.
    let moved = 0;
    const kindCounts = await this.es.search({
      index: INVESTIGATION_ITEMS_INDEX,
      size: 0,
      query: term('record_id', merged.record.id),
      aggs: { kind: { terms: { field: 'kind', size: 20 } } },
    });
    const counts = toMap(buckets(kindCounts.aggregations?.kind)) as Partial<Record<ItemKind, number>>;
    const starts = await this.reserveRefs(primary.record.id, counts);
    const next: Record<string, number> = { ...starts };
    await this.scanItems<InvestigationItem>(merged.record.id, { match_all: {} }, undefined, async (batch) => {
      const ops = batch.flatMap((item) => {
        const n = next[item.kind] ?? 1;
        next[item.kind] = n + 1;
        const ref = `${ITEM_REF_PREFIX[item.kind]}${n}`;
        const { version: _v, ...doc } = item;
        return [
          { index: { _index: INVESTIGATION_ITEMS_INDEX, _id: item.id } },
          { ...doc, record_id: primary.record.id, ref, ref_num: n, links: [...(item.links ?? []), { relation: 'derived_from', target_id: merged.record.id }] },
        ];
      });
      if (ops.length) {
        await this.es.bulk({ refresh: false, operations: ops });
        moved += batch.length;
      }
    });
    await this.es.indices.refresh({ index: INVESTIGATION_ITEMS_INDEX });

    await this.deps.casesClient.cases.bulkUpdate({
      cases: [
        {
          id: merged.record.id,
          version: merged.theCase.version,
          status: CaseStatuses.closed,
          ...(merged.theCase.settings?.syncAlerts ? { closeReason: 'duplicate' } : {}),
        },
      ],
    } as Parameters<CasesClient['cases']['bulkUpdate']>[0]);
    await this.es.update({
      index: INVESTIGATION_RECORDS_INDEX,
      id: merged.record.id,
      refresh: true,
      retry_on_conflict: 5,
      doc: {
        status: 'closed',
        closed_at: ts,
        merged_into: primary.record.id,
        close_outcome: {
          verdict: 'inconclusive',
          reason: 'Duplicate',
          root_cause: 'Unknown',
          summary: `Merged into ${primary.record.display_id}.`,
          closed_by: actor,
          closed_at: ts,
          alerts_closed: 0,
          proposals_withdrawn: 0,
        },
        updated_at: ts,
        updated_by: actor,
      },
    });
    await this.es.update({
      index: INVESTIGATION_RECORDS_INDEX,
      id: primary.record.id,
      refresh: true,
      retry_on_conflict: 5,
      doc: {
        merged_from: Array.from(new Set([...(primary.record.merged_from ?? []), merged.record.id, ...(merged.record.merged_from ?? [])])),
        conversation_ids: Array.from(new Set([...(primary.record.conversation_ids ?? []), ...(merged.record.conversation_ids ?? [])])),
        threads: [...(primary.record.threads ?? []), ...(merged.record.threads ?? [])].slice(0, INVESTIGATION_LIMITS.maxThreads),
        updated_at: ts,
        updated_by: actor,
      },
    });
    await this.appendActivity(primary.record.id, [
      {
        ts,
        actor,
        action: 'record.merged_in',
        target: { kind: 'record', id: merged.record.id, title: merged.record.title },
        message: `Merged ${merged.record.display_id} into this investigation`,
        details: `${plural(moved, 'item')} moved. Both histories are kept.`,
        links: [{ kind: 'record', id: merged.record.id, label: merged.record.display_id }],
      },
    ]);
    await this.appendActivity(merged.record.id, [
      {
        ts,
        actor,
        action: 'record.merged_into',
        target: { kind: 'record', id: primary.record.id, title: primary.record.title },
        message: `Merged into ${primary.record.display_id} and closed`,
        details: `${plural(moved, 'item')} moved to ${primary.record.display_id}.`,
        links: [{ kind: 'record', id: primary.record.id, label: primary.record.display_id }],
      },
    ]);
    await Promise.all([
      this.refreshCounters(primary.record.id, actor, { touch: false }),
      this.refreshCounters(merged.record.id, actor, { touch: false }),
    ]);
    const [p, m] = await Promise.all([this.getRecord(primary.record.id), this.getRecord(merged.record.id)]);
    return { primary: p.record, merged: m.record, items_moved: moved };
  }

  /* ---------------------------------------------------------------- */
  /* Procedure templates and investigation types                       */
  /* ---------------------------------------------------------------- */

  public async listTypes(): Promise<InvestigationType[]> {
    const types = DEFAULT_INVESTIGATION_TYPES.map((t) => ({ ...t, fields: [...t.fields] }));
    try {
      const templatesClient = (this.deps.casesClient as unknown as {
        templates?: { getAllTemplates?: (args: unknown) => Promise<unknown> };
      }).templates;
      const found = (await templatesClient?.getAllTemplates?.({ owner: [INVESTIGATIONS_OWNER], page: 1, perPage: 100 })) as
        | { templates?: Array<{ templateId: string; name: string }> }
        | undefined;
      for (const tpl of found?.templates ?? []) {
        const match = types.find((t) => t.name.toLowerCase() === tpl.name.toLowerCase());
        if (match) match.template_id = tpl.templateId;
      }
    } catch (error) {
      this.deps.logger.debug(`Investigation types: case templates lookup failed: ${error}`);
    }
    return types;
  }

  public async listProcedureTemplates(): Promise<ProcedureTemplate[]> {
    await this.ensureCanReadOwner();
    const res = await this.es.search<{ type: string; tasks: ProcedureTemplateTask[]; updated_at: string; updated_by: Actor }>({
      index: INVESTIGATION_CONFIG_INDEX,
      size: 100,
      seq_no_primary_term: true,
      query: { bool: { filter: [term('doc_type', 'procedure_template'), term('space_id', this.deps.spaceId)] } },
    });
    const stored = new Map(res.hits.hits.map((h) => [h._source?.type ?? '', h]));
    const system: Actor = { type: 'automation', id: 'defaults', name: 'Default template' };
    const names = Array.from(new Set([...Object.keys(DEFAULT_PROCEDURE_TEMPLATES), ...stored.keys()])).filter(Boolean);
    return names.map((type) => {
      const hit = stored.get(type);
      if (hit?._source) {
        return {
          type,
          tasks: hit._source.tasks,
          updated_at: hit._source.updated_at,
          updated_by: hit._source.updated_by,
          version: encodeVersion(hit._seq_no, hit._primary_term),
        };
      }
      return { type, tasks: DEFAULT_PROCEDURE_TEMPLATES[type] ?? [], updated_at: '1970-01-01T00:00:00.000Z', updated_by: system };
    });
  }

  public async saveProcedureTemplate(type: string, tasks: ProcedureTemplateTask[]): Promise<ProcedureTemplate> {
    await this.ensureCanReadOwner();
    const actor = this.actor();
    const ts = now();
    const id = `procedure_template:${this.deps.spaceId}:${type}`;
    const res = await this.es.index({
      index: INVESTIGATION_CONFIG_INDEX,
      id,
      refresh: true,
      document: { doc_type: 'procedure_template', space_id: this.deps.spaceId, type, tasks, updated_at: ts, updated_by: actor },
    });
    return { type, tasks, updated_at: ts, updated_by: actor, version: encodeVersion(res._seq_no, res._primary_term) };
  }

  public async applyProcedure(recordId: string, type: string, replace: boolean): Promise<TaskItem[]> {
    const { record } = await this.load(recordId);
    const actor = this.actor();
    const tasks = await this.applyProcedureInternal(record, type, replace, actor, now());
    await this.refreshCounters(recordId, actor);
    return tasks;
  }

  private async applyProcedureInternal(
    record: StoredRecord,
    type: string,
    replace: boolean,
    actor: Actor,
    ts: string
  ): Promise<TaskItem[]> {
    const templates = await this.listProcedureTemplates();
    const template = templates.find((t) => t.type === type);
    if (!template) throw Boom.badRequest(`No procedure template for "${type}"`);
    const existing = await this.searchItems<TaskItem>(record.id, term('kind', 'task'), 1000);
    const keptTitles = new Set<string>();
    if (replace) {
      const removable = existing.filter((t) => t.status !== 'done' && t.status !== 'skipped');
      existing.filter((t) => t.status === 'done' || t.status === 'skipped').forEach((t) => keptTitles.add(t.title.toLowerCase()));
      if (removable.length) {
        await this.es.deleteByQuery({
          index: INVESTIGATION_ITEMS_INDEX,
          refresh: true,
          query: { bool: { filter: [term('record_id', record.id), terms('id', removable.map((t) => t.id))] } },
        });
      }
    } else {
      existing.forEach((t) => keptTitles.add(t.title.toLowerCase()));
    }
    const claims = await this.searchItems<ClaimItem>(record.id, term('kind', 'claim'), 1000);
    const toCreate = template.tasks.filter((t) => !keptTitles.has(t.title.toLowerCase()));
    const ids = toCreate.map(() => uuidv4());
    const idByTitle = new Map<string, string>();
    toCreate.forEach((t, i) => idByTitle.set(t.title.toLowerCase(), ids[i]));
    existing.forEach((t) => idByTitle.set(t.title.toLowerCase(), t.id));
    const inputs: Array<ItemInput & { _id?: string }> = toCreate.map((t, i) => {
      const owner =
        t.owner_type === 'agent'
          ? { type: 'agent' as const, id: record.agent_id ?? this.deps.agent.agentId, name: record.agent_name ?? this.deps.agent.agentName }
          : t.owner_type === 'automation'
          ? { type: 'automation' as const, id: 'workflow', name: 'Workflow' }
          : t.owner_type === 'team'
          ? { type: 'team' as const, id: t.owner ?? 'Security Ops', name: t.owner ?? 'Security Ops' }
          : { type: 'person' as const, id: null, name: null };
      let auto = t.auto ?? null;
      if (auto?.type === 'claim' && auto.question) {
        const question = auto.question.toLowerCase();
        const match = claims.find((c) => c.claim.question.toLowerCase() === question);
        auto = { ...auto, claim_id: match?.id ?? null };
      }
      return {
        _id: ids[i],
        kind: 'task',
        title: t.title,
        status: 'todo',
        task: {
          phase: t.phase,
          description: t.description ?? null,
          required: t.required,
          owner,
          depends_on: t.after ? idByTitle.get(t.after.toLowerCase()) ?? null : null,
          auto,
          skip_reason: null,
          note: null,
          completed_by: null,
          completed_at: null,
          template_ref: type,
          order: i + 1,
        },
      };
    });
    const created = inputs.length
      ? (await this.bulkCreateItemsInternal(record, inputs, actor, { silent: true, ts })).items
      : [];
    if (record.investigation_type !== type) {
      await this.es.update({ index: INVESTIGATION_RECORDS_INDEX, id: record.id, refresh: true, retry_on_conflict: 3, doc: { investigation_type: type } });
    }
    const required = template.tasks.filter((t) => t.required).length;
    await this.appendActivity(record.id, [
      {
        ts,
        actor,
        action: 'procedure.applied',
        message: `Applied the ${type} procedure`,
        details: `${plural(template.tasks.length, 'task')}, ${required} required.${replace ? ' Unfinished tasks from the previous procedure were removed.' : ''}`,
        links: [{ kind: 'tab', id: 'procedure', label: 'Procedure' }],
      },
    ]);
    return created as TaskItem[];
  }

  /* ---------------------------------------------------------------- */
  /* Items                                                             */
  /* ---------------------------------------------------------------- */

  private async searchItems<T extends InvestigationItem>(
    recordId: string,
    query: QueryDslQueryContainer,
    size: number
  ): Promise<T[]> {
    const res = await this.es.search<StoredItem>({
      index: INVESTIGATION_ITEMS_INDEX,
      size,
      seq_no_primary_term: true,
      query: { bool: { filter: [term('record_id', recordId), query] } },
      sort: [{ ref_num: { order: 'asc' } }],
    });
    return res.hits.hits.map((h) => this.toItem(h) as T);
  }

  /** Pages through all matching items with search_after, calling `onBatch` per page. */
  private async scanItems<T extends InvestigationItem>(
    recordId: string,
    query: QueryDslQueryContainer,
    sourceIncludes: string[] | undefined,
    onBatch: (batch: T[]) => void | Promise<void>,
    limit = 100000
  ): Promise<void> {
    let searchAfter: Array<string | number> | undefined;
    let seen = 0;
    while (seen < limit) {
      const res = await this.es.search<StoredItem>({
        index: INVESTIGATION_ITEMS_INDEX,
        size: 1000,
        seq_no_primary_term: true,
        ...(sourceIncludes ? { _source: { includes: [...sourceIncludes, 'id', 'kind', 'ref', 'title', 'record_id'] } } : {}),
        query: { bool: { filter: [term('record_id', recordId), query] } },
        sort: [{ ref_num: { order: 'asc' } }, { id: { order: 'asc' } }],
        ...(searchAfter ? { search_after: searchAfter } : {}),
      });
      const hits = res.hits.hits;
      if (!hits.length) break;
      await onBatch(hits.map((h) => this.toItem(h) as T));
      seen += hits.length;
      searchAfter = hits[hits.length - 1].sort as Array<string | number>;
      if (hits.length < 1000) break;
    }
  }

  private buildItemQuery(recordId: string, req: FindItemsRequest): {
    query: QueryDslQueryContainer;
    postFilter: QueryDslQueryContainer[];
  } {
    const filter: QueryDslQueryContainer[] = [term('record_id', recordId)];
    const postFilter: QueryDslQueryContainer[] = [];
    if (req.kind?.length) filter.push(terms('kind', req.kind));
    if (req.target_id) filter.push(term('comment.target_id', req.target_id));
    if (req.ids?.length) filter.push(terms('id', req.ids));
    if (req.refs?.length) filter.push(terms('ref', req.refs.map((r) => r.toLowerCase())));
    if (req.created_after) filter.push({ range: { created_at: { gt: req.created_after } } });
    if (req.type?.length) postFilter.push(terms('evidence.type', req.type));
    if (req.indicator_type?.length) postFilter.push(terms('evidence.indicator.type', req.indicator_type));
    if (req.added_by?.length) postFilter.push(terms('created_by.id', req.added_by));
    if (req.added_by_type?.length) postFilter.push(terms('created_by.type', req.added_by_type));
    if (req.status?.length) postFilter.push(terms('status', req.status));
    const must: QueryDslQueryContainer[] = [];
    const q = req.search?.trim();
    if (q) {
      const lower = q.toLowerCase();
      const should: QueryDslQueryContainer[] = [
        {
          multi_match: {
            query: q,
            fields: ['title^3', 'text', 'evidence.why', 'claim.question^2', 'claim.conclusion', 'claim.note', 'task.description'],
            operator: 'and',
          },
        },
        term('evidence.indicator.value', lower),
        term('ref', lower),
        term('entity.name', lower),
        term('evidence.alert.host', lower),
        term('evidence.alert.user', lower),
        term('evidence.alert.id', q),
        term('evidence.snapshot_hash', lower),
      ];
      if (lower.length >= 4) {
        should.push({ prefix: { 'evidence.indicator.value': lower } });
        should.push({ prefix: { 'title.keyword': lower } });
      }
      must.push({ bool: { should, minimum_should_match: 1 } });
    }
    return { query: { bool: { filter, must } }, postFilter };
  }

  public async findItems(recordId: string, req: FindItemsRequest): Promise<FindItemsResponse> {
    await this.load(recordId);
    return this.findItemsUnchecked(recordId, req);
  }

  /** Item search for a record that was already authorized. */
  public async findItemsUnchecked(recordId: string, req: FindItemsRequest): Promise<FindItemsResponse> {
    const perPage = Math.min(req.per_page ?? INVESTIGATION_LIMITS.defaultPerPage, INVESTIGATION_LIMITS.maxPerPage);
    const page = Math.max(req.page ?? 1, 1);
    const { query, postFilter } = this.buildItemQuery(recordId, req);
    const sortField = ITEM_SORT_FIELDS[req.sort_field ?? 'ref_num'] ?? 'ref_num';
    const sort: Sort = [{ [sortField]: { order: req.sort_order ?? 'asc', unmapped_type: 'keyword' } }, { id: { order: 'asc' } }];
    const from = req.cursor ? 0 : (page - 1) * perPage;
    if (!req.cursor && from + perPage > INVESTIGATION_LIMITS.maxDeepPageFrom) {
      throw Boom.badRequest('Page is too deep; use the cursor for deep paging.');
    }
    const started = Date.now();
    const res = await this.es.search<StoredItem>({
      index: INVESTIGATION_ITEMS_INDEX,
      from,
      size: perPage,
      track_total_hits: true,
      seq_no_primary_term: true,
      query,
      ...(postFilter.length ? { post_filter: { bool: { filter: postFilter } } } : {}),
      sort,
      ...(req.cursor ? { search_after: decodeCursor(req.cursor) } : {}),
      ...(req.facets
        ? {
            aggs: {
              kind: { terms: { field: 'kind', size: 20 } },
              type: { terms: { field: 'evidence.type', size: 20 } },
              indicator_type: { terms: { field: 'evidence.indicator.type', size: 20 } },
              status: { terms: { field: 'status', size: 20 } },
              added_by: {
                terms: { field: 'created_by.id', size: 50 },
                aggs: { who: { top_hits: { size: 1, _source: { includes: ['created_by'] } } } },
              },
            },
          }
        : {}),
    });
    const hits = res.hits.hits;
    let facets: ItemFacets | undefined;
    if (req.facets && res.aggregations) {
      const aggs = res.aggregations;
      facets = {
        kind: toMap(buckets(aggs.kind)),
        type: toMap(buckets(aggs.type)),
        indicator_type: toMap(buckets(aggs.indicator_type)),
        status: toMap(buckets(aggs.status)),
        added_by: buckets(aggs.added_by).map((b) => {
          const top = (b as unknown as { who: { hits: { hits: Array<{ _source: { created_by: Actor } }> } } }).who.hits.hits[0];
          const who = top?._source.created_by;
          return { id: b.key, name: who?.name ?? b.key, type: who?.type ?? 'user', count: b.doc_count };
        }),
      };
    }
    return {
      items: hits.map((h) => this.toItem(h)),
      total: typeof res.hits.total === 'number' ? res.hits.total : res.hits.total?.value ?? 0,
      page,
      per_page: perPage,
      next_cursor: hits.length === perPage ? encodeCursor(hits[hits.length - 1].sort ?? []) : null,
      facets,
      took_ms: Date.now() - started,
    };
  }

  public async getItem(recordId: string, itemId: string): Promise<InvestigationItem> {
    await this.load(recordId);
    return this.getItemUnchecked(recordId, itemId);
  }

  private async getItemUnchecked(recordId: string, itemId: string): Promise<InvestigationItem> {
    const doc = await this.es.get<StoredItem>({ index: INVESTIGATION_ITEMS_INDEX, id: itemId }, { ignore: [404] });
    if (!doc.found || !doc._source || doc._source.record_id !== recordId) {
      throw Boom.notFound(`Item ${itemId} not found`);
    }
    return this.toItem(doc as unknown as SearchHit<StoredItem>);
  }

  public async bulkCreateItems(recordId: string, req: BulkCreateItemsRequest): Promise<BulkCreateItemsResponse> {
    const { record } = await this.load(recordId);
    if (record.status === 'closed' && !this.deps.allowBackdate) {
      throw Boom.badRequest('The investigation is closed. Reopen it to add items.');
    }
    if (req.items.length > INVESTIGATION_LIMITS.maxBulkItems) {
      throw Boom.badRequest(`At most ${INVESTIGATION_LIMITS.maxBulkItems} items per request`);
    }
    const actor = this.actor(req.actor);
    const started = Date.now();
    const result = await this.bulkCreateItemsInternal(record, req.items, actor, {
      extractIndicators: req.extract_indicators ?? true,
      linkAlerts: req.link_alerts ?? true,
    });
    await this.refreshCounters(recordId, actor, { touch: !req.items.some((i) => i.created_at) });
    return { ...result, took_ms: Date.now() - started };
  }

  /**
   * Creates items for an already authorized record. Allocates refs atomically, writes through
   * `_bulk`, links alerts, extracts indicators, runs automatic task rules and logs activity.
   */
  private async bulkCreateItemsInternal(
    record: StoredRecord,
    inputs: Array<ItemInput & { _id?: string }>,
    actor: Actor,
    opts: { extractIndicators?: boolean; linkAlerts?: boolean; silent?: boolean; ts?: string } = {}
  ): Promise<{ items: InvestigationItem[]; errors: Array<{ index: number; message: string }> }> {
    if (!inputs.length) return { items: [], errors: [] };
    const counts: Partial<Record<ItemKind, number>> = {};
    for (const input of inputs) counts[input.kind] = (counts[input.kind] ?? 0) + 1;
    const starts = await this.reserveRefs(record.id, counts);
    const next: Record<string, number> = { ...starts };
    const docs: StoredItem[] = inputs.map((input) => {
      const n = next[input.kind] ?? 1;
      next[input.kind] = n + 1;
      const createdAt = this.ts(input.created_at ?? opts.ts ?? null);
      const { _id, created_at: _c, ...rest } = input;
      const doc = {
        ...rest,
        id: _id ?? uuidv4(),
        record_id: record.id,
        space_id: this.deps.spaceId,
        ref: `${ITEM_REF_PREFIX[input.kind]}${n}`,
        ref_num: n,
        title: input.title ?? (input.kind === 'comment' ? clip(input.text, 80) : ''),
        text: input.text ?? null,
        status: 'status' in input ? input.status ?? null : null,
        links: input.links ?? [],
        created_at: createdAt,
        created_by: actor,
        updated_at: createdAt,
        updated_by: actor,
      } as unknown as StoredItem;
      return this.normalizeItem(doc, actor, true);
    });

    const res = await this.es.bulk({
      refresh: docs.length > 200 ? 'wait_for' : true,
      operations: docs.flatMap((doc) => [{ create: { _index: INVESTIGATION_ITEMS_INDEX, _id: doc.id } }, doc]),
    });
    const errors: Array<{ index: number; message: string }> = [];
    const created: StoredItem[] = [];
    res.items.forEach((entry, i) => {
      const op = entry.create;
      if (op?.error) errors.push({ index: i, message: op.error.reason ?? op.error.type });
      else created.push(docs[i]);
    });
    const items = created.map(
      (doc, i) => ({ ...doc, version: encodeVersion(res.items[i]?.create?._seq_no, res.items[i]?.create?._primary_term) }) as unknown as InvestigationItem
    );

    const alerts = items.filter((i): i is EvidenceItem => i.kind === 'evidence' && i.evidence.type === 'alert' && !!i.evidence.alert?.id);
    if (alerts.length && opts.linkAlerts) {
      await this.linkAlerts(record.id, alerts);
    }
    if (alerts.length && opts.extractIndicators && alerts.length <= 200) {
      await this.extractIndicators(record, alerts, actor);
    }
    for (const item of items) {
      if (item.kind === 'claim' && (item.status === 'supported' || item.status === 'refuted')) {
        await this.completeTasksForClaim(record.id, item as ClaimItem, actor, item.created_at);
      }
    }
    if (!opts.silent) {
      await this.appendActivity(record.id, [this.describeCreate(items, actor, opts.ts)]);
    }
    return { items, errors };
  }

  private describeCreate(
    items: InvestigationItem[],
    actor: Actor,
    ts?: string
  ): Omit<ActivityEntry, 'id' | 'record_id' | 'space_id'> {
    const when = ts ?? items[items.length - 1]?.created_at ?? now();
    if (items.length === 1) {
      const item = items[0];
      const target = { kind: item.kind, id: item.id, ref: item.ref, title: item.title };
      const link = { kind: item.kind === 'timeline_event' ? ('record' as const) : (item.kind as 'evidence'), id: item.id, label: item.ref };
      const verb: Record<ItemKind, string> = {
        evidence: `Added evidence ${describeItem(item)}`,
        claim: `Opened claim ${describeItem(item)}`,
        entity: `Added ${item.title} to the scope`,
        link: `Linked ${item.title}`,
        task: `Added task "${clip(item.title, 120)}"`,
        comment: `Commented${item.kind === 'comment' && (item as { comment: { target_id: string } }).comment.target_id !== item.record_id ? ' on an item' : ''}`,
        proposal: `Proposed: ${clip(item.title, 140)}`,
        timeline_event: `Added a timeline event: ${clip(item.title, 120)}`,
      };
      return {
        ts: when,
        actor,
        action: 'item.created',
        target,
        message: verb[item.kind],
        details: item.kind === 'comment' ? clip(item.text ?? '', 280) : null,
        links: item.kind === 'comment' ? [] : [link],
      };
    }
    const byKind = new Map<string, number>();
    for (const item of items) {
      const key = item.kind === 'evidence' ? EVIDENCE_TYPE_LABELS[item.evidence.type].toLowerCase() : item.kind.replace('_', ' ');
      byKind.set(key, (byKind.get(key) ?? 0) + 1);
    }
    const allEvidence = items.every((i) => i.kind === 'evidence');
    return {
      ts: when,
      actor,
      action: 'items.created',
      message: allEvidence ? `Added ${plural(items.length, 'evidence item')}` : `Added ${plural(items.length, 'item')}`,
      details: Array.from(byKind.entries())
        .map(([k, n]) => (n === 1 ? `1 ${k}` : `${n.toLocaleString('en-US')} ${pluralNoun(k)}`))
        .join(', '),
      links: [{ kind: 'tab', id: allEvidence ? 'evidence' : 'overview', label: allEvidence ? 'Evidence' : 'Overview' }],
    };
  }

  /** Server-side normalisation and invariants shared by create and update. */
  private normalizeItem(doc: StoredItem, actor: Actor, isCreate: boolean): StoredItem {
    if (doc.kind === 'evidence') {
      const ev = doc.evidence;
      if (ev.indicator?.value) ev.indicator = { ...ev.indicator, value: ev.indicator.value.trim() };
      if (ev.snapshot && !ev.snapshot_hash) {
        ev.snapshot_hash = ev.snapshot.kind === 'file' && ev.snapshot.sha256 ? ev.snapshot.sha256 : hashSnapshot(ev.snapshot);
      }
      if (ev.snapshot && !ev.preserved_at) ev.preserved_at = doc.created_at;
    }
    if (doc.kind === 'claim') {
      doc.claim.supporting_evidence_ids = doc.claim.supporting_evidence_ids ?? [];
      doc.claim.opposing_evidence_ids = doc.claim.opposing_evidence_ids ?? [];
      doc.claim.gaps = doc.claim.gaps ?? [];
      if (actor.type === 'agent' && isCreate) doc.claim.needs_review = true;
      doc.title = doc.claim.conclusion && (doc.status === 'supported' || doc.status === 'refuted') ? doc.claim.conclusion : doc.claim.question;
    }
    if (doc.kind === 'entity') {
      doc.entity.evidence_ids = doc.entity.evidence_ids ?? [];
      doc.entity.attributes = doc.entity.attributes ?? [];
      doc.entity.tags = doc.entity.tags ?? [];
      doc.title = doc.entity.name;
    }
    if (doc.kind === 'task' && doc.status === 'skipped' && !doc.task.skip_reason) {
      throw Boom.badRequest(`Task "${doc.title}" needs a reason to be marked not applicable`);
    }
    return doc;
  }

  private async linkAlerts(recordId: string, alerts: EvidenceItem[]): Promise<void> {
    const alertsClient = await this.deps.getAlertsClient().catch(() => undefined);
    if (!alertsClient) return;
    const refs = alerts.map((a) => ({ id: a.evidence.alert?.id as string, index: a.evidence.alert?.index as string }));
    for (let i = 0; i < refs.length; i += 1000) {
      try {
        await alertsClient.bulkUpdateCases({ alerts: refs.slice(i, i + 1000), caseIds: [recordId] });
      } catch (error) {
        this.deps.logger.warn(`Investigation ${recordId}: could not record the case on alerts: ${error}`);
      }
    }
  }

  /** Pulls observable values out of the attached alert documents and adds them as indicators. */
  private async extractIndicators(record: StoredRecord, alerts: EvidenceItem[], actor: Actor): Promise<void> {
    const FIELDS: Array<[string, 'ip' | 'domain' | 'url' | 'file_hash' | 'file_path' | 'email']> = [
      ['source.ip', 'ip'],
      ['destination.ip', 'ip'],
      ['file.hash.sha256', 'file_hash'],
      ['process.hash.sha256', 'file_hash'],
      ['dll.hash.sha256', 'file_hash'],
      ['file.path', 'file_path'],
      ['url.full', 'url'],
      ['dns.question.name', 'domain'],
      ['destination.domain', 'domain'],
      ['email.from.address', 'email'],
    ];
    try {
      const byIndex = new Map<string, string[]>();
      for (const a of alerts) {
        const list = byIndex.get(a.evidence.alert?.index as string) ?? [];
        list.push(a.evidence.alert?.id as string);
        byIndex.set(a.evidence.alert?.index as string, list);
      }
      const found = new Map<string, { type: (typeof FIELDS)[number][1]; source: EvidenceItem }>();
      for (const [index, ids] of byIndex) {
        const res = await this.deps.scopedEsClient.search<Record<string, unknown>>({
          index,
          size: ids.length,
          query: { ids: { values: ids } },
          fields: FIELDS.map(([f]) => f),
          _source: false,
        });
        for (const hit of res.hits.hits) {
          const source = alerts.find((a) => a.evidence.alert?.id === hit._id);
          if (!source) continue;
          for (const [field, type] of FIELDS) {
            const values = (hit.fields?.[field] as unknown[] | undefined) ?? [];
            for (const v of values) {
              if (typeof v === 'string' && v.length && v.length < 2048) {
                const key = v.toLowerCase();
                if (!found.has(key)) found.set(key, { type, source });
              }
            }
          }
        }
      }
      if (!found.size) return;
      const existing = await this.es.search({
        index: INVESTIGATION_ITEMS_INDEX,
        size: 0,
        query: { bool: { filter: [term('record_id', record.id), terms('evidence.indicator.value', Array.from(found.keys()))] } },
        aggs: { v: { terms: { field: 'evidence.indicator.value', size: found.size } } },
      });
      const have = new Set(buckets(existing.aggregations?.v).map((b) => b.key));
      const inputs: ItemInput[] = Array.from(found.entries())
        .filter(([key]) => !have.has(key))
        .slice(0, 500)
        .map(([value, { type, source }]) => ({
          kind: 'evidence',
          title: value,
          links: [{ relation: 'derived_from', target_id: source.id }],
          evidence: {
            type: 'indicator',
            why: `Extracted from alert ${source.ref}.`,
            source: { label: 'Extracted from alert', kind: 'alert', index: source.evidence.alert?.index, id: source.evidence.alert?.id },
            indicator: { type, value },
          },
        }));
      if (!inputs.length) return;
      const automation: Actor = { type: 'automation', id: 'indicator-extraction', name: 'Indicator extraction', on_behalf_of: actor.name };
      await this.bulkCreateItemsInternal(record, inputs, automation, { extractIndicators: false, linkAlerts: false });
    } catch (error) {
      this.deps.logger.warn(`Investigation ${record.id}: indicator extraction failed: ${error}`);
    }
  }

  /** Completes tasks whose automatic rule is settled by this claim. */
  private async completeTasksForClaim(recordId: string, claim: ClaimItem, actor: Actor, ts?: string): Promise<void> {
    const question = claim.claim.question?.toLowerCase();
    const tasks = await this.searchItems<TaskItem>(recordId, {
      bool: {
        filter: [term('kind', 'task'), term('task.auto.type', 'claim')],
        must_not: [terms('status', ['done', 'skipped'])],
        should: [term('task.auto.claim_id', claim.id), ...(question ? [term('task.auto.question', question)] : [])],
        minimum_should_match: 1,
      },
    }, 50);
    await this.autoComplete(recordId, tasks, `Completed automatically when ${claim.ref} was ${claim.status}.`, actor, ts, { kind: 'claim', id: claim.id, label: claim.ref });
  }

  private async completeTasksForProposal(recordId: string, proposal: ProposalItem, actor: Actor): Promise<void> {
    const tasks = await this.searchItems<TaskItem>(recordId, {
      bool: {
        filter: [term('kind', 'task'), term('task.auto.type', 'action'), term('task.auto.category', proposal.proposal.category)],
        must_not: [terms('status', ['done', 'skipped'])],
      },
    }, 50);
    await this.autoComplete(recordId, tasks, `Completed automatically when "${proposal.title}" was approved.`, actor, undefined, { kind: 'proposal', id: proposal.id, label: proposal.ref });
  }

  private async autoComplete(
    recordId: string,
    tasks: TaskItem[],
    note: string,
    actor: Actor,
    ts: string | undefined,
    link: ActivityEntry['links'][number]
  ): Promise<void> {
    if (!tasks.length) return;
    const when = ts ?? now();
    const automation: Actor = { type: 'automation', id: 'workflow', name: 'Workflow', on_behalf_of: actor.name };
    await this.es.bulk({
      refresh: true,
      operations: tasks.flatMap((t) => [
        { update: { _index: INVESTIGATION_ITEMS_INDEX, _id: t.id } },
        {
          doc: {
            status: 'done',
            updated_at: when,
            updated_by: automation,
            task: { completed_by: automation, completed_at: when, note },
          },
        },
      ]),
    });
    await this.appendActivity(
      recordId,
      tasks.map((t) => ({
        ts: when,
        actor: automation,
        action: 'task.auto_completed',
        target: { kind: 'task' as const, id: t.id, ref: t.ref, title: t.title },
        message: `Completed task "${clip(t.title, 120)}" automatically`,
        details: note,
        links: [{ kind: 'task' as const, id: t.id, label: t.ref }, link],
      }))
    );
  }

  private applyPatch(item: StoredItem, patch: ItemPatch, actor: Actor, ts: string): StoredItem {
    const next = { ...item } as StoredItem & Record<string, unknown>;
    for (const key of ['title', 'text', 'status', 'links', 'restricted', 'exclude_from_ai'] as const) {
      if (patch[key] !== undefined) (next as Record<string, unknown>)[key] = patch[key];
    }
    const kindKey = item.kind as keyof ItemPatch;
    const kindPatch = patch[kindKey];
    for (const key of ['evidence', 'claim', 'entity', 'link', 'task', 'comment', 'proposal', 'timeline_event'] as const) {
      if (patch[key] !== undefined && key !== kindKey) {
        throw Boom.badRequest(`Cannot patch "${key}" on a ${item.kind} item`);
      }
    }
    if (kindPatch && typeof kindPatch === 'object') {
      next[item.kind] = { ...((item as unknown as Record<string, object>)[item.kind] ?? {}), ...kindPatch };
    }
    next.updated_at = ts;
    next.updated_by = actor;

    if (item.kind === 'task') {
      const task = next as unknown as TaskItem;
      if (patch.status === 'done' && item.status !== 'done') {
        task.task = { ...task.task, completed_by: actor, completed_at: ts };
      }
      if (patch.status && patch.status !== 'done' && patch.status !== 'skipped') {
        task.task = { ...task.task, completed_by: null, completed_at: null, skip_reason: null };
      }
      if (patch.status === 'skipped') {
        task.task = { ...task.task, completed_by: actor, completed_at: ts };
      }
    }
    if (item.kind === 'proposal' && patch.status && patch.status !== item.status) {
      const proposal = next as unknown as ProposalItem;
      const decision = patch.proposal?.decision;
      proposal.proposal = {
        ...proposal.proposal,
        decision:
          patch.status === 'pending'
            ? null
            : { by: actor, at: ts, reason: decision?.reason ?? null, note: decision?.note ?? null },
      };
    }
    if (item.kind === 'claim') {
      const claim = next as unknown as ClaimItem;
      if (actor.type === 'agent' && (patch.status !== undefined || patch.claim?.conclusion !== undefined || patch.claim?.confidence !== undefined)) {
        claim.claim = { ...claim.claim, needs_review: true };
      }
      if (patch.status === 'supported' || patch.status === 'refuted') {
        claim.claim = { ...claim.claim, stale_reason: patch.claim?.stale_reason ?? null };
      }
    }
    return this.normalizeItem(next, actor, false);
  }

  private describeUpdate(before: StoredItem, after: StoredItem, actor: Actor, ts: string): Omit<ActivityEntry, 'id' | 'record_id' | 'space_id'> {
    const target = { kind: before.kind, id: before.id, ref: before.ref, title: after.title };
    const link = { kind: before.kind === 'timeline_event' || before.kind === 'comment' ? ('record' as const) : (before.kind as 'evidence'), id: before.id, label: before.ref };
    const base = { ts, actor, target, links: [link] };
    if (before.kind === 'claim') {
      const b = before as unknown as ClaimItem;
      const a = after as unknown as ClaimItem;
      if (a.status !== b.status) {
        const pct = a.claim.confidence !== null && a.claim.confidence !== undefined ? ` at ${a.claim.confidence}%` : '';
        const why = a.status === 'blocked' || a.status === 'open' ? (a.claim.note ? `: ${clip(a.claim.note, 160)}` : '') : '';
        return { ...base, action: 'claim.status_changed', message: `Marked ${b.ref} ${a.status}${pct}${why}`, details: a.claim.reasoning ?? null, before: { status: b.status, conclusion: b.claim.conclusion }, after: { status: a.status, conclusion: a.claim.conclusion } };
      }
      if (b.claim.needs_review && !a.claim.needs_review) {
        return { ...base, action: 'claim.reviewed', message: `Accepted the conclusion of ${b.ref}` };
      }
      if ((a.claim.conclusion ?? '') !== (b.claim.conclusion ?? '')) {
        return { ...base, action: 'claim.conclusion_changed', message: `Edited the conclusion of ${b.ref}`, before: b.claim.conclusion, after: a.claim.conclusion };
      }
      const addedEv = (a.claim.supporting_evidence_ids ?? []).filter((id) => !(b.claim.supporting_evidence_ids ?? []).includes(id));
      if (addedEv.length) {
        return { ...base, action: 'claim.evidence_linked', message: `Linked ${plural(addedEv.length, 'evidence item')} to ${b.ref}` };
      }
      return { ...base, action: 'claim.updated', message: `Updated claim ${b.ref}`, before: b.claim, after: a.claim };
    }
    if (before.kind === 'task') {
      const a = after as unknown as TaskItem;
      if (a.status !== before.status) {
        const msg: Record<string, string> = {
          done: `Completed task "${clip(a.title, 120)}"`,
          skipped: `Marked "${clip(a.title, 120)}" as not applicable`,
          doing: `Started task "${clip(a.title, 120)}"`,
          todo: `Reopened task "${clip(a.title, 120)}"`,
        };
        return { ...base, action: 'task.status_changed', message: msg[a.status ?? 'todo'], details: a.task.skip_reason ?? a.task.note ?? null };
      }
      const b = before as unknown as TaskItem;
      if (a.task.owner?.id !== b.task.owner?.id || a.task.owner?.type !== b.task.owner?.type) {
        return { ...base, action: 'task.assigned', message: `Assigned "${clip(a.title, 100)}" to ${a.task.owner?.name ?? a.task.owner?.id ?? 'nobody'}` };
      }
      return { ...base, action: 'task.updated', message: `Edited task "${clip(a.title, 120)}"` };
    }
    if (before.kind === 'proposal') {
      const a = after as unknown as ProposalItem;
      if (a.status !== before.status) {
        const reason = a.proposal.decision?.reason ? ` (${a.proposal.decision.reason.toLowerCase()})` : '';
        const msg: Record<string, string> = {
          approved: `Approved ${clip(a.title, 140)}`,
          rejected: `Rejected ${clip(a.title, 140)}${reason}`,
          pending: `Reopened the proposal ${clip(a.title, 140)}`,
          withdrawn: `Withdrew ${clip(a.title, 140)}`,
        };
        return { ...base, action: 'proposal.decided', message: msg[a.status], details: a.proposal.decision?.note ?? null };
      }
      if (a.title !== before.title) {
        return { ...base, action: 'proposal.revised', message: `Revised the proposal to "${clip(a.title, 140)}"`, before: before.title, after: a.title };
      }
      return { ...base, action: 'proposal.updated', message: `Updated proposal ${before.ref}` };
    }
    if (before.kind === 'entity' && after.status !== before.status) {
      return { ...base, action: 'entity.scope_changed', message: `Marked ${after.title} as ${after.status}` };
    }
    if (before.kind === 'link' && after.status !== before.status) {
      return { ...base, action: 'link.status_changed', message: `Marked the link "${clip(after.title, 100)}" as ${after.status}` };
    }
    if ((after.text ?? '') !== (before.text ?? '')) {
      return { ...base, action: 'item.text_changed', message: `Edited ${before.kind === 'comment' ? 'a comment' : before.ref}`, before: before.text, after: after.text };
    }
    if (after.exclude_from_ai !== before.exclude_from_ai) {
      return { ...base, action: 'item.ai_visibility', message: after.exclude_from_ai ? `Hid ${before.ref} from agents` : `Shared ${before.ref} with agents` };
    }
    return { ...base, action: 'item.updated', message: `Edited ${before.ref}: ${clip(after.title, 100)}` };
  }

  private async afterUpdate(recordId: string, before: StoredItem, after: StoredItem, actor: Actor): Promise<void> {
    if (after.kind === 'claim' && after.status !== before.status && (after.status === 'supported' || after.status === 'refuted')) {
      await this.completeTasksForClaim(recordId, after as unknown as ClaimItem, actor);
    }
    if (after.kind === 'proposal' && after.status === 'approved' && before.status !== 'approved') {
      await this.completeTasksForProposal(recordId, after as unknown as ProposalItem, actor);
    }
  }

  public async updateItem(recordId: string, itemId: string, req: UpdateItemRequest): Promise<InvestigationItem> {
    await this.load(recordId);
    return this.updateItemUnchecked(recordId, itemId, req);
  }

  public async updateItemUnchecked(recordId: string, itemId: string, req: UpdateItemRequest): Promise<InvestigationItem> {
    const actor = this.actor(req.actor);
    const current = await this.es.get<StoredItem>({ index: INVESTIGATION_ITEMS_INDEX, id: itemId }, { ignore: [404] });
    if (!current.found || !current._source || current._source.record_id !== recordId) {
      throw Boom.notFound(`Item ${itemId} not found`);
    }
    const currentVersion = encodeVersion(current._seq_no, current._primary_term);
    if (req.version !== currentVersion) {
      throw Boom.conflict(`Item ${current._source.ref} was changed by someone else. Reload it and try again.`);
    }
    const ts = now();
    const before = current._source;
    const after = this.applyPatch(before, req.patch, actor, ts);
    let res;
    try {
      res = await this.es.index({
        index: INVESTIGATION_ITEMS_INDEX,
        id: itemId,
        refresh: true,
        ...decodeVersion(req.version),
        document: after,
      });
    } catch (error) {
      if (error?.meta?.statusCode === 409) {
        throw Boom.conflict(`Item ${before.ref} was changed by someone else. Reload it and try again.`);
      }
      throw error;
    }
    // Moving a node in the scope graph is layout, not a change to the record: no activity entry.
    if (!isLayoutOnly(req.patch)) {
      await this.appendActivity(recordId, [this.describeUpdate(before, after, actor, ts)]);
      await this.afterUpdate(recordId, before, after, actor);
      await this.refreshCounters(recordId, actor);
    }
    const { ref_num: _r, ...rest } = after;
    return { ...rest, version: encodeVersion(res._seq_no, res._primary_term) } as InvestigationItem;
  }

  public async bulkUpdateItems(recordId: string, req: BulkUpdateItemsRequest): Promise<BulkUpdateItemsResponse> {
    await this.load(recordId);
    if (req.items.length > INVESTIGATION_LIMITS.maxBulkItems) {
      throw Boom.badRequest(`At most ${INVESTIGATION_LIMITS.maxBulkItems} items per request`);
    }
    const actor = this.actor(req.actor);
    const ts = now();
    const got = await this.es.mget<StoredItem>({ index: INVESTIGATION_ITEMS_INDEX, ids: req.items.map((i) => i.id) });
    const errors: BulkUpdateItemsResponse['errors'] = [];
    const planned: Array<{ before: StoredItem; after: StoredItem; seq: number; term: number }> = [];
    req.items.forEach((change, i) => {
      const doc = got.docs[i] as { found?: boolean; _source?: StoredItem; _seq_no?: number; _primary_term?: number };
      if (!doc.found || !doc._source || doc._source.record_id !== recordId) {
        errors.push({ id: change.id, status: 404, message: 'Not found' });
        return;
      }
      const version = encodeVersion(doc._seq_no, doc._primary_term) as string;
      if (change.version && change.version !== version) {
        errors.push({ id: change.id, status: 409, message: `Item ${doc._source.ref} was changed by someone else` });
        return;
      }
      try {
        planned.push({ before: doc._source, after: this.applyPatch(doc._source, change.patch, actor, ts), seq: doc._seq_no ?? 0, term: doc._primary_term ?? 0 });
      } catch (error) {
        errors.push({ id: change.id, status: error?.output?.statusCode ?? 400, message: error.message });
      }
    });
    const updated: InvestigationItem[] = [];
    if (planned.length) {
      const res = await this.es.bulk({
        refresh: true,
        operations: planned.flatMap((p) => [
          { index: { _index: INVESTIGATION_ITEMS_INDEX, _id: p.after.id, if_seq_no: p.seq, if_primary_term: p.term } },
          p.after,
        ]),
      });
      const done: typeof planned = [];
      res.items.forEach((entry, i) => {
        const op = entry.index;
        if (op?.error) {
          errors.push({ id: planned[i].after.id, status: op.status, message: op.error.reason ?? op.error.type });
        } else {
          done.push(planned[i]);
          const { ref_num: _r, ...rest } = planned[i].after;
          updated.push({ ...rest, version: encodeVersion(op?._seq_no, op?._primary_term) } as InvestigationItem);
        }
      });
      const layoutOnly = req.items.every((change) => isLayoutOnly(change.patch));
      if (layoutOnly) {
        return { items: updated, errors };
      }
      if (done.length === 1) {
        await this.appendActivity(recordId, [this.describeUpdate(done[0].before, done[0].after, actor, ts)]);
      } else if (done.length > 1) {
        const statuses = Array.from(new Set(done.map((d) => d.after.status).filter(Boolean)));
        await this.appendActivity(recordId, [
          {
            ts,
            actor,
            action: 'items.updated',
            message: `Updated ${plural(done.length, 'item')}${statuses.length === 1 ? ` to ${statuses[0]}` : ''}`,
            details: done.slice(0, 10).map((d) => d.before.ref).join(', ') + (done.length > 10 ? ', …' : ''),
            links: [],
          },
        ]);
      }
      for (const d of done) await this.afterUpdate(recordId, d.before, d.after, actor);
      await this.refreshCounters(recordId, actor);
    }
    return { items: updated, errors };
  }

  public async bulkDeleteItems(recordId: string, ids: string[]): Promise<{ deleted: number }> {
    await this.load(recordId);
    const actor = this.actor();
    const got = await this.es.mget<StoredItem>({ index: INVESTIGATION_ITEMS_INDEX, ids, _source_includes: ['ref', 'title', 'record_id', 'kind'] });
    const owned = got.docs
      .map((d) => d as { found?: boolean; _id: string; _source?: StoredItem })
      .filter((d) => d.found && d._source?.record_id === recordId);
    if (!owned.length) return { deleted: 0 };
    const res = await this.es.deleteByQuery({
      index: INVESTIGATION_ITEMS_INDEX,
      refresh: true,
      query: { bool: { filter: [term('record_id', recordId), terms('id', owned.map((d) => d._id))] } },
    });
    await this.appendActivity(recordId, [
      {
        ts: now(),
        actor,
        action: 'items.deleted',
        message: owned.length === 1 ? `Removed ${describeItem(owned[0]._source as StoredItem)}` : `Removed ${plural(owned.length, 'item')}`,
        details: owned.length > 1 ? owned.slice(0, 10).map((d) => d._source?.ref).join(', ') : null,
        before: owned.map((d) => ({ id: d._id, ref: d._source?.ref, title: d._source?.title })),
        links: [],
      },
    ]);
    await this.refreshCounters(recordId, actor);
    return { deleted: res.deleted ?? owned.length };
  }

  /* ---------------------------------------------------------------- */
  /* Evidence import, export, preservation, files                     */
  /* ---------------------------------------------------------------- */

  public async importIndicators(recordId: string, csv: string): Promise<ImportIndicatorsResponse> {
    const { record } = await this.load(recordId);
    const actor = this.actor();
    const rows = parseCsv(csv);
    if (!rows.length) throw Boom.badRequest('The CSV is empty');
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const hasHeader = header.includes('value') || header.includes('indicator');
    const valueIdx = hasHeader ? Math.max(header.indexOf('value'), header.indexOf('indicator')) : 0;
    const typeIdx = hasHeader ? Math.max(header.indexOf('type'), header.indexOf('indicator_type')) : -1;
    const whyIdx = hasHeader ? Math.max(header.indexOf('why'), header.indexOf('note'), header.indexOf('description')) : -1;
    const data = hasHeader ? rows.slice(1) : rows;
    const errors: ImportIndicatorsResponse['errors'] = [];
    const seen = new Set<string>();
    const parsed: Array<{ value: string; type: ReturnType<typeof parseIndicatorType>; why: string | null }> = [];
    data.forEach((row, i) => {
      const value = (row[valueIdx] ?? '').trim();
      const line = i + (hasHeader ? 2 : 1);
      if (!value) {
        errors.push({ line, message: 'Missing value' });
        return;
      }
      if (value.length > 2048) {
        errors.push({ line, message: 'Value is longer than 2048 characters' });
        return;
      }
      const key = value.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      parsed.push({ value, type: parseIndicatorType(typeIdx >= 0 ? row[typeIdx] : undefined, value), why: whyIdx >= 0 ? (row[whyIdx] ?? '').trim() || null : null });
    });
    const existing = new Set<string>();
    for (let i = 0; i < parsed.length; i += 1000) {
      const chunk = parsed.slice(i, i + 1000).map((p) => p.value.toLowerCase());
      const res = await this.es.search({
        index: INVESTIGATION_ITEMS_INDEX,
        size: 0,
        query: { bool: { filter: [term('record_id', recordId), terms('evidence.indicator.value', chunk)] } },
        aggs: { v: { terms: { field: 'evidence.indicator.value', size: chunk.length } } },
      });
      buckets(res.aggregations?.v).forEach((b) => existing.add(b.key));
    }
    const fresh = parsed.filter((p) => !existing.has(p.value.toLowerCase()));
    const skippedDuplicates = data.length - errors.length - fresh.length;
    let created = 0;
    for (let i = 0; i < fresh.length; i += 1000) {
      const chunk = fresh.slice(i, i + 1000);
      const res = await this.bulkCreateItemsInternal(
        record,
        chunk.map((p) => ({
          kind: 'evidence',
          title: p.value,
          evidence: {
            type: 'indicator',
            why: p.why,
            source: { label: 'CSV import', kind: 'manual' },
            indicator: { type: p.type, value: p.value },
          },
        })),
        actor,
        { silent: true }
      );
      created += res.items.length;
      res.errors.forEach((e) => errors.push({ line: i + e.index + 2, message: e.message }));
    }
    await this.appendActivity(recordId, [
      {
        ts: now(),
        actor,
        action: 'evidence.imported',
        message: `Imported ${plural(created, 'indicator')} from a CSV file`,
        details: skippedDuplicates ? `${plural(skippedDuplicates, 'duplicate')} skipped.` : null,
        links: [{ kind: 'tab', id: 'evidence', label: 'Evidence' }],
      },
    ]);
    await this.refreshCounters(recordId, actor);
    return { created, skipped_duplicates: Math.max(skippedDuplicates, 0), errors };
  }

  public async exportItems(recordId: string, req: ExportItemsRequest): Promise<{ body: string; contentType: string; filename: string }> {
    const { record } = await this.load(recordId);
    const { query, postFilter } = this.buildItemQuery(recordId, { ...req, kind: req.kind?.length ? req.kind : ['evidence'] });
    const rows: EvidenceItem[] = [];
    let searchAfter: Array<string | number> | undefined;
    while (rows.length < 50000) {
      const res = await this.es.search<StoredItem>({
        index: INVESTIGATION_ITEMS_INDEX,
        size: 1000,
        query: postFilter.length ? { bool: { filter: [query, ...postFilter] } } : query,
        sort: [{ ref_num: { order: 'asc' } }, { id: { order: 'asc' } }],
        ...(searchAfter ? { search_after: searchAfter } : {}),
      });
      const hits = res.hits.hits;
      rows.push(...hits.map((h) => this.toItem(h) as EvidenceItem));
      if (hits.length < 1000) break;
      searchAfter = hits[hits.length - 1].sort as Array<string | number>;
    }
    const value = (e: EvidenceItem) => e.evidence?.indicator?.value ?? e.title;
    const base = `${record.display_id}-evidence`;
    if (req.format === 'json') {
      return {
        contentType: 'application/json',
        filename: `${base}.json`,
        body: JSON.stringify(
          rows.map((e) => ({
            id: e.ref,
            type: e.evidence ? EVIDENCE_TYPE_LABELS[e.evidence.type] : e.kind,
            indicator_type: e.evidence?.indicator ? INDICATOR_TYPE_LABELS[e.evidence.indicator.type] : null,
            value: value(e),
            added_by: e.created_by.name,
            added: e.created_at,
            source: e.evidence?.source?.label ?? null,
            why: e.evidence?.why ?? null,
            sha256: e.evidence?.snapshot_hash ?? null,
          })),
          null,
          2
        ),
      };
    }
    if (req.format === 'list') {
      return { contentType: 'text/plain', filename: `${base}.txt`, body: rows.map(value).join('\n') };
    }
    if (req.format === 'stix') {
      const pattern = (e: EvidenceItem): string | null => {
        const ind = e.evidence?.indicator;
        if (!ind) return null;
        const v = ind.value.replace(/'/g, "\\'");
        switch (ind.type) {
          case 'ip':
            return v.includes(':') ? `[ipv6-addr:value = '${v}']` : `[ipv4-addr:value = '${v}']`;
          case 'domain':
            return `[domain-name:value = '${v}']`;
          case 'url':
            return `[url:value = '${v}']`;
          case 'email':
            return `[email-addr:value = '${v}']`;
          case 'file_hash':
            return v.length === 64 ? `[file:hashes.'SHA-256' = '${v}']` : v.length === 40 ? `[file:hashes.'SHA-1' = '${v}']` : `[file:hashes.MD5 = '${v}']`;
          case 'file_path':
            return `[file:name = '${v.split(/[\\/]/).pop()}']`;
          case 'registry_key':
            return `[windows-registry-key:key = '${v}']`;
          default:
            return null;
        }
      };
      const created = now();
      const objects = rows
        .map((e) => ({ e, p: pattern(e) }))
        .filter((x): x is { e: EvidenceItem; p: string } => !!x.p)
        .map(({ e, p }) => ({
          type: 'indicator',
          spec_version: '2.1',
          id: `indicator--${e.id}`,
          created: e.created_at,
          modified: e.updated_at,
          name: value(e),
          description: e.evidence?.why ?? undefined,
          pattern: p,
          pattern_type: 'stix',
          valid_from: e.created_at,
          labels: [record.display_id],
        }));
      return {
        contentType: 'application/json',
        filename: `${base}.stix.json`,
        body: JSON.stringify({ type: 'bundle', id: `bundle--${uuidv4()}`, objects, created }, null, 2),
      };
    }
    const header = 'id,type,indicator_type,value,added_by,added,source,why,sha256';
    const lines = rows.map((e) =>
      [
        e.ref,
        e.evidence ? EVIDENCE_TYPE_LABELS[e.evidence.type] : e.kind,
        e.evidence?.indicator ? INDICATOR_TYPE_LABELS[e.evidence.indicator.type] : '',
        value(e),
        e.created_by.name,
        e.created_at,
        e.evidence?.source?.label ?? '',
        e.evidence?.why ?? '',
        e.evidence?.snapshot_hash ?? '',
      ]
        .map(toCsvCell)
        .join(',')
    );
    return { contentType: 'text/csv', filename: `${base}.csv`, body: [header, ...lines].join('\n') };
  }

  public async preserve(recordId: string, ids: string[]): Promise<InvestigationItem[]> {
    await this.load(recordId);
    const actor = this.actor();
    const ts = now();
    const got = await this.es.mget<StoredItem>({ index: INVESTIGATION_ITEMS_INDEX, ids });
    const updates: Array<{ id: string; version: string; patch: ItemPatch }> = [];
    for (const raw of got.docs) {
      const doc = raw as { found?: boolean; _id: string; _source?: StoredItem; _seq_no?: number; _primary_term?: number };
      if (!doc.found || !doc._source || doc._source.record_id !== recordId || doc._source.kind !== 'evidence') continue;
      const item = doc._source as unknown as EvidenceItem & { ref_num: number };
      let snapshot = item.evidence.snapshot ?? null;
      if (item.evidence.type === 'alert' && item.evidence.alert?.id && item.evidence.alert.index) {
        const res = await this.deps.scopedEsClient
          .search<Record<string, unknown>>({ index: item.evidence.alert.index, size: 1, query: { ids: { values: [item.evidence.alert.id] } } })
          .catch(() => undefined);
        const src = res?.hits.hits[0]?._source as Record<string, unknown> | undefined;
        if (src) {
          const get = (path: string): unknown => path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] ?? (o as Record<string, unknown>)[path] : undefined), src) ?? src[path];
          const str = (v: unknown) => (v === undefined || v === null ? '' : Array.isArray(v) ? v.join(', ') : String(v));
          snapshot = {
            kind: 'alert',
            severity: str(get('kibana.alert.severity')),
            risk_score: Number(get('kibana.alert.risk_score') ?? 0),
            timestamp: str(get('@timestamp')),
            rule: str(get('kibana.alert.rule.name')),
            description: str(get('kibana.alert.rule.description')),
            reason: str(get('kibana.alert.reason')),
            mitre: [],
            fields: ['host.name', 'user.name', 'process.name', 'process.parent.name', 'source.ip', 'destination.ip', 'kibana.alert.workflow_status']
              .map((f) => [f, str(get(f))] as [string, string])
              .filter(([, v]) => v),
          };
        }
      }
      if (!snapshot) continue;
      updates.push({
        id: doc._id,
        version: encodeVersion(doc._seq_no, doc._primary_term) as string,
        patch: { evidence: { snapshot, snapshot_hash: hashSnapshot(snapshot), preserved_at: ts } },
      });
    }
    if (!updates.length) return [];
    const res = await this.bulkUpdateItems(recordId, { items: updates, actor });
    await this.appendActivity(recordId, [
      { ts, actor, action: 'evidence.preserved', message: `Preserved copies of ${plural(res.items.length, 'item')}`, details: res.items.map((i) => i.ref).join(', '), links: [] },
    ]);
    return res.items;
  }

  public async addFileEvidence(
    recordId: string,
    file: { buffer: Buffer; filename: string; mimeType?: string },
    why: string | null
  ): Promise<InvestigationItem> {
    const { record } = await this.load(recordId);
    const actor = this.actor();
    const { Readable } = await import('stream');
    const digest = sha256(file.buffer);
    const attachment = await this.deps.casesClient.attachments.addFile({
      caseId: recordId,
      file: Readable.from(file.buffer) as unknown as Parameters<CasesClient['attachments']['addFile']>[0]['file'],
      filename: file.filename.replace(/\.[^.]+$/, ''),
      mimeType: file.mimeType,
    });
    const att = attachment as unknown as { id: string; attachmentId?: string | string[] };
    const fileId = Array.isArray(att.attachmentId) ? att.attachmentId[0] : att.attachmentId ?? att.id;
    const size = file.buffer.length;
    const human = size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`;
    const { items } = await this.bulkCreateItemsInternal(
      record,
      [
        {
          kind: 'evidence',
          title: file.filename,
          evidence: {
            type: 'file',
            why,
            source: { label: 'Upload', kind: 'file', file_id: fileId, id: att.id },
            snapshot: { kind: 'file', name: file.filename, size: human, sha256: digest, mime_type: file.mimeType },
            snapshot_hash: digest,
          },
        },
      ],
      actor
    );
    await this.refreshCounters(recordId, actor);
    return items[0];
  }

  /* ---------------------------------------------------------------- */
  /* Cross-record                                                      */
  /* ---------------------------------------------------------------- */

  private async otherRecordsMatching(
    values: { indicators: string[]; entities: string[]; alerts: string[] },
    excludeIds: string[],
    size = 20
  ): Promise<RelatedRecord[]> {
    const should: QueryDslQueryContainer[] = [];
    if (values.indicators.length) should.push(terms('evidence.indicator.value', values.indicators.map((v) => v.toLowerCase())));
    if (values.entities.length) should.push(terms('entity.name', values.entities.map((v) => v.toLowerCase())));
    if (values.alerts.length) should.push(terms('evidence.alert.id', values.alerts));
    if (!should.length) return [];
    const res = await this.es.search({
      index: INVESTIGATION_ITEMS_INDEX,
      size: 0,
      query: {
        bool: {
          filter: [term('space_id', this.deps.spaceId)],
          must_not: excludeIds.length ? [terms('record_id', excludeIds)] : [],
          should,
          minimum_should_match: 1,
        },
      },
      aggs: {
        records: {
          terms: { field: 'record_id', size: size * 2 },
          aggs: {
            ind: { terms: { field: 'evidence.indicator.value', size: 5, ...(values.indicators.length ? { include: values.indicators.map((v) => v.toLowerCase()) } : {}) } },
            ent: { terms: { field: 'entity.name', size: 5, ...(values.entities.length ? { include: values.entities.map((v) => v.toLowerCase()) } : {}) } },
            alr: { filter: values.alerts.length ? terms('evidence.alert.id', values.alerts) : { match_none: {} } },
          },
        },
      },
    });
    const recBuckets = buckets(res.aggregations?.records) as Array<Bucket & Record<string, AggregationsAggregate>>;
    if (!recBuckets.length) return [];
    const docs = await this.es.mget<StoredRecord>({ index: INVESTIGATION_RECORDS_INDEX, ids: recBuckets.map((b) => b.key) });
    const byId = new Map(
      docs.docs
        .map((d) => d as { found?: boolean; _id: string; _source?: StoredRecord })
        .filter((d) => d.found && d._source && d._source.space_id === this.deps.spaceId && this.canRead(d._source))
        .map((d) => [d._id, d._source as StoredRecord])
    );
    return recBuckets
      .filter((b) => byId.has(b.key))
      .map((b) => {
        const r = byId.get(b.key) as StoredRecord;
        const ind = buckets(b.ind).map((x) => x.key).filter((k) => values.indicators.length);
        const ent = buckets(b.ent).map((x) => x.key).filter(() => values.entities.length);
        const alr = filterCount(b.alr);
        const reasons: RelatedRecord['reasons'] = [
          ...ent.map((v) => ({ type: 'entity' as const, value: v })),
          ...ind.map((v) => ({ type: 'indicator' as const, value: v })),
          ...(alr ? [{ type: 'alert' as const, value: plural(alr, 'shared alert') }] : []),
        ];
        return {
          record: {
            id: r.id,
            display_id: r.display_id,
            title: r.title,
            status: r.status,
            priority: r.priority,
            created_at: r.created_at,
            updated_at: r.updated_at,
            owner: r.owner ?? null,
            close_outcome: r.close_outcome ?? null,
            counters: { ...emptyCounters(), ...(r.counters ?? {}) },
            summary: r.summary ?? null,
            origin: r.origin,
          },
          reasons,
          shared_values: [...ent, ...ind],
        };
      })
      .sort((x, y) => y.reasons.length - x.reasons.length)
      .slice(0, size);
  }

  /** Every indicator value, entity name and alert id on a record (composite paging, capped). */
  private async recordValues(recordId: string): Promise<{ indicators: string[]; entities: string[]; alerts: string[] }> {
    const collect = async (field: string, filter: QueryDslQueryContainer, cap: number): Promise<string[]> => {
      const out: string[] = [];
      let after: Record<string, string | number | null> | undefined;
      while (out.length < cap) {
        const res = await this.es.search({
          index: INVESTIGATION_ITEMS_INDEX,
          size: 0,
          query: { bool: { filter: [term('record_id', recordId), filter] } },
          aggs: { v: { composite: { size: 2000, sources: [{ v: { terms: { field } } }], ...(after ? { after } : {}) } } },
        });
        const agg = res.aggregations?.v as { buckets: Array<{ key: { v: string } }>; after_key?: Record<string, string> } | undefined;
        const page = agg?.buckets ?? [];
        out.push(...page.map((b) => b.key.v));
        if (page.length < 2000 || !agg?.after_key) break;
        after = agg.after_key;
      }
      return out.slice(0, cap);
    };
    const [indicators, entities, alerts] = await Promise.all([
      collect('evidence.indicator.value', { exists: { field: 'evidence.indicator.value' } }, 10000),
      collect('entity.name', { bool: { filter: [term('kind', 'entity')], must_not: [term('status', 'dismissed')] } }, 2000),
      collect('evidence.alert.id', { exists: { field: 'evidence.alert.id' } }, 10000),
    ]);
    return { indicators, entities, alerts };
  }

  public async related(recordId: string): Promise<RelatedRecordsResponse> {
    const { record } = await this.load(recordId);
    const values = await this.recordValues(recordId);
    const exclude = [recordId, ...(record.merged_from ?? []), ...(record.merged_into ? [record.merged_into] : [])];
    const related = await this.otherRecordsMatching(values, exclude);
    const mergedIds = [...(record.merged_from ?? []), ...(record.merged_into ? [record.merged_into] : [])];
    if (mergedIds.length) {
      const docs = await this.es.mget<StoredRecord>({ index: INVESTIGATION_RECORDS_INDEX, ids: mergedIds });
      for (const raw of docs.docs) {
        const d = raw as { found?: boolean; _source?: StoredRecord };
        if (!d.found || !d._source || !this.canRead(d._source)) continue;
        const r = d._source;
        related.unshift({
          record: { id: r.id, display_id: r.display_id, title: r.title, status: r.status, priority: r.priority, created_at: r.created_at, updated_at: r.updated_at, owner: r.owner ?? null, close_outcome: r.close_outcome ?? null, counters: { ...emptyCounters(), ...(r.counters ?? {}) }, summary: r.summary ?? null, origin: r.origin },
          reasons: [{ type: 'merged', value: r.merged_into === recordId ? 'Merged into this investigation' : 'This investigation was merged into it' }],
          shared_values: [],
        });
      }
    }
    return { related };
  }

  public async findDuplicates(req: DuplicateCheckRequest): Promise<{ related: RelatedRecord[] }> {
    await this.ensureCanReadOwner();
    const related = await this.otherRecordsMatching(
      { indicators: req.indicator_values ?? [], entities: req.entity_names ?? [], alerts: req.alert_ids ?? [] },
      req.exclude_record_id ? [req.exclude_record_id] : [],
      10
    );
    const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
    return {
      related: related.filter(
        (r) => r.record.status !== 'closed' || Date.parse(r.record.close_outcome?.closed_at ?? r.record.updated_at) >= cutoff
      ),
    };
  }

  public async lookupIndicators(values: string[], excludeRecordId?: string): Promise<IndicatorLookupResponse> {
    await this.ensureCanReadOwner();
    const lower = Array.from(new Set(values.map((v) => v.toLowerCase()))).slice(0, 500);
    if (!lower.length) return { values: {} };
    const res = await this.es.search({
      index: INVESTIGATION_ITEMS_INDEX,
      size: 0,
      query: {
        bool: {
          filter: [term('space_id', this.deps.spaceId), terms('evidence.indicator.value', lower)],
          must_not: excludeRecordId ? [term('record_id', excludeRecordId)] : [],
        },
      },
      aggs: {
        v: {
          terms: { field: 'evidence.indicator.value', size: lower.length },
          aggs: { r: { terms: { field: 'record_id', size: 20 } } },
        },
      },
    });
    const valueBuckets = buckets(res.aggregations?.v) as Array<Bucket & { r: AggregationsAggregate }>;
    const recordIds = Array.from(new Set(valueBuckets.flatMap((b) => buckets(b.r).map((x) => x.key))));
    const records = new Map<string, StoredRecord>();
    if (recordIds.length) {
      const docs = await this.es.mget<StoredRecord>({
        index: INVESTIGATION_RECORDS_INDEX,
        ids: recordIds,
        _source_includes: ['id', 'display_id', 'title', 'space_id', 'restricted_to'],
      });
      for (const raw of docs.docs) {
        const d = raw as { found?: boolean; _id: string; _source?: StoredRecord };
        if (d.found && d._source && d._source.space_id === this.deps.spaceId && this.canRead(d._source)) records.set(d._id, d._source);
      }
    }
    const out: IndicatorLookupResponse['values'] = {};
    for (const b of valueBuckets) {
      const recs = buckets(b.r)
        .map((x) => records.get(x.key))
        .filter((r): r is StoredRecord => !!r)
        .map((r) => ({ id: r.id, display_id: r.display_id, title: r.title }));
      out[b.key] = { count: recs.length, records: recs.slice(0, 5) };
    }
    return { values: out };
  }

  /* ---------------------------------------------------------------- */
  /* Since last handoff, history, report, threads                      */
  /* ---------------------------------------------------------------- */

  public async since(recordId: string, sinceParam?: string): Promise<SinceLastHandoffResponse> {
    const { record } = await this.load(recordId);
    const since = sinceParam ?? record.last_handoff?.at ?? null;
    if (!since) return { since: null, handoff_by: null, items: [] };
    const out: SinceLastHandoffResponse['items'] = [];
    const counters = { ...emptyCounters(), ...(record.counters ?? {}) };
    const recent = await this.es.search({
      index: INVESTIGATION_ITEMS_INDEX,
      size: 0,
      query: { bool: { filter: [term('record_id', recordId), term('kind', 'evidence'), { range: { created_at: { gt: since } } }] } },
      aggs: {
        type: { terms: { field: 'evidence.type', size: 20 } },
        rules: { terms: { field: 'evidence.alert.rule_name', size: 1 } },
        ind: { terms: { field: 'evidence.indicator.type', size: 3 } },
      },
    });
    const aggs = recent.aggregations ?? {};
    const byType = toMap(buckets(aggs.type));
    if (byType.alert) {
      const rule = buckets(aggs.rules)[0];
      out.push({
        key: 'alerts',
        headline: `+${byType.alert.toLocaleString('en-US')} alerts, ${counters.alerts.toLocaleString('en-US')} in total`,
        detail: rule ? `Most are "${rule.key}" alerts.` : 'New alerts were attached.',
        target: { kind: 'tab', id: 'evidence', label: 'Evidence' },
      });
    }
    if (byType.indicator) {
      const kinds = buckets(aggs.ind).map((b) => `${b.doc_count} ${INDICATOR_TYPE_LABELS[b.key as keyof typeof INDICATOR_TYPE_LABELS]?.toLowerCase() ?? b.key}`);
      out.push({
        key: 'indicators',
        headline: `+${byType.indicator.toLocaleString('en-US')} indicators, ${counters.indicators.toLocaleString('en-US')} in total`,
        detail: kinds.length ? `Including ${kinds.join(', ')}.` : 'New indicators were added.',
        target: { kind: 'tab', id: 'evidence', label: 'Review new evidence' },
      });
    }
    const verdicts = await this.es.search<ActivityEntry>({
      index: INVESTIGATION_ACTIVITY_INDEX,
      size: 50,
      query: { bool: { filter: [term('record_id', recordId), term('action', 'record.agent_verdict_changed'), { range: { ts: { gt: since } } }] } },
      sort: [{ ts: { order: 'asc' } }],
    });
    const vh = verdicts.hits.hits.map((h) => h._source as ActivityEntry);
    if (vh.length) {
      const first = vh[0].before as { confidence?: number } | null;
      const last = vh[vh.length - 1];
      const after = last.after as { confidence?: number; label?: string } | null;
      const from = first?.confidence;
      const to = after?.confidence;
      out.push({
        key: 'verdict',
        headline:
          from !== undefined && to !== undefined
            ? `The verdict ${to >= from ? 'rose' : 'fell'} from ${from}% to ${to}%`
            : `The verdict changed to ${after?.label ?? 'a new value'}`,
        detail: last.details ?? last.message,
        target: { kind: 'tab', id: 'overview', label: 'Verdict' },
      });
    }
    const stale = await this.searchItems<ClaimItem>(recordId, { bool: { filter: [term('kind', 'claim'), { exists: { field: 'claim.stale_reason' } }] } }, 20);
    if (stale.length) {
      out.push({
        key: 'stale_claims',
        headline: `${plural(stale.length, 'conclusion')} may no longer hold`,
        detail: stale.map((c) => `${c.ref} ${c.claim.stale_reason}`).join('. '),
        target: { kind: 'claim', id: stale[0].id, label: `Check ${stale[0].ref}` },
      });
    }
    if (!record.owner) {
      const left = await this.es.search<ActivityEntry>({
        index: INVESTIGATION_ACTIVITY_INDEX,
        size: 1,
        query: { bool: { filter: [term('record_id', recordId), term('action', 'record.owner_changed')] } },
        sort: [{ ts: { order: 'desc' } }],
      });
      const at = left.hits.hits[0]?._source?.ts;
      const days = at ? Math.max(1, Math.round((Date.now() - Date.parse(at)) / 86400000)) : null;
      out.push({
        key: 'owner',
        headline: 'The owner left',
        detail: days ? `Nobody has owned this for ${plural(days, 'day')}.` : 'Nobody owns this investigation.',
        target: { kind: 'tab', id: 'activity', label: 'Activity' },
      });
    }
    return { since, handoff_by: record.last_handoff?.by ?? null, items: out };
  }

  public async history(recordId: string, targetId?: string): Promise<ChangeHistoryResponse> {
    const { record } = await this.load(recordId);
    const filter: QueryDslQueryContainer[] = [terms('record_id', [recordId, ...(record.merged_from ?? [])]), terms('action', HISTORY_ACTIONS)];
    if (targetId) filter.push(term('target.id', targetId));
    const res = await this.es.search<ActivityEntry>({
      index: INVESTIGATION_ACTIVITY_INDEX,
      size: 200,
      query: { bool: { filter } },
      sort: [{ ts: { order: 'desc' } }],
    });
    const versions: ChangeHistoryResponse['versions'] = [];
    for (const hit of res.hits.hits) {
      const e = hit._source as ActivityEntry;
      const after = e.after as unknown;
      let text: string | null = null;
      let what = 'Description';
      if (e.action === 'record.created') {
        text = (after as { description?: string } | null)?.description ?? null;
      } else if (e.action === 'record.description_changed') {
        text = typeof after === 'string' ? after : null;
      } else if (e.action === 'record.summary_changed') {
        what = 'Summary';
        text = typeof after === 'string' ? after : null;
      } else if (e.action === 'record.closed') {
        what = 'Closing summary';
        text = typeof after === 'string' ? after : e.details ?? null;
      } else if (e.action === 'claim.conclusion_changed') {
        what = `Conclusion ${e.target?.ref ?? ''}`.trim();
        text = typeof after === 'string' ? after : null;
      } else if (e.action === 'item.text_changed') {
        what = `Note ${e.target?.ref ?? ''}`.trim();
        text = typeof after === 'string' ? after : null;
      }
      if (text) versions.push({ ts: e.ts, actor: e.actor, what, text, target_id: e.target?.id ?? null });
    }
    return { versions };
  }

  public async report(recordId: string): Promise<ReportResponse> {
    const { record } = await this.load(recordId);
    const [claims, proposals, tasks, timeline, activity, counters] = await Promise.all([
      this.searchItems<ClaimItem>(recordId, term('kind', 'claim'), 500),
      this.searchItems<ProposalItem>(recordId, term('kind', 'proposal'), 500),
      this.searchItems<TaskItem>(recordId, term('kind', 'task'), 500),
      this.es.search<StoredItem>({
        index: INVESTIGATION_ITEMS_INDEX,
        size: 500,
        query: { bool: { filter: [term('record_id', recordId), term('kind', 'timeline_event')] } },
        sort: [{ 'timeline_event.occurred_at': { order: 'asc' } }],
      }),
      this.es.search<ActivityEntry>({
        index: INVESTIGATION_ACTIVITY_INDEX,
        size: 100,
        query: terms('record_id', [recordId, ...(record.merged_from ?? [])]),
        sort: [{ ts: { order: 'asc' } }],
      }),
      this.computeCounters(recordId, record.merged_from ?? []),
    ]);
    const markdown = buildReport({
      record: this.toRecord(record),
      counters,
      claims,
      proposals,
      tasks: tasks.sort((a, b) => a.task.order - b.task.order),
      timeline: timeline.hits.hits.map((h) => this.toItem(h)) as InvestigationItem[],
      activity: activity.hits.hits.map((h) => h._source as ActivityEntry),
    });
    return { markdown, filename: `${record.display_id}-report.md` };
  }

  public async createThread(recordId: string, req: CreateThreadRequest): Promise<{ record: InvestigationRecord; thread: ThreadRef }> {
    const { record } = await this.load(recordId);
    const create = this.deps.agent.createConversation;
    const { available, reason } = await this.deps.agent.isAvailable();
    if (!create || !available) {
      throw Boom.badRequest(reason ?? 'Agent Builder is not available, so threads cannot be created.');
    }
    if ((record.threads ?? []).length >= INVESTIGATION_LIMITS.maxThreads) {
      throw Boom.badRequest(`At most ${INVESTIGATION_LIMITS.maxThreads} threads per investigation`);
    }
    const actor = this.actor();
    const conversationId = await create({ title: `${record.display_id}: ${req.title}`, recordId });
    const thread: ThreadRef = { conversation_id: conversationId, title: req.title, created_at: now(), created_by: actor, anchor: req.anchor ?? null };
    await this.es.update({
      index: INVESTIGATION_RECORDS_INDEX,
      id: recordId,
      refresh: true,
      retry_on_conflict: 5,
      script: {
        lang: 'painless',
        source: `
          if (ctx._source.threads == null) { ctx._source.threads = []; }
          ctx._source.threads.add(params.thread);
          if (ctx._source.conversation_ids == null) { ctx._source.conversation_ids = []; }
          ctx._source.conversation_ids.add(params.thread.conversation_id);`,
        params: { thread },
      },
    });
    await this.appendActivity(recordId, [
      {
        ts: thread.created_at,
        actor,
        action: 'thread.created',
        message: `Started a thread: ${clip(req.title, 120)}`,
        details: req.anchor ? `On ${req.anchor}` : null,
        links: [{ kind: 'thread', id: conversationId, label: 'Open thread' }],
      },
    ]);
    await this.refreshCounters(recordId, actor);
    return { record: (await this.getRecord(recordId)).record, thread };
  }

  /* ---------------------------------------------------------------- */
  /* Agent support                                                     */
  /* ---------------------------------------------------------------- */

  /** Finds the record linked to a conversation (main or thread). */
  public async findRecordIdByConversation(conversationId: string): Promise<string | null> {
    const res = await this.es.search<StoredRecord>({
      index: INVESTIGATION_RECORDS_INDEX,
      size: 1,
      _source: ['id'],
      query: { bool: { filter: [term('conversation_ids', conversationId), term('space_id', this.deps.spaceId)] } },
    });
    return res.hits.hits[0]?._source?.id ?? null;
  }

  /** Compact record state for the agent, built from the record and its five newest items. */
  public async buildDigest(recordId: string): Promise<string> {
    const { record } = await this.load(recordId);
    const newest = await this.es.search<StoredItem>({
      index: INVESTIGATION_ITEMS_INDEX,
      size: INVESTIGATION_LIMITS.digestNewestItems,
      query: { bool: { filter: [term('record_id', recordId)], must_not: [term('exclude_from_ai', true), term('kind', 'comment')] } },
      sort: [{ created_at: { order: 'desc' } }],
      _source: { includes: ['ref', 'kind', 'title', 'status', 'created_at', 'created_by.name', 'evidence.type'] },
    });
    const c = { ...emptyCounters(), ...(record.counters ?? {}) };
    const verdict = record.analyst_verdict
      ? `analyst ${VERDICT_LABELS[record.analyst_verdict.verdict]}`
      : record.agent_verdict
      ? `agent "${record.agent_verdict.label}" ${record.agent_verdict.confidence}%`
      : 'not set';
    const lines = [
      `<investigation_digest id="${record.display_id}" record_id="${record.id}" as_of="${now()}">`,
      `Title: ${clip(record.title, 160)}`,
      `Status: ${record.status} | Priority: ${record.priority} | Type: ${record.investigation_type} | Owner: ${record.owner?.name ?? 'none'} | Verdict: ${verdict}`,
      record.summary ? `Summary: ${clip(record.summary, 400)}` : `Description: ${clip(record.description, 300)}`,
      `Evidence: ${c.evidence} (${c.alerts} alerts, ${c.indicators} indicators) | Claims: ${c.claims} (${c.claims_by_status.open ?? 0} open, ${c.claims_by_status.blocked ?? 0} blocked, ${c.claims_needs_review} need review) | Scope: ${c.entities_in_scope} in scope, ${c.entities_suspected} suspected | Tasks: ${c.tasks_done}/${c.tasks - c.tasks_skipped} done, ${c.required_tasks_left} required left | Proposals pending: ${c.proposals_pending}`,
      'Newest items:',
      ...newest.hits.hits.map((h) => {
        const s = h._source as StoredItem & { evidence?: { type?: string } };
        return `- ${s.ref} ${s.kind}${s.evidence?.type ? `/${s.evidence.type}` : ''}${s.status ? ` [${s.status}]` : ''}: ${clip(s.title, 100)} (${s.created_by?.name ?? '?'})`;
      }),
      'Read more with the investigation tools, one page at a time. Refer to items by ref (E12, C3, T5).',
      '</investigation_digest>',
    ];
    return lines.join('\n');
  }
}
