/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timeoutSignal } from '@kbn/std';
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
  COMMENT_ATTACHMENT_TYPE,
  MAX_ASSIGNEES_PER_CASE,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
} from '../../common/constants';
import { CaseMetricsFeature } from '../../common/types/api';
import {
  INVESTIGATION_ACTIVITY_INDEX,
  INVESTIGATION_CONFIG_INDEX,
  INVESTIGATION_ITEMS_INDEX,
  INVESTIGATION_LIMITS,
  INVESTIGATION_RECORDS_INDEX,
  INVESTIGATIONS_OWNER,
  ITEM_REF_PREFIX,
  MAX_TASKS_PER_CASE,
  MAX_COMMENTS_PER_TASK,
  TASK_SORT_ORDER_GAP,
} from '../../common/investigations/constants';
import type {
  ActivityEntry,
  ActivityOrigin,
  AgentVerdict,
  AiVerdict,
  DueWithin,
  InvestigationSource,
  RecordOrigin,
  AddCommentRequest,
  FindCommentsRequest,
  FindCommentsResponse,
  RecordComment,
  UpdateCommentRequest,
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
  ExternalTicketResponse,
  ExternalTicketSync,
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
  InvestigationTimings,
  InvestigationType,
  ItemFacets,
  ItemInput,
  ItemKind,
  ItemPatch,
  LinkRecordResponse,
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
  TaskWorkflowRun,
  ThreadRef,
  UpdateExternalTicketRequest,
  UpdateItemRequest,
  UpdateRecordRequest,
  Verdict,
} from '../../common/investigations/types';
import {
  VERDICT_LABELS,
  CLOSE_REASON_TO_VERDICT,
  isTaskFinished,
  EVIDENCE_TYPE_LABELS,
} from '../../common/investigations/types';
import { DEFAULT_PROCEDURE_TEMPLATES } from './default_templates';
import type {
  CaseStatusConfiguration,
  PauseFields,
  StatusesConfiguration,
} from '../../common/investigations/statuses';
import {
  findStatusByKey,
  getDefaultStatus,
  getEffectiveStatuses,
  getPauseFieldsForUpdate,
  getPausedSeconds,
  getRecordStatus,
  StatusRuleError,
  validatePauseReasons,
  validateStatusesConfiguration,
} from '../../common/investigations/statuses';
import {
  buildFieldsMirror,
  getMirrorKey,
  INVESTIGATION_TYPE_TEMPLATE_TAG,
  parseCaseFieldErrors,
} from '../../common/investigations/template_fields';
import {
  PRIORITY_RANK,
  clip,
  decodeCursor,
  decodeVersion,
  encodeCursor,
  encodeVersion,
  hashSnapshot,
  parseCsv,
  plural,
  sha256,
  toCsvCell,
} from './utils';
import {
  getObservableTypes,
  getObservableTypeLabel,
  indicatorStixPattern,
  resolveIndicatorForWrite,
} from './indicator_types';
import {
  expandIndicatorTypeFilter,
  matchIndicatorTypeKey,
  resolveIndicatorTypeKey,
} from '../../common/investigations/observable_types';
import {
  getObservablesFromEcs,
  getHashFields,
} from '../../common/observables/get_observables_from_ecs';
import type { FlattedEcsData } from '../../common/observables/get_observables_from_ecs';
import { buildReport } from './report';

type StoredRecord = Omit<InvestigationRecord, 'version'> & {
  ref_counters?: Record<string, number>;
  verdict_effective?: Verdict | null;
  priority_rank?: number;
};
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type StoredItem = DistributiveOmit<InvestigationItem, 'version'> & { ref_num: number };

export interface AlertsClientLike {
  bulkUpdateCases(args: {
    alerts: Array<{ id: string; index: string }>;
    caseIds: string[];
  }): Promise<unknown>;
  bulkUpdate(args: {
    ids: string[];
    status: 'open' | 'closed' | 'acknowledged';
    index: string;
  }): Promise<unknown>;
  removeCaseIdFromAlerts(args: {
    alerts: Array<{ id: string; index: string }>;
    caseId: string;
  }): Promise<unknown>;
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
  /** Resolves user profile uids (case assignees) to names. */
  getUserProfiles: (
    uids: string[]
  ) => Promise<Array<{ uid: string; username: string; fullName: string }>>;
  /** Whether the caller may change investigation settings (Cases `updateConfiguration`). */
  canManageSettings: () => Promise<boolean>;
  /** Whether the caller holds the Cases update privilege for the investigations owner. */
  canUpdateCases: () => Promise<boolean>;
  agent: {
    isAvailable: () => Promise<{ available: boolean; reason?: string }>;
    createConversation?: (args: { title: string; recordId: string }) => Promise<string>;
    agentId: string;
    agentName: string;
  };
  /** Cases' workflow execution, for tasks that run a workflow. Unset when Workflows is not installed. */
  workflows?: TaskWorkflowDeps;
}

export interface TaskWorkflowExecution {
  status: 'running' | 'succeeded' | 'failed';
  error?: string | null;
  workflowName?: string | null;
  finishedAt?: string | null;
}

export interface TaskWorkflowDeps {
  isAvailable: () => boolean;
  /** Whether the caller holds the Workflows execute privilege (the one the Cases run-workflow route needs). */
  canExecute: () => Promise<boolean>;
  /** Starts the workflow for the case through the same path as the Cases run-workflow route. */
  run: (args: { workflowId: string; caseId: string }) => Promise<{ executionId: string }>;
  /** Null when the execution cannot be found or read. */
  getExecution: (executionId: string) => Promise<TaskWorkflowExecution | null>;
}

/** A run that can no longer be found after this long is reported as failed. */
const TASK_WORKFLOW_LOST_AFTER_MS = 10 * 60_000;

const now = (): string => new Date().toISOString();
const sameEntries = (a: Record<string, unknown>, b: Record<string, unknown>): boolean => {
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => JSON.stringify(a[key]) === JSON.stringify(b[key]))
  );
};
/** An investigation write that changed the case: its actions are relabelled with this actor and time. */
interface OwnCaseWrite {
  startedAt: string;
  actor: Actor;
  ts: string;
  /** Action types already described by a record-level activity entry. */
  skipTypes?: string[];
  /** Details to attach to the entry of an action type (e.g. the priority note). */
  details?: Record<string, string>;
}
const commentContent = (attachment: unknown): string | null => {
  const value = attachment as { data?: { content?: unknown }; comment?: unknown };
  if (typeof value.data?.content === 'string') return value.data.content;
  if (typeof value.comment === 'string') return value.comment;
  return null;
};
const toRecordComment = (attachment: unknown): RecordComment => {
  const value = attachment as {
    id: string;
    version: string;
    created_at: string;
    created_by?: { username?: string | null; full_name?: string | null; profile_uid?: string };
    updated_at?: string | null;
  };
  return {
    id: value.id,
    version: value.version,
    content: commentContent(attachment) ?? '',
    created_at: value.created_at,
    created_by: {
      username: value.created_by?.username ?? null,
      full_name: value.created_by?.full_name ?? null,
      profile_uid: value.created_by?.profile_uid ?? null,
    },
    updated_at: value.updated_at ?? null,
  };
};
type CaseUserAction = Awaited<
  ReturnType<CasesClient['userActions']['find']>
>['userActions'][number];
const CASE_STATUS_WORDS: Record<string, string> = {
  open: 'Open',
  'in-progress': 'In progress',
  closed: 'Closed',
};
const TASK_STATUSES: ReadonlyArray<TaskItem['status']> = [
  'open',
  'in_progress',
  'completed',
  'cancelled',
];
/** Reads leave very recent case actions to the investigation write that made them. */
const OWN_WRITE_GRACE_MS = 5000;
/** Alerts read per search, and new indicators written per bulk, when extracting observables. */
const EXTRACTION_ALERT_BATCH = 200;
const EXTRACTION_WRITE_BATCH = 500;
/** Case user actions that count as a response to a new investigation. */
const FIRST_RESPONSE_ACTION_TYPES = new Set(['comment', 'status', 'assignees']);
const FIRST_RESPONSE_MAX_PAGES = 5;
const DUE_WITHIN_MS: Record<DueWithin['unit'], number> = {
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
};
/** A relative deadline resolved against the moment the procedure is applied. */
const dueDateFrom = (dueWithin: DueWithin | null | undefined, anchor: string): string | null =>
  dueWithin && dueWithin.value > 0
    ? new Date(Date.parse(anchor) + dueWithin.value * DUE_WITHIN_MS[dueWithin.unit]).toISOString()
    : null;
/** Roots by `sort_order`, each followed by its subtasks by `sort_order` (as Cases orders tasks). */
const orderTasks = (tasks: TaskItem[]): TaskItem[] => {
  const bySort = (a: TaskItem, b: TaskItem) => (a.task.sort_order ?? 0) - (b.task.sort_order ?? 0);
  const roots = tasks.filter((t) => !t.task.parent_task_id).sort(bySort);
  const rootIds = new Set(roots.map((t) => t.id));
  const orphans = tasks.filter((t) => t.task.parent_task_id && !rootIds.has(t.task.parent_task_id));
  return [
    ...roots.flatMap((root) => [
      root,
      ...tasks.filter((t) => t.task.parent_task_id === root.id).sort(bySort),
    ]),
    ...orphans,
  ];
};
const closeReasonLabel = (reason: string): string => reason.replace(/_/g, ' ');
const closeBlockedMessage = (tasks: string[], fields: string[]): string =>
  [
    'The investigation cannot close yet.',
    tasks.length ? `Required tasks still open: ${tasks.join('; ')}.` : '',
    fields.length ? `Required fields still empty: ${fields.join('; ')}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
const caseErrorMessage = (error: unknown): string => {
  const wrapped = (error as { wrappedError?: { message?: string } })?.wrappedError?.message;
  return wrapped ?? (error instanceof Error ? error.message : String(error));
};
const toAiVerdict = (verdict: AgentVerdict | null | undefined): AiVerdict | null =>
  verdict
    ? {
        verdict: verdict.classification,
        confidence: Math.round(verdict.confidence) / 100,
        summary: verdict.label,
        actor: { type: verdict.set_by.type, id: verdict.set_by.id, name: verdict.set_by.name },
        updated_at: verdict.set_at,
      }
    : null;
const SOURCE_BY_ORIGIN: Record<RecordOrigin['type'], InvestigationSource> = {
  user: 'user',
  rule: 'rule',
  agent: 'agent',
  automation: 'workflow',
};
const CASE_CREATE_ACTION_TYPES = [
  'create_case',
  'title',
  'description',
  'tags',
  'severity',
  'status',
  'assignees',
  'category',
  'settings',
  'connector',
  'template',
  'extended_fields',
];
const ORIGIN_BY_SOURCE: Record<string, ActivityOrigin> = {
  user: 'person',
  none: 'person',
  agent: 'agent',
  workflow: 'workflow',
  rule: 'rule',
  attack: 'rule',
  api: 'api',
  connector: 'connector',
};
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
  tasks_overdue: 0,
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
const terms = (
  field: string,
  values: Array<string | number | boolean>
): QueryDslQueryContainer => ({
  terms: { [field]: values },
});

const RECORD_SORT_FIELDS: Record<string, string> = {
  display_id: 'display_num',
  display_num: 'display_num',
  title: 'title.keyword',
  priority: 'priority_rank',
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
  created_by: 'created_by.name',
};

const pluralNoun = (noun: string): string =>
  /[^aeiou]y$/.test(noun)
    ? `${noun.slice(0, -1)}ies`
    : /(s|sh|ch|x)$/.test(noun)
    ? `${noun}es`
    : `${noun}s`;

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
 * authorizes against the case first, then applies the record's access, then touches the indices.
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

  /** A restricted record is open to its assignees only (the Cases restricted model). */
  private canRead(record: StoredRecord, assignees: string[] = record.assignees ?? []): boolean {
    if (record.access?.mode !== 'restricted') return true;
    const uid = this.deps.user.profileUid;
    return Boolean(uid) && assignees.includes(uid as string);
  }

  private restrictionFilter(): QueryDslQueryContainer {
    const uid = this.deps.user.profileUid;
    return {
      bool: {
        should: [
          { bool: { must_not: [term('access.mode', 'restricted')] } },
          ...(uid ? [term('assignees', uid)] : []),
        ],
        minimum_should_match: 1,
      },
    };
  }

  private static ownerAuthCache = new Map<string, number>();

  /** One pending automatic push per record; a later write resets the timer (item 11). */
  private static readonly autoPushTimers = new Map<string, ReturnType<typeof setTimeout>>();

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

  private writeCheck?: Promise<boolean>;

  /** Writes need the Cases update privilege, not just read access to the case. */
  private async ensureCanWrite(): Promise<void> {
    this.writeCheck ??= this.deps.canUpdateCases().catch(() => false);
    if (!(await this.writeCheck)) {
      throw Boom.forbidden('You have read-only access to investigations.');
    }
  }

  private async loadForWrite(recordId: string): ReturnType<InvestigationsService['load']> {
    const loaded = await this.load(recordId);
    await this.ensureCanWrite();
    return loaded;
  }

  /** Authorizes against the case and loads the record document. */
  private async load(recordId: string): Promise<{
    record: StoredRecord;
    seqNo: number;
    primaryTerm: number;
    theCase: Awaited<ReturnType<CasesClient['cases']['get']>>;
  }> {
    let theCase: Awaited<ReturnType<CasesClient['cases']['get']>>;
    try {
      theCase = await this.deps.casesClient.cases.get({ id: recordId, includeComments: false });
    } catch (error) {
      if (Boom.isBoom(error) && error.output.statusCode === 404) {
        await this.purgeOrphans([recordId]);
      }
      throw error;
    }
    const doc = await this.es.get<StoredRecord>(
      { index: INVESTIGATION_RECORDS_INDEX, id: recordId },
      { ignore: [404] }
    );
    if (!doc.found || !doc._source) {
      throw Boom.notFound(`Investigation ${recordId} not found`);
    }
    const record = doc._source;
    if (
      record.space_id !== this.deps.spaceId ||
      !this.canRead(
        record,
        (theCase.assignees ?? []).map(({ uid }) => uid)
      )
    ) {
      throw Boom.notFound(`Investigation ${recordId} not found`);
    }
    return {
      record,
      seqNo: doc._seq_no ?? 0,
      primaryTerm: doc._primary_term ?? 0,
      theCase,
    };
  }

  /** Removes investigation documents whose case was deleted outside the investigation API. */
  private async purgeOrphans(recordIds: string[]): Promise<void> {
    if (!recordIds.length) return;
    try {
      await Promise.all([
        this.es.deleteByQuery({
          index: INVESTIGATION_ITEMS_INDEX,
          refresh: true,
          conflicts: 'proceed',
          query: terms('record_id', recordIds),
        }),
        this.es.deleteByQuery({
          index: INVESTIGATION_ACTIVITY_INDEX,
          refresh: true,
          conflicts: 'proceed',
          query: terms('record_id', recordIds),
        }),
        this.es.deleteByQuery({
          index: INVESTIGATION_RECORDS_INDEX,
          refresh: true,
          conflicts: 'proceed',
          query: terms('id', recordIds),
        }),
      ]);
      this.deps.logger.info(
        `Removed ${recordIds.length} investigation record(s) whose case no longer exists`
      );
    } catch (error) {
      this.deps.logger.warn(`Could not remove orphaned investigation records: ${error}`);
    }
  }

  private toRecord(
    source: StoredRecord,
    seqNo?: number,
    primaryTerm?: number
  ): InvestigationRecord {
    const {
      ref_counters: _refCounters,
      verdict_effective: _v,
      priority_rank: _p,
      ...rest
    } = source;
    return {
      ...rest,
      counters: { ...emptyCounters(), ...(rest.counters ?? {}) },
      participants: rest.participants ?? [],
      threads: rest.threads ?? [],
      conversation_ids: rest.conversation_ids ?? [],
      merged_from: rest.merged_from ?? [],
      access: rest.access ?? { mode: 'default' },
      linked_records: rest.linked_records ?? [],
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
    entries: Array<
      Omit<ActivityEntry, 'id' | 'record_id' | 'space_id' | 'links'> & {
        links?: ActivityEntry['links'];
      }
    >
  ): Promise<ActivityEntry[]> {
    const kept = this.quietHistory
      ? entries.filter((entry) => !entry.action.startsWith('record.'))
      : entries;
    if (!kept.length) return [];
    const docs: ActivityEntry[] = kept.map((entry) => ({
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

  public async findActivity(
    recordId: string,
    req: FindActivityRequest
  ): Promise<FindActivityResponse> {
    const { record } = await this.load(recordId);
    const recordIds = [recordId, ...(record.merged_from ?? [])];
    const perPage = Math.min(
      req.per_page ?? INVESTIGATION_LIMITS.defaultPerPage,
      INVESTIGATION_LIMITS.maxPerPage
    );
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
    const latest = (res.aggregations?.latest as { value_as_string?: string } | undefined)
      ?.value_as_string;
    return {
      entries: res.hits.hits.map((h) => h._source as ActivityEntry),
      total: typeof res.hits.total === 'number' ? res.hits.total : res.hits.total?.value ?? 0,
      page,
      per_page: perPage,
      latest_ts: latest ?? req.since ?? null,
    };
  }

  public async createActivity(
    recordId: string,
    req: CreateActivityRequest
  ): Promise<ActivityEntry> {
    await this.loadForWrite(recordId);
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

  public async computeCounters(
    recordId: string,
    mergedFrom: string[] = []
  ): Promise<RecordCounters> {
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
                    must_not: [terms('status', ['completed', 'cancelled'])],
                  },
                },
              },
              overdue: {
                filter: {
                  bool: {
                    filter: [{ range: { 'task.due_date': { lt: 'now' } } }],
                    must_not: [terms('status', ['completed', 'cancelled'])],
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
      tasks_done: taskStatus.completed ?? 0,
      tasks_skipped: taskStatus.cancelled ?? 0,
      tasks_overdue: filterCount(tasksAgg?.overdue),
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
  private async reserveRefs(
    recordId: string,
    counts: Partial<Record<ItemKind, number>>
  ): Promise<Record<string, number>> {
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

  /**
   * Allocates the next display number atomically from a per-space counter document, never below
   * the highest number already used (records may carry supplied display ids).
   */
  private async nextDisplayNum(): Promise<number> {
    const res = await this.es.search({
      index: INVESTIGATION_RECORDS_INDEX,
      size: 0,
      query: term('space_id', this.deps.spaceId),
      aggs: { max: { max: { field: 'display_num' } } },
    });
    const max = (res.aggregations?.max as { value?: number | null } | undefined)?.value ?? 0;
    const floor = Math.max(Math.floor(max ?? 0), 0) + 1;
    const counter = await this.es.update<{ value?: number }, unknown, { value?: number }>({
      index: INVESTIGATION_CONFIG_INDEX,
      id: `display_counter:${this.deps.spaceId}`,
      // One hot document under concurrent creates: retry generously rather than fail the create.
      retry_on_conflict: 100,
      refresh: false,
      _source: true,
      scripted_upsert: true,
      upsert: {},
      script: {
        lang: 'painless',
        source: `
          ctx._source.doc_type = 'display_counter';
          ctx._source.space_id = params.space;
          def current = ctx._source.value == null ? 0 : ctx._source.value;
          ctx._source.value = Math.max(current + 1, params.floor);`,
        params: { floor, space: this.deps.spaceId },
      },
    });
    return counter.get?._source?.value ?? floor;
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
    const priority = req.priority ?? 'medium';
    const template = req.template_id ? await this.getInvestigationTemplate(req.template_id) : null;
    const investigationType = template?.name ?? req.investigation_type ?? 'Investigation';
    const restrictedCreatorUid =
      req.access?.mode === 'restricted' ? this.deps.user.profileUid ?? null : null;
    if (req.access?.mode === 'restricted' && !restrictedCreatorUid) {
      throw Boom.badRequest(
        'A restricted investigation must have at least one assignee. Create it with the default access mode.'
      );
    }
    const theCase = await this.deps.casesClient.cases.create({
      title: req.title,
      description: req.description,
      tags: Array.from(new Set(['investigation', ...(req.tags ?? [])])),
      owner: INVESTIGATIONS_OWNER,
      severity: priority,
      category: investigationType.slice(0, 50),
      connector: { id: 'none', name: 'none', type: '.none' as const, fields: null },
      settings: { syncAlerts: true },
      ...(restrictedCreatorUid ? { assignees: [{ uid: restrictedCreatorUid }] } : {}),
      ...(template
        ? { template: { id: template.id }, extended_fields: req.extended_fields ?? {} }
        : {}),
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
      status_key: getDefaultStatus((await this.getStatusesConfiguration()).statuses, 'open').key,
      paused_at: null,
      time_paused: 0,
      pause_reason: null,
      resume_to_status_key: null,
      priority,
      priority_rank: PRIORITY_RANK[priority],
      priority_note: null,
      tags: req.tags ?? [],
      assignees: restrictedCreatorUid ? [restrictedCreatorUid] : [],
      owner: null,
      participants: actor.type === 'automation' ? [] : [actor],
      created_at: createdAt,
      created_by: actor,
      updated_at: createdAt,
      updated_by: actor,
      closed_at: null,
      investigation_type: investigationType,
      template_id: theCase.template?.id ?? null,
      template_version: theCase.template?.version ?? null,
      stage: 'Triage',
      summary: req.summary ?? null,
      fields: buildFieldsMirror(theCase.extended_fields, theCase.extended_fields_controls),
      close_reason: null,
      human_verdict: null,
      ai_verdict: null,
      agent_verdict: null,
      analyst_verdict: null,
      verdict_effective: null,
      close_outcome: null,
      origin: req.origin ?? {
        type: actor.type === 'agent' ? 'agent' : 'user',
        label: `Started by ${actor.name}`,
        actor,
      },
      source: SOURCE_BY_ORIGIN[req.origin?.type ?? (actor.type === 'agent' ? 'agent' : 'user')],
      conversation_id: null,
      conversation_ids: [],
      threads: [],
      ai_enabled: aiEnabled,
      agent_id: aiEnabled ? this.deps.agent.agentId : null,
      agent_name: aiEnabled ? this.deps.agent.agentName : null,
      access: { mode: restrictedCreatorUid ? 'restricted' : 'default' },
      linked_records: [],
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
    await this.ingestCaseUserActions(record, {
      startedAt: '',
      actor,
      ts: createdAt,
      // "Started the investigation" already covers what the case was created with.
      skipTypes: CASE_CREATE_ACTION_TYPES,
    });

    await this.appendActivity(record.id, [
      {
        ts: createdAt,
        actor,
        action: 'record.created',
        target: { kind: 'record', id: record.id, title: req.title },
        message: /\b(from .+)$/.test(record.origin.label)
          ? `Started the investigation ${
              (/\b(from .+)$/.exec(record.origin.label) as RegExpExecArray)[1]
            }`
          : 'Started the investigation',
        details: null,
        after: { description: req.description, summary: req.summary ?? null },
      },
    ]);

    if (req.apply_procedure ?? true) {
      await this.applyProcedureInternal(
        record,
        record.template_id ?? null,
        false,
        actor,
        createdAt
      );
    }
    if (req.alerts?.length) {
      await this.bulkCreateItemsInternal(
        record,
        req.alerts.map((alert) => ({
          kind: 'evidence' as const,
          title: alert.rule_name ?? `Alert ${alert.id}`,
          evidence: {
            type: 'alert' as const,
            source: {
              label: 'Alerts index',
              kind: 'alert' as const,
              index: alert.index,
              id: alert.id,
            },
            alert: {
              id: alert.id,
              index: alert.index,
              rule_id: alert.rule_id ?? null,
              rule_name: alert.rule_name ?? null,
            },
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
      this.deps.logger.warn(
        `Investigation ${recordId}: could not create its conversation: ${error}`
      );
    }
  }

  public async findRecords(req: FindRecordsRequest): Promise<FindRecordsResponse> {
    await this.ensureCanReadOwner();
    const perPage = Math.min(
      req.per_page ?? INVESTIGATION_LIMITS.defaultPerPage,
      INVESTIGATION_LIMITS.maxPerPage
    );
    const page = Math.max(req.page ?? 1, 1);
    if ((page - 1) * perPage + perPage > INVESTIGATION_LIMITS.maxDeepPageFrom) {
      throw Boom.badRequest('Page is too deep; narrow the search or filters.');
    }
    const filter: QueryDslQueryContainer[] = [
      term('space_id', this.deps.spaceId),
      this.restrictionFilter(),
    ];
    const mustNot: QueryDslQueryContainer[] = [];
    if (req.status?.length) filter.push(terms('status', req.status));
    if (req.priority?.length) filter.push(terms('priority', req.priority));
    if (req.status_key?.length) filter.push(terms('status_key', req.status_key));
    if (req.assignees?.length) {
      const uids = req.assignees
        .filter((uid) => uid !== 'none')
        .map((uid) => (uid === 'me' ? this.deps.user.profileUid ?? '__none__' : uid));
      const should: QueryDslQueryContainer[] = [];
      if (uids.length) should.push(terms('assignees', uids));
      if (req.assignees.includes('none')) {
        should.push({ bool: { must_not: [{ exists: { field: 'assignees' } }] } });
      }
      filter.push({ bool: { should, minimum_should_match: 1 } });
    }
    if (req.investigation_type?.length)
      filter.push(terms('investigation_type', req.investigation_type));
    if (req.access?.length === 1) {
      if (req.access[0] === 'restricted') filter.push(term('access.mode', 'restricted'));
      else mustNot.push(term('access.mode', 'restricted'));
    }
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
            {
              multi_match: {
                query: q,
                fields: ['title^3', 'description', 'summary', 'investigation_type'],
                operator: 'and',
              },
            },
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
    let records = res.hits.hits.map((h) =>
      this.toRecord(h._source as StoredRecord, h._seq_no, h._primary_term)
    );
    let total = typeof res.hits.total === 'number' ? res.hits.total : res.hits.total?.value ?? 0;
    if (records.length) {
      // Cases can be deleted from the classic Cases pages; drop and clean up their records.
      const checked = await this.deps.casesClient.cases.bulkGet({ ids: records.map((r) => r.id) });
      const missing = new Set(checked.errors.filter((e) => e.status === 404).map((e) => e.caseId));
      if (missing.size) {
        records = records.filter((r) => !missing.has(r.id));
        total = Math.max(0, total - missing.size);
        void this.purgeOrphans(Array.from(missing));
      }
    }
    return { records, total, page, per_page: perPage, took_ms: Date.now() - started };
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
      {
        [target]: { order, unmapped_type: unmapped, missing: order === 'asc' ? '_last' : '_last' },
      },
      { display_num: { order: 'desc' } },
    ];
  }

  /**
   * Copies case user actions newer than the record's sync point into the activity index, so the
   * Activity tab is the one history of the investigation. Entries get deterministic ids, so a
   * repeated sync never duplicates. `ownWrite` relabels actions caused by an investigation write
   * (same actor and, for seeded data, the same backdated time).
   */
  private async ingestCaseUserActions(
    record: StoredRecord,
    ownWrite?: OwnCaseWrite
  ): Promise<void> {
    const cursorId = `case_actions_cursor:${record.id}`;
    const cursor = await this.es
      .get<{ synced_at?: string; ids_at?: string[] }>({
        index: INVESTIGATION_CONFIG_INDEX,
        id: cursorId,
      })
      .catch(() => undefined);
    const since = cursor?._source?.synced_at ?? null;
    const seenAtSince = new Set(cursor?._source?.ids_at ?? []);
    const collected: CaseUserAction[] = [];
    for (let page = 1; page <= 20; page++) {
      const res = await this.deps.casesClient.userActions.find({
        caseId: record.case_id,
        params: { sortOrder: 'desc', perPage: 100, page },
      });
      const older = res.userActions.findIndex((action) => since && action.created_at < since);
      const fresh = older === -1 ? res.userActions : res.userActions.slice(0, older);
      collected.push(
        ...fresh.filter((action) => !(action.created_at === since && seenAtSince.has(action.id)))
      );
      if (older !== -1 || res.userActions.length < 100) break;
    }
    if (!ownWrite) {
      const cutoff = Date.now() - OWN_WRITE_GRACE_MS;
      const settled = collected.filter((action) => Date.parse(action.created_at) < cutoff);
      collected.splice(0, collected.length, ...settled);
    }
    if (!collected.length) return;
    if (ownWrite) this.scheduleAutoPush(record, collected);
    const newest = collected[0].created_at;
    await this.addFileEvidenceFromCase(record, collected, ownWrite);
    const entries =
      this.quietHistory && ownWrite
        ? []
        : await this.describeCaseUserActions(record, [...collected].reverse(), ownWrite);
    if (entries.length) {
      await this.es.bulk({
        refresh: true,
        // Create-only: the first write of an action wins, so an investigation write's relabelled
        // entry is never overwritten by a later sync that sees the same action again.
        operations: entries.flatMap((doc) => [
          { create: { _index: INVESTIGATION_ACTIVITY_INDEX, _id: doc.id } },
          doc,
        ]),
      });
    }
    // Actions that share the cursor's millisecond are remembered by id, so skipped or already
    // copied ones are never picked up again.
    const idsAtNewest = collected.filter((a) => a.created_at === newest).map((a) => a.id);
    await this.es.index({
      index: INVESTIGATION_CONFIG_INDEX,
      id: cursorId,
      refresh: false,
      document: {
        type: 'case_actions_cursor',
        record_id: record.id,
        synced_at: newest,
        ids_at: newest === since ? [...seenAtSince, ...idsAtNewest] : idsAtNewest,
      },
    });
  }

  /** Files attached in classic Cases become file evidence (once per attachment). */
  private async addFileEvidenceFromCase(
    record: StoredRecord,
    actions: CaseUserAction[],
    ownWrite?: OwnCaseWrite
  ): Promise<void> {
    const files = actions.filter((action) => {
      if (action.type !== 'comment' || action.action !== 'create' || !action.comment_id)
        return false;
      if (ownWrite && action.created_at >= ownWrite.startedAt) return false;
      const comment = (action.payload as { comment?: Record<string, unknown> }).comment ?? {};
      return (
        comment.type === 'file' ||
        comment.externalReferenceAttachmentTypeId === '.files' ||
        comment.type === '.files'
      );
    });
    if (!files.length) return;
    const known = await this.searchItems<EvidenceItem>(
      record.id,
      {
        bool: {
          filter: [
            term('kind', 'evidence'),
            terms(
              'evidence.source.id',
              files.map((action) => action.comment_id as string)
            ),
          ],
        },
      },
      files.length
    );
    const knownIds = new Set(known.map((item) => item.evidence.source?.id));
    const fresh = files.filter((action) => !knownIds.has(action.comment_id as string));
    for (const action of fresh) {
      const comment = (action.payload as { comment?: Record<string, unknown> }).comment ?? {};
      const metadata = (comment.metadata ?? comment.externalReferenceMetadata ?? {}) as {
        files?: Array<{ name?: string; extension?: string }>;
      };
      const meta = metadata.files?.[0] ?? {};
      const attachmentIds = (comment.attachmentId ?? comment.externalReferenceId) as
        | string
        | string[]
        | undefined;
      const fileId = Array.isArray(attachmentIds) ? attachmentIds[0] : attachmentIds;
      const name = [meta.name, meta.extension].filter(Boolean).join('.') || 'File';
      const person = action.created_by?.full_name || action.created_by?.username || 'Unknown user';
      const actor: Actor = {
        type: 'user',
        id: action.created_by?.username ?? 'unknown',
        name: person,
      };
      await this.bulkCreateItemsInternal(
        record,
        [
          {
            kind: 'evidence',
            title: name,
            evidence: {
              type: 'file',
              why: 'Attached in Cases',
              source: {
                label: 'Cases',
                kind: 'file',
                file_id: fileId ?? null,
                id: action.comment_id as string,
              },
            },
            created_at: action.created_at,
          },
        ],
        actor
      );
    }
  }

  private async describeCaseUserActions(
    record: StoredRecord,
    actions: CaseUserAction[],
    ownWrite?: OwnCaseWrite
  ): Promise<ActivityEntry[]> {
    const uids = new Set<string>();
    for (const action of actions) {
      if (action.type === 'assignees') {
        for (const { uid } of (action.payload as { assignees?: Array<{ uid: string }> })
          .assignees ?? []) {
          uids.add(uid);
        }
      }
    }
    const profiles = new Map(
      (await this.deps.getUserProfiles([...uids]).catch(() => [])).map((p) => [p.uid, p.fullName])
    );
    const fieldLabels = actions.some((action) => action.type === 'extended_fields')
      ? new Map(
          (
            await this.deps.casesClient.cases
              .getApplicableFields({ caseId: record.case_id })
              .catch(() => ({ fields: [] }))
          ).fields.map((f) => [f.key, f.label])
        )
      : new Map<string, string>();
    const labelOf = (key: string): string =>
      fieldLabels.get(key) ?? key.replace(/_as_[a-z_]+$/, '').replace(/_/g, ' ');
    const target = { kind: 'record' as const, id: record.id, title: record.title };
    const out: ActivityEntry[] = [];
    const toEntry = (action: CaseUserAction): ActivityEntry | null => {
      if (ownWrite?.skipTypes?.includes(action.type) && action.created_at >= ownWrite.startedAt) {
        return null;
      }
      const payload = action.payload as Record<string, unknown>;
      let entry: Pick<ActivityEntry, 'action' | 'message'> &
        Partial<Pick<ActivityEntry, 'details' | 'after' | 'links'>>;
      switch (action.type) {
        case 'title':
          entry = {
            action: 'record.title_changed',
            message: `Renamed the investigation to "${clip(String(payload.title ?? ''), 120)}"`,
            after: payload.title,
          };
          break;
        case 'description':
          entry = {
            action: 'record.description_changed',
            message: 'Edited the description',
            after: payload.description,
          };
          break;
        case 'tags': {
          const tags = ((payload.tags as string[]) ?? []).filter((t) => t !== 'investigation');
          if (!tags.length) return null;
          entry = {
            action: 'record.tags_changed',
            message: `${action.action === 'delete' ? 'Removed' : 'Added'} ${
              tags.length === 1 ? 'the tag' : 'the tags'
            } ${tags.join(', ')}`,
            after: tags,
          };
          break;
        }
        case 'severity':
          entry = {
            action: 'record.priority_changed',
            message: `Changed the priority to ${String(payload.severity)}`,
            after: payload.severity,
          };
          break;
        case 'status':
          entry = {
            action: 'record.status_changed',
            message:
              payload.status === 'closed'
                ? 'Closed the investigation'
                : `Changed the status to ${
                    CASE_STATUS_WORDS[String(payload.status)] ?? payload.status
                  }`,
            after: payload.status,
          };
          break;
        case 'assignees': {
          const names = ((payload.assignees as Array<{ uid: string }>) ?? []).map(
            ({ uid }) => profiles.get(uid) ?? 'Unknown user'
          );
          if (!names.length) return null;
          entry = {
            action: 'record.assignees_changed',
            message: `${action.action === 'delete' ? 'Unassigned' : 'Assigned'} ${names.join(
              ', '
            )}`,
            after: names,
          };
          break;
        }
        case 'extended_fields': {
          const values = (payload.extended_fields as Record<string, string>) ?? {};
          const keys = Object.keys(values);
          if (!keys.length) return null;
          const first = labelOf(keys[0]);
          entry = {
            action: 'record.fields_changed',
            message:
              keys.length === 1
                ? `Set ${first} to ${values[keys[0]] === '' ? 'empty' : clip(values[keys[0]], 80)}`
                : `Changed ${keys.length} fields`,
            after: values,
          };
          break;
        }
        case 'template': {
          const template = payload.template as { id?: string; name?: string } | null;
          entry = {
            action: 'record.type_changed',
            message: template
              ? `Changed the investigation type to ${template.name ?? template.id}`
              : 'Removed the investigation type',
            after: template,
          };
          break;
        }
        case 'comment': {
          const comment = payload.comment as { type?: string; data?: { content?: string } } | null;
          if (comment?.type !== 'comment' && comment?.type !== 'user') return null;
          const content =
            comment.data?.content ?? (comment as unknown as { comment?: string }).comment ?? '';
          entry = {
            action:
              action.action === 'delete'
                ? 'record.comment_deleted'
                : action.action === 'update'
                ? 'record.comment_edited'
                : 'record.comment_added',
            message:
              action.action === 'delete'
                ? 'Deleted a comment'
                : action.action === 'update'
                ? 'Edited a comment'
                : 'Commented',
            details: action.action === 'delete' ? null : clip(content, 300),
            links: [{ kind: 'tab', id: 'conversation', label: 'Discussion' }],
          };
          break;
        }
        case 'connector': {
          const connector = payload.connector as { name?: string; type?: string } | null;
          entry = {
            action: 'record.connector_changed',
            message:
              !connector || connector.type === '.none'
                ? 'Removed the external ticket connector'
                : `Set the external ticket connector to ${connector.name}`,
          };
          break;
        }
        case 'pushed': {
          const service = payload.externalService as {
            connector_name?: string;
            external_title?: string;
            external_url?: string;
          } | null;
          entry = {
            action: 'record.pushed',
            message: `Pushed to ${service?.connector_name ?? 'the external system'}${
              service?.external_title ? ` as ${service.external_title}` : ''
            }`,
            details: service?.external_url ?? null,
          };
          break;
        }
        case 'workflow': {
          const workflow = payload.workflow as { name?: string; id?: string } | null;
          entry = {
            action: 'record.workflow_run',
            message: `Ran the workflow ${workflow?.name ?? workflow?.id ?? ''}`.trim(),
          };
          break;
        }
        default:
          return null;
      }
      const own = ownWrite && action.created_at >= ownWrite.startedAt;
      const source = (action as { source?: { type?: string; id?: string; name?: string } | null })
        .source;
      const person = action.created_by?.full_name || action.created_by?.username || 'Unknown user';
      const origin = ORIGIN_BY_SOURCE[source?.type ?? 'user'] ?? 'person';
      const actor: Actor = own
        ? ownWrite.actor
        : source?.type === 'agent'
        ? {
            type: 'agent',
            id: source.id ?? 'agent',
            name: source.name ?? 'Agent',
            on_behalf_of: person,
          }
        : origin === 'workflow' || origin === 'rule'
        ? {
            type: 'automation',
            id: source?.id ?? 'automation',
            name: source?.name ?? (origin === 'rule' ? 'Rule' : 'Workflow'),
            on_behalf_of: person,
          }
        : { type: 'user', id: action.created_by?.username ?? 'unknown', name: person };
      return {
        id: `case-action-${action.id}`,
        record_id: record.id,
        space_id: this.deps.spaceId,
        ts: own ? ownWrite.ts : action.created_at,
        actor,
        target,
        links: [],
        details: null,
        ...entry,
        ...(own && ownWrite.details?.[action.type]
          ? { details: ownWrite.details[action.type] }
          : {}),
        origin: own && ownWrite.actor.type === 'agent' ? 'agent' : origin,
        case_action_id: action.id,
      };
    };
    for (const action of actions) {
      const entry = toEntry(action);
      if (entry) out.push(entry);
    }
    return out;
  }

  /* ---------------------------------------------------------------- */
  /* Record-level discussion = case comments                          */
  /* ---------------------------------------------------------------- */

  public async findComments(
    recordId: string,
    req: FindCommentsRequest
  ): Promise<FindCommentsResponse> {
    const { record } = await this.load(recordId);
    const page = req.page ?? 1;
    const perPage = Math.min(req.per_page ?? 50, 100);
    const res = await this.deps.casesClient.attachments.find({
      caseID: record.case_id,
      findQueryParams: {
        page,
        perPage,
        sortOrder: req.sort_order ?? 'asc',
        type: COMMENT_ATTACHMENT_TYPE,
      },
    });
    return {
      comments: res.data.map(toRecordComment),
      total: res.total,
      page,
      per_page: perPage,
    };
  }

  public async addComment(recordId: string, req: AddCommentRequest): Promise<RecordComment> {
    const { record } = await this.loadForWrite(recordId);
    let content = req.content.trim();
    if (!content) throw Boom.badRequest('A comment cannot be empty.');
    if (req.reply_to) {
      const parent = await this.deps.casesClient.attachments
        .get({ caseID: record.case_id, savedObjectId: req.reply_to })
        .catch(() => undefined);
      const quoted = parent ? commentContent(parent) : null;
      if (quoted == null) throw Boom.notFound('The comment you are replying to no longer exists.');
      // Same quote format as the Cases "Quote" action.
      content = `> ${quoted.replace(/\r?\n/g, '\n> ')} \n\n${content}`;
    }
    const startedAt = new Date().toISOString();
    const created = await this.deps.casesClient.attachments.add({
      caseId: record.case_id,
      comment: { type: COMMENT_ATTACHMENT_TYPE, owner: INVESTIGATIONS_OWNER, data: { content } },
    });
    await this.ingestCaseUserActions(record, { startedAt, actor: this.actor(), ts: now() });
    return toRecordComment(created);
  }

  public async updateComment(
    recordId: string,
    commentId: string,
    req: UpdateCommentRequest
  ): Promise<RecordComment> {
    const { record } = await this.loadForWrite(recordId);
    const startedAt = new Date().toISOString();
    await this.deps.casesClient.attachments.update({
      caseID: record.case_id,
      updateRequest: {
        id: commentId,
        version: req.version,
        type: COMMENT_ATTACHMENT_TYPE,
        owner: INVESTIGATIONS_OWNER,
        data: { content: req.content },
      },
    } as Parameters<CasesClient['attachments']['update']>[0]);
    await this.ingestCaseUserActions(record, { startedAt, actor: this.actor(), ts: now() });
    return toRecordComment(
      await this.deps.casesClient.attachments.get({
        caseID: record.case_id,
        savedObjectId: commentId,
      })
    );
  }

  public async deleteComment(recordId: string, commentId: string): Promise<void> {
    const { record } = await this.loadForWrite(recordId);
    const startedAt = new Date().toISOString();
    await this.deps.casesClient.attachments.delete({
      caseID: record.case_id,
      savedObjectId: commentId,
    });
    await this.ingestCaseUserActions(record, { startedAt, actor: this.actor(), ts: now() });
  }

  public async getRecord(recordId: string): Promise<GetRecordResponse> {
    const { record, seqNo, primaryTerm, theCase } = await this.load(recordId);
    const synced = await this.syncFromCase(record, theCase, seqNo, primaryTerm);
    await this.ingestCaseUserActions(record).catch((error) =>
      this.deps.logger.warn(`Investigation ${recordId}: case history sync failed: ${error}`)
    );
    synced.counters = { ...synced.counters, discussion_comments: theCase.totalComment ?? 0 };
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
        created_by: {
          username: theCase.created_by?.username,
          full_name: theCase.created_by?.full_name,
        },
        template: theCase.template ?? null,
        extended_fields: theCase.extended_fields ?? {},
        extended_fields_labels: theCase.extended_fields_labels ?? {},
        extended_fields_controls: theCase.extended_fields_controls ?? {},
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
    if (theCase.status !== record.status) {
      // Changed outside the investigation (classic Cases): use the category's default status.
      const config = await this.getStatusesConfiguration();
      const target = getDefaultStatus(config.statuses, theCase.status as StoredRecord['status']);
      patch.status = target.category;
      patch.status_key = target.key;
      if (record.status === 'closed' && target.category !== 'closed') {
        // Reopened (here or in classic Cases): clear the close reason and the analyst verdict.
        Object.assign(patch, {
          closed_at: null,
          close_outcome: null,
          close_reason: null,
          human_verdict: null,
          analyst_verdict: null,
          verdict_effective: record.agent_verdict?.classification ?? null,
        });
      }
      try {
        Object.assign(
          patch,
          getPauseFieldsForUpdate({
            original: record,
            target,
            pauseReasons: config.pauseReasons,
            statuses: config.statuses,
            now: theCase.updated_at ?? now(),
          }) ?? {}
        );
      } catch (error) {
        this.deps.logger.warn(`Investigation ${record.id}: pause bookkeeping failed: ${error}`);
      }
    }
    if (theCase.severity !== record.priority) {
      patch.priority = theCase.severity as StoredRecord['priority'];
      patch.priority_rank = PRIORITY_RANK[patch.priority];
    }
    if (JSON.stringify(tags) !== JSON.stringify(record.tags ?? [])) patch.tags = tags;
    const assignees = (theCase.assignees ?? []).map(({ uid }) => uid);
    if (JSON.stringify(assignees) !== JSON.stringify(record.assignees ?? [])) {
      patch.assignees = assignees;
    }
    Object.assign(patch, await this.templatePatchFromCase(record, theCase));
    if (!Object.keys(patch).length) return this.toRecord(record, seqNo, primaryTerm);
    const res = await this.es.update<StoredRecord>({
      index: INVESTIGATION_RECORDS_INDEX,
      id: record.id,
      refresh: true,
      retry_on_conflict: 3,
      script: {
        lang: 'painless',
        source: 'for (def e : params.patch.entrySet()) { ctx._source[e.getKey()] = e.getValue(); }',
        params: { patch },
      },
    });
    return this.toRecord({ ...record, ...patch }, res._seq_no, res._primary_term);
  }

  /** Mirror fields, template and type name that differ between the record and its case. */
  private async templatePatchFromCase(
    record: StoredRecord,
    theCase: Pick<
      Awaited<ReturnType<CasesClient['cases']['get']>>,
      'template' | 'extended_fields' | 'extended_fields_controls'
    >
  ): Promise<Partial<StoredRecord>> {
    const patch: Partial<StoredRecord> = {};
    const mirror = buildFieldsMirror(theCase.extended_fields, theCase.extended_fields_controls);
    if (!sameEntries(mirror, record.fields ?? {})) patch.fields = mirror;
    const templateId = theCase.template?.id ?? null;
    const templateVersion = theCase.template?.version ?? null;
    if (
      templateId !== (record.template_id ?? null) ||
      templateVersion !== (record.template_version ?? null)
    ) {
      patch.template_id = templateId;
      patch.template_version = templateVersion;
      if (templateId) {
        const template = await this.getInvestigationTemplate(templateId, templateVersion, true);
        if (template.name !== record.investigation_type) patch.investigation_type = template.name;
      }
    }
    return patch;
  }

  /** Loads a Cases template that may be used as an investigation type. */
  private async getInvestigationTemplate(
    templateId: string,
    version?: number | null,
    includeDeleted = false
  ): Promise<{ id: string; version: number; name: string }> {
    const template = await this.deps.casesClient.templates
      .getTemplate(templateId, version ? String(version) : undefined, { includeDeleted })
      .catch(() => undefined);
    if (!template || template.attributes.owner !== INVESTIGATIONS_OWNER) {
      throw Boom.badRequest(`Investigation type ${templateId} not found`);
    }
    return {
      id: template.attributes.templateId,
      version: template.attributes.templateVersion,
      name: template.attributes.name,
    };
  }

  public async updateRecord(
    recordId: string,
    req: UpdateRecordRequest
  ): Promise<InvestigationRecord> {
    const { record, theCase, seqNo, primaryTerm } = await this.loadForWrite(recordId);
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
    }
    if (req.description !== undefined && req.description !== record.description) {
      patch.description = req.description;
      casePatch.description = req.description;
    }
    if (req.summary !== undefined && req.summary !== record.summary) {
      patch.summary = req.summary;
      log('record.summary_changed', 'Edited the summary', {
        before: record.summary,
        after: req.summary,
      });
    }
    if (req.priority !== undefined && req.priority !== record.priority) {
      // Priority is the case severity: the change reaches Activity from the case user action.
      patch.priority = req.priority;
      patch.priority_rank = PRIORITY_RANK[req.priority];
      casePatch.severity = req.priority;
    }
    if (req.priority_note !== undefined) patch.priority_note = req.priority_note;
    if (req.assignees !== undefined) {
      const ownerUid = record.owner?.type === 'user' ? record.owner.profile_uid : null;
      const next = Array.from(new Set([...req.assignees, ...(ownerUid ? [ownerUid] : [])]));
      if (next.length > MAX_ASSIGNEES_PER_CASE) {
        throw Boom.badRequest(
          `An investigation can have at most ${MAX_ASSIGNEES_PER_CASE} assignees.`
        );
      }
      const current = (theCase.assignees ?? []).map(({ uid }) => uid);
      if (next.length !== current.length || next.some((uid) => !current.includes(uid))) {
        casePatch.assignees = next.map((uid) => ({ uid }));
        patch.assignees = next;
      }
    }
    if (req.tags !== undefined) {
      patch.tags = req.tags;
      casePatch.tags = Array.from(new Set(['investigation', ...req.tags]));
    }
    if (req.extended_fields !== undefined) {
      const current = theCase.extended_fields ?? {};
      const changed = Object.fromEntries(
        Object.entries(req.extended_fields).filter(([key, value]) => (current[key] ?? '') !== value)
      );
      if (Object.keys(changed).length || req.template !== undefined) {
        casePatch.extended_fields = changed;
      }
    }
    if (req.template !== undefined) {
      const sameTemplate =
        (req.template?.id ?? null) === (theCase.template?.id ?? null) &&
        (req.template?.version ?? null) === (theCase.template?.version ?? null);
      if (!sameTemplate) {
        if (req.template)
          await this.getInvestigationTemplate(req.template.id, req.template.version);
        casePatch.template = req.template;
      }
    }
    if (req.stage !== undefined) patch.stage = req.stage;
    let ownerStatusChange: 'open' | 'in-progress' | null = null;
    if (req.owner !== undefined) {
      const nextOwner: Actor | null =
        req.owner && 'self' in req.owner ? this.currentUserActor() : (req.owner as Actor | null);
      const previous = record.owner ?? null;
      if ((nextOwner?.id ?? null) !== (previous?.id ?? null)) {
        patch.owner = nextOwner;
        ownerStatusChange = nextOwner ? 'in-progress' : previous ? 'open' : null;
        const ownerUid =
          nextOwner?.type === 'user'
            ? nextOwner.profile_uid ??
              (nextOwner.id === this.deps.user.username ? this.deps.user.profileUid : null)
            : null;
        if (nextOwner && ownerUid && !nextOwner.profile_uid) {
          patch.owner = { ...nextOwner, profile_uid: ownerUid };
        }
        if (ownerUid) {
          const current =
            (casePatch.assignees as Array<{ uid: string }> | undefined)?.map(({ uid }) => uid) ??
            (theCase.assignees ?? []).map(({ uid }) => uid);
          if (!current.includes(ownerUid)) {
            const next = [...current, ownerUid].slice(-MAX_ASSIGNEES_PER_CASE);
            casePatch.assignees = next.map((uid) => ({ uid }));
            patch.assignees = next;
          }
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
          links: req.handoff_note
            ? [{ kind: 'tab', id: 'overview', label: 'Handoff summary' }]
            : [],
        });
        if (req.handoff_note || (previous && nextOwner && nextOwner.id !== actor.id)) {
          patch.last_handoff = { at: ts, by: actor, to: nextOwner, note: req.handoff_note ?? null };
        }
      }
    }
    if (req.agent_verdict !== undefined) {
      patch.agent_verdict = req.agent_verdict
        ? { ...req.agent_verdict, set_by: actor, set_at: ts }
        : null;
      log(
        'record.agent_verdict_changed',
        req.agent_verdict
          ? `Concluded ${req.agent_verdict.label.toLowerCase()} at ${req.agent_verdict.confidence}%`
          : 'Cleared the agent verdict',
        {
          before: record.agent_verdict
            ? { label: record.agent_verdict.label, confidence: record.agent_verdict.confidence }
            : null,
          after: req.agent_verdict
            ? { label: req.agent_verdict.label, confidence: req.agent_verdict.confidence }
            : null,
          links: [{ kind: 'verdict', id: 'V', label: 'Verdict' }],
        }
      );
    }
    if (req.analyst_verdict !== undefined) {
      patch.analyst_verdict = req.analyst_verdict
        ? { ...req.analyst_verdict, set_by: actor, set_at: ts }
        : null;
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
    let statusLogged = false;
    if (
      record.status !== 'closed' &&
      (req.status_key !== undefined ||
        req.status !== undefined ||
        req.pause_reason !== undefined ||
        ownerStatusChange)
    ) {
      const config = await this.getStatusesConfiguration();
      const current = getRecordStatus(config.statuses, record);
      let target: CaseStatusConfiguration | undefined;
      if (req.status_key !== undefined) {
        target = findStatusByKey(config.statuses, req.status_key);
        if (!target || target.disabled)
          throw Boom.badRequest(`Unknown status key: ${req.status_key}`);
        if (target.category === 'closed') {
          throw Boom.badRequest('Close the investigation to move it to a closed status.');
        }
      } else if (req.status !== undefined && req.status !== record.status) {
        target = getDefaultStatus(config.statuses, req.status);
      } else if (ownerStatusChange) {
        // Taking ownership only moves the default open status forward (and back); a custom
        // status someone chose is never overridden.
        const from = ownerStatusChange === 'in-progress' ? 'open' : 'in-progress';
        if (current.key === getDefaultStatus(config.statuses, from).key) {
          target = getDefaultStatus(config.statuses, ownerStatusChange);
        }
      }
      if (target && target.key === current.key) target = undefined;
      let pause: Partial<PauseFields> | undefined;
      try {
        pause = getPauseFieldsForUpdate({
          original: record,
          target,
          pauseReason: req.pause_reason,
          pauseReasons: config.pauseReasons,
          statuses: config.statuses,
          now: ts,
        });
      } catch (error) {
        if (error instanceof StatusRuleError) throw Boom.badRequest(error.message);
        throw error;
      }
      if (target) {
        patch.status = target.category;
        patch.status_key = target.key;
        if (target.category !== record.status) {
          casePatch.status =
            target.category === 'open' ? CaseStatuses.open : CaseStatuses['in-progress'];
        }
      }
      if (pause) Object.assign(patch, pause);
      if (target || pause?.pause_reason) {
        statusLogged = true;
        const resumed = pause?.paused_at === null && record.paused_at;
        log(
          'record.status_changed',
          target
            ? `Changed the status to ${target.label}${
                pause?.pause_reason ? ` (paused: ${pause.pause_reason})` : ''
              }${resumed ? ' and resumed time tracking' : ''}`
            : `Changed the pause reason to ${pause?.pause_reason}`,
          {
            before: {
              key: current.key,
              label: current.label,
              pause_reason: record.pause_reason ?? null,
            },
            after: target
              ? { key: target.key, label: target.label, pause_reason: pause?.pause_reason ?? null }
              : {
                  key: current.key,
                  label: current.label,
                  pause_reason: pause?.pause_reason ?? null,
                },
          }
        );
      }
    }
    const currentAccess = record.access?.mode ?? 'default';
    const nextAccess = req.access?.mode;
    const accessChanged = nextAccess !== undefined && nextAccess !== currentAccess;
    if (accessChanged) {
      patch.access = { mode: nextAccess };
      if (nextAccess === 'restricted') {
        // Restricting adds the person doing it to the assignees, so they keep access.
        const uid = this.deps.user.profileUid;
        const assigned = (
          (casePatch.assignees as Array<{ uid: string }> | undefined) ??
          theCase.assignees ??
          []
        ).map(({ uid: assignee }) => assignee);
        if (uid && !assigned.includes(uid)) {
          if (assigned.length + 1 > MAX_ASSIGNEES_PER_CASE) {
            throw Boom.badRequest(
              `Cannot restrict the investigation: the assignees limit of ${MAX_ASSIGNEES_PER_CASE} prevents adding you as an assignee.`
            );
          }
          casePatch.assignees = [...assigned, uid].map((assignee) => ({ uid: assignee }));
          patch.assignees = [...assigned, uid];
        }
      }
      log(
        'record.access_changed',
        nextAccess === 'restricted'
          ? 'Restricted the investigation to its assignees'
          : 'Made the investigation visible to everyone',
        { before: { mode: currentAccess }, after: { mode: nextAccess } }
      );
    }
    if (req.ai_enabled !== undefined && req.ai_enabled !== record.ai_enabled) {
      patch.ai_enabled = req.ai_enabled;
      log(
        'record.ai_changed',
        req.ai_enabled
          ? 'Enabled agents on this investigation'
          : 'Disabled agents on this investigation'
      );
    }
    if (patch.analyst_verdict !== undefined) {
      patch.human_verdict = patch.analyst_verdict?.verdict ?? null;
    }
    if (patch.agent_verdict !== undefined) {
      patch.ai_verdict = toAiVerdict(patch.agent_verdict);
    }
    if (patch.analyst_verdict !== undefined || patch.agent_verdict !== undefined) {
      const analyst =
        patch.analyst_verdict !== undefined ? patch.analyst_verdict : record.analyst_verdict;
      const agent = patch.agent_verdict !== undefined ? patch.agent_verdict : record.agent_verdict;
      patch.verdict_effective =
        record.close_outcome?.human_verdict ?? analyst?.verdict ?? agent?.classification ?? null;
    }
    if (casePatch.extended_fields && !Object.keys(casePatch.extended_fields).length) {
      delete casePatch.extended_fields;
    }
    if (!Object.keys(patch).length && !Object.keys(casePatch).length) {
      return this.toRecord(record, seqNo, primaryTerm);
    }
    const finalAssignees = (
      (casePatch.assignees as Array<{ uid: string }> | undefined) ??
      theCase.assignees ??
      []
    ).map(({ uid }) => uid);
    const finalAccess = patch.access?.mode ?? currentAccess;
    if (finalAccess === 'restricted' && finalAssignees.length === 0) {
      throw Boom.badRequest('A restricted investigation must have at least one assignee');
    }
    if (accessChanged) {
      await this.syncAlertCaseIds(recordId, nextAccess === 'restricted' ? 'remove' : 'add');
    }

    const caseWriteStartedAt = new Date().toISOString();
    if (Object.keys(casePatch).length) {
      const [updatedCase] = await this.deps.casesClient.cases.bulkUpdate({
        cases: [{ id: recordId, version: theCase.version, ...casePatch }],
      } as Parameters<CasesClient['cases']['bulkUpdate']>[0]);
      if (updatedCase && (casePatch.extended_fields || casePatch.template !== undefined)) {
        Object.assign(patch, await this.templatePatchFromCase(record, updatedCase));
      }
      // Choosing a type sets both the fields and the procedure (when none was applied yet).
      if (casePatch.template && !(record.counters?.tasks ?? 0)) {
        await this.applyProcedureInternal(
          { ...record, ...patch } as StoredRecord,
          (casePatch.template as { id: string }).id,
          false,
          actor,
          ts
        );
      }
    }
    patch.updated_at = ts;
    patch.updated_by = actor;
    try {
      await this.es.update({
        index: INVESTIGATION_RECORDS_INDEX,
        id: recordId,
        refresh: true,
        ...(req.version ? decodeVersion(req.version) : { retry_on_conflict: 3 }),
        // Replace top-level keys wholesale: a partial `doc` would deep-merge objects such as
        // analyst_verdict and keep stale nested values (e.g. an old reason).
        script: {
          lang: 'painless',
          source:
            'for (def e : params.patch.entrySet()) { ctx._source[e.getKey()] = e.getValue(); }',
          params: { patch },
        },
      });
    } catch (error) {
      if (error?.meta?.statusCode === 409) {
        throw Boom.conflict('The investigation was changed by someone else. Reload and try again.');
      }
      throw error;
    }
    await this.appendActivity(recordId, entries);
    if (Object.keys(casePatch).length) {
      await this.ingestCaseUserActions(record, {
        startedAt: caseWriteStartedAt,
        actor,
        ts,
        skipTypes: [
          ...(statusLogged || patch.owner !== undefined ? ['status'] : []),
          ...(patch.owner !== undefined ? ['assignees'] : []),
        ],
        details: req.priority_note ? { severity: req.priority_note } : undefined,
      });
    }
    await this.refreshCounters(recordId, actor, { touch: false });
    const { profileUid } = this.deps.user;
    if (finalAccess === 'restricted' && !(profileUid && finalAssignees.includes(profileUid))) {
      // The person who just left a restricted investigation can no longer read it.
      return this.toRecord({ ...record, ...patch } as StoredRecord);
    }
    return (await this.getRecord(recordId)).record;
  }

  public async closeRecord(
    recordId: string,
    req: CloseRecordRequest
  ): Promise<InvestigationRecord> {
    const { record, theCase } = await this.loadForWrite(recordId);
    if (record.status === 'closed') throw Boom.badRequest('The investigation is already closed.');
    const actor = this.actor(req.actor);
    const ts = this.ts(req.closed_at);
    await this.settleTaskWorkflows(
      recordId,
      await this.searchItems<TaskItem>(
        recordId,
        { bool: { filter: [term('kind', 'task'), term('task.workflow_run.status', 'running')] } },
        MAX_TASKS_PER_CASE
      )
    );
    const left = await this.searchItems<TaskItem>(
      recordId,
      {
        bool: {
          filter: [term('kind', 'task'), term('task.required', true)],
          must_not: [terms('status', ['completed', 'cancelled'])],
        },
      },
      MAX_TASKS_PER_CASE
    );
    if (left.length) {
      const values = { ...(theCase.extended_fields ?? {}), ...(req.extended_fields ?? {}) };
      const emptyFields = (await this.emptyRequiredFields(record, values))
        .filter((field) => field.onClose)
        .map((field) => field.label);
      throw Boom.badRequest(
        closeBlockedMessage(
          left.map((t) => t.title),
          emptyFields
        )
      );
    }

    const statusConfig = await this.getStatusesConfiguration();
    const closedStatus = req.status_key
      ? findStatusByKey(statusConfig.statuses, req.status_key)
      : getDefaultStatus(statusConfig.statuses, 'closed');
    if (!closedStatus || closedStatus.disabled || closedStatus.category !== 'closed') {
      throw Boom.badRequest(`Unknown closed status: ${req.status_key}`);
    }
    const closePause =
      getPauseFieldsForUpdate({
        original: record,
        target: closedStatus,
        pauseReasons: statusConfig.pauseReasons,
        statuses: statusConfig.statuses,
        now: ts,
      }) ?? {};
    const caseWriteStartedAt = new Date().toISOString();
    let caseVersion = theCase.version;
    const fieldsToSave = Object.fromEntries(
      Object.entries(req.extended_fields ?? {}).filter(
        ([key, value]) => (theCase.extended_fields?.[key] ?? '') !== value
      )
    );
    if (Object.keys(fieldsToSave).length) {
      const [updatedCase] = await this.deps.casesClient.cases.bulkUpdate({
        cases: [{ id: recordId, version: caseVersion, extended_fields: fieldsToSave }],
      } as Parameters<CasesClient['cases']['bulkUpdate']>[0]);
      caseVersion = updatedCase.version;
    }

    const closeReason = req.close_reason.trim();
    const humanVerdict =
      req.human_verdict !== undefined
        ? req.human_verdict
        : CLOSE_REASON_TO_VERDICT[closeReason] ?? null;
    try {
      await this.deps.casesClient.cases.bulkUpdate({
        cases: [
          {
            id: recordId,
            version: caseVersion,
            status: CaseStatuses.closed,
            ...(theCase.settings?.syncAlerts ? { closeReason } : {}),
          },
        ],
      } as Parameters<CasesClient['cases']['bulkUpdate']>[0]);
    } catch (error) {
      const fieldErrors = parseCaseFieldErrors(caseErrorMessage(error));
      if (!fieldErrors.length) throw error;
      throw Boom.badRequest(
        closeBlockedMessage(
          [],
          fieldErrors.map((e) => e.label ?? e.message)
        )
      );
    }
    const closingNotes = req.summary?.trim() ?? '';
    if (closingNotes) {
      await this.deps.casesClient.attachments.add({
        caseId: recordId,
        comment: {
          type: COMMENT_ATTACHMENT_TYPE,
          owner: INVESTIGATIONS_OWNER,
          data: { content: closingNotes },
        },
      });
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
              proposal: {
                decision: { by: actor, at: ts, reason: 'Investigation closed', note: null },
              },
            },
          },
        ]),
      });
    }

    const alertsClosed = await this.setAlertsStatus(recordId, 'closed');

    const outcome = {
      close_reason: closeReason,
      human_verdict: humanVerdict,
      summary: closingNotes || null,
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
        status_key: closedStatus.key,
        ...closePause,
        closed_at: ts,
        close_outcome: outcome,
        close_reason: closeReason,
        human_verdict: humanVerdict ?? record.analyst_verdict?.verdict ?? null,
        ...(humanVerdict
          ? {
              analyst_verdict: {
                verdict: humanVerdict,
                reason: `Closed as ${closeReasonLabel(closeReason)}`,
                set_by: actor,
                set_at: ts,
              },
            }
          : {}),
        verdict_effective:
          humanVerdict ??
          record.analyst_verdict?.verdict ??
          record.agent_verdict?.classification ??
          null,
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
        message: `Closed the investigation: ${closeReasonLabel(closeReason)}${
          humanVerdict ? ` (${VERDICT_LABELS[humanVerdict].toLowerCase()})` : ''
        }`,
        details: closingNotes || null,
        links: [{ kind: 'tab', id: 'overview', label: 'Outcome' }],
        before: record.close_outcome?.summary ?? null,
        after: closingNotes || null,
      },
    ];
    const automation: Actor = {
      type: 'automation',
      id: 'cases-investigations',
      name: 'Workflow',
      on_behalf_of: actor.name,
    };
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
    await this.ingestCaseUserActions(record, {
      startedAt: caseWriteStartedAt,
      actor,
      ts,
      skipTypes: ['status', ...(closingNotes ? ['comment'] : [])],
    });
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
          this.deps.logger.warn(
            `Investigation ${recordId}: alert status update failed for ${index}: ${error}`
          );
        }
      }
    }
    return count;
  }

  public async reopenRecord(recordId: string): Promise<InvestigationRecord> {
    const { record, theCase } = await this.loadForWrite(recordId);
    if (record.status !== 'closed') throw Boom.badRequest('The investigation is not closed.');
    if (record.merged_into) throw Boom.badRequest('A merged investigation cannot be reopened.');
    const actor = this.actor();
    const ts = now();
    const nextStatus = record.owner ? 'in-progress' : 'open';
    const statusConfig = await this.getStatusesConfiguration();
    const reopenTo = getDefaultStatus(statusConfig.statuses, nextStatus);
    const caseWriteStartedAt = new Date().toISOString();
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
        status_key: reopenTo.key,
        paused_at: null,
        pause_reason: null,
        resume_to_status_key: null,
        time_paused: 0,
        closed_at: null,
        close_outcome: null,
        close_reason: null,
        human_verdict: null,
        analyst_verdict: null,
        verdict_effective: record.agent_verdict?.classification ?? null,
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
    await this.ingestCaseUserActions(record, {
      startedAt: caseWriteStartedAt,
      actor,
      ts,
      skipTypes: ['status'],
    });
    await this.refreshCounters(recordId, actor, { touch: false });
    return (await this.getRecord(recordId)).record;
  }

  public async mergeRecord(
    recordId: string,
    otherId: string,
    keep: 'this' | 'other'
  ): Promise<MergeRecordResponse> {
    if (recordId === otherId) throw Boom.badRequest('Cannot merge an investigation with itself.');
    const [a, b] = await Promise.all([this.loadForWrite(recordId), this.loadForWrite(otherId)]);
    const primary = keep === 'this' ? a : b;
    const merged = keep === 'this' ? b : a;
    if (merged.record.merged_into || primary.record.merged_into) {
      throw Boom.badRequest('One of these investigations was already merged.');
    }
    const actor = this.actor();
    const ts = now();

    // Move items in pages, renumbering refs so they stay unique on the primary.
    let moved = 0;
    // Close the merged case first: if Cases refuses (close-required fields), nothing has moved.
    try {
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
    } catch (error) {
      const fieldErrors = parseCaseFieldErrors(caseErrorMessage(error));
      if (!fieldErrors.length) throw error;
      throw Boom.badRequest(
        `${merged.record.display_id} cannot be merged and closed yet. ${closeBlockedMessage(
          [],
          fieldErrors.map((e) => e.label ?? e.message)
        ).replace('The investigation cannot close yet. ', '')}`
      );
    }
    const kindCounts = await this.es.search({
      index: INVESTIGATION_ITEMS_INDEX,
      size: 0,
      query: term('record_id', merged.record.id),
      aggs: { kind: { terms: { field: 'kind', size: 20 } } },
    });
    const counts = toMap(buckets(kindCounts.aggregations?.kind)) as Partial<
      Record<ItemKind, number>
    >;
    const starts = await this.reserveRefs(primary.record.id, counts);
    const next: Record<string, number> = { ...starts };
    await this.scanItems<InvestigationItem>(
      merged.record.id,
      { match_all: {} },
      undefined,
      async (batch) => {
        const ops = batch.flatMap((item) => {
          const n = next[item.kind] ?? 1;
          next[item.kind] = n + 1;
          const ref = `${ITEM_REF_PREFIX[item.kind]}${n}`;
          const { version: _v, ...doc } = item;
          return [
            { index: { _index: INVESTIGATION_ITEMS_INDEX, _id: item.id } },
            {
              ...doc,
              record_id: primary.record.id,
              ref,
              ref_num: n,
              links: [
                ...(item.links ?? []),
                { relation: 'derived_from', target_id: merged.record.id },
              ],
            },
          ];
        });
        if (ops.length) {
          await this.es.bulk({ refresh: false, operations: ops });
          moved += batch.length;
        }
      }
    );
    await this.es.indices.refresh({ index: INVESTIGATION_ITEMS_INDEX });

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
        merged_from: Array.from(
          new Set([
            ...(primary.record.merged_from ?? []),
            merged.record.id,
            ...(merged.record.merged_from ?? []),
          ])
        ),
        conversation_ids: Array.from(
          new Set([
            ...(primary.record.conversation_ids ?? []),
            ...(merged.record.conversation_ids ?? []),
          ])
        ),
        threads: [...(primary.record.threads ?? []), ...(merged.record.threads ?? [])].slice(
          0,
          INVESTIGATION_LIMITS.maxThreads
        ),
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
    const [p, m] = await Promise.all([
      this.getRecord(primary.record.id),
      this.getRecord(merged.record.id),
    ]);
    return { primary: p.record, merged: m.record, items_moved: moved };
  }

  /* ---------------------------------------------------------------- */
  /* Procedure templates and investigation types                       */
  /* ---------------------------------------------------------------- */

  /** The space's status list and pause reasons (built-in statuses until someone configures them). */
  public async getStatusesConfiguration(): Promise<StatusesConfiguration> {
    const res = await this.es
      .get<{ statuses?: CaseStatusConfiguration[]; pauseReasons?: string[] }>({
        index: INVESTIGATION_CONFIG_INDEX,
        id: `statuses:${this.deps.spaceId}`,
      })
      .catch((error) => {
        if (error?.meta?.statusCode === 404) return undefined;
        throw error;
      });
    return {
      statuses: getEffectiveStatuses(res?._source?.statuses),
      pauseReasons: res?._source?.pauseReasons ?? [],
      version:
        res?._seq_no !== undefined && res?._primary_term !== undefined
          ? encodeVersion(res._seq_no, res._primary_term)
          : null,
    };
  }

  public async saveStatusesConfiguration(
    req: StatusesConfiguration
  ): Promise<StatusesConfiguration> {
    if (!(await this.deps.canManageSettings())) {
      throw Boom.forbidden('You need the Cases settings privilege to change statuses.');
    }
    const current = await this.getStatusesConfiguration();
    if ((req.version ?? null) !== (current.version ?? null)) {
      throw Boom.conflict('The statuses were changed by someone else. Reload and try again.');
    }
    const statuses = req.statuses.map((status) => ({ ...status, label: status.label.trim() }));
    const pauseReasons = req.pauseReasons.map((reason) => reason.trim());
    const problem =
      validateStatusesConfiguration(statuses, current.statuses) ??
      validatePauseReasons(pauseReasons, statuses);
    if (problem) throw Boom.badRequest(problem);
    await this.es.index({
      index: INVESTIGATION_CONFIG_INDEX,
      id: `statuses:${this.deps.spaceId}`,
      refresh: true,
      ...(current.version ? decodeVersion(current.version) : { op_type: 'create' as const }),
      document: {
        doc_type: 'statuses',
        space_id: this.deps.spaceId,
        statuses,
        pauseReasons,
        updated_at: now(),
        updated_by: this.actor(),
      },
    });
    return this.getStatusesConfiguration();
  }

  /** Investigation types are the owner's enabled Cases templates tagged `investigation-type`. */
  public async listTypes(): Promise<InvestigationType[]> {
    const { casesClient } = this.deps;
    const found = await casesClient.templates.getAllTemplates({
      owner: [INVESTIGATIONS_OWNER],
      tags: [INVESTIGATION_TYPE_TEMPLATE_TAG],
      page: 1,
      perPage: 100,
      sortField: 'name',
      sortOrder: 'asc',
      search: '',
      author: [],
      isDeleted: false,
      isEnabled: true,
    });
    return Promise.all(
      found.templates.map(async (template) => {
        const { fields } = await casesClient.cases.getApplicableFields({
          owner: INVESTIGATIONS_OWNER,
          templateId: template.templateId,
        });
        return {
          name: template.name,
          template_id: template.templateId,
          version: template.templateVersion,
          description: template.description ?? null,
          fields: fields.map((field) => ({
            key: field.key,
            name: field.name,
            label: field.label,
            type: field.type,
            control: field.control,
            mirror_key: getMirrorKey(field.name, field.type, field.control),
            ...(field.options ? { options: [...field.options] } : {}),
            required: field.required,
            required_on_close: field.requiredOnClose,
            display_only: field.displayOnly,
          })),
        };
      })
    );
  }

  /** One procedure (task list) per investigation type, keyed by the Cases template id. */
  public async listProcedureTemplates(): Promise<ProcedureTemplate[]> {
    await this.ensureCanReadOwner();
    const [types, res] = await Promise.all([
      this.listTypes(),
      this.es.search<{
        template_id: string;
        tasks: ProcedureTemplateTask[];
        updated_at: string;
        updated_by: Actor;
      }>({
        index: INVESTIGATION_CONFIG_INDEX,
        size: 100,
        seq_no_primary_term: true,
        query: {
          bool: {
            filter: [term('doc_type', 'procedure_template'), term('space_id', this.deps.spaceId)],
          },
        },
      }),
    ]);
    const stored = new Map(res.hits.hits.map((h) => [h._source?.template_id ?? '', h]));
    return types.map((type) => {
      const hit = stored.get(type.template_id);
      if (hit?._source) {
        return {
          template_id: type.template_id,
          type: type.name,
          tasks: hit._source.tasks,
          updated_at: hit._source.updated_at,
          updated_by: hit._source.updated_by,
          saved: true,
          version: encodeVersion(hit._seq_no, hit._primary_term),
        };
      }
      return {
        template_id: type.template_id,
        type: type.name,
        tasks: DEFAULT_PROCEDURE_TEMPLATES[type.name] ?? [],
        updated_at: null,
        updated_by: null,
        saved: false,
      };
    });
  }

  public async saveProcedureTemplate(
    templateId: string,
    tasks: ProcedureTemplateTask[]
  ): Promise<ProcedureTemplate> {
    await this.ensureCanReadOwner();
    if (!(await this.deps.canManageSettings())) {
      throw Boom.forbidden('You need the Cases settings privilege to change procedures.');
    }
    const template = await this.getInvestigationTemplate(templateId);
    const total = tasks.reduce((n, t) => n + 1 + (t.subtasks?.length ?? 0), 0);
    if (total > MAX_TASKS_PER_CASE) {
      throw Boom.badRequest(`A procedure can have at most ${MAX_TASKS_PER_CASE} tasks`);
    }
    const actor = this.actor();
    const ts = now();
    const res = await this.es.index({
      index: INVESTIGATION_CONFIG_INDEX,
      id: `procedure_template:${this.deps.spaceId}:${template.id}`,
      refresh: true,
      document: {
        doc_type: 'procedure_template',
        space_id: this.deps.spaceId,
        template_id: template.id,
        type: template.name,
        tasks,
        updated_at: ts,
        updated_by: actor,
      },
    });
    return {
      template_id: template.id,
      type: template.name,
      tasks,
      updated_at: ts,
      updated_by: actor,
      saved: true,
      version: encodeVersion(res._seq_no, res._primary_term),
    };
  }

  /** The procedure for a record: its type's task list, or the built-in default for its type name. */
  private async procedureFor(
    templateId: string | null | undefined,
    typeName: string
  ): Promise<{ name: string; tasks: ProcedureTemplateTask[] } | null> {
    if (templateId) {
      const found = (await this.listProcedureTemplates()).find((t) => t.template_id === templateId);
      if (found) return { name: found.type, tasks: found.tasks };
    }
    const fallback = DEFAULT_PROCEDURE_TEMPLATES[typeName];
    return fallback ? { name: typeName, tasks: fallback } : null;
  }

  public async applyProcedure(
    recordId: string,
    templateId: string | null,
    replace: boolean
  ): Promise<TaskItem[]> {
    const { record } = await this.loadForWrite(recordId);
    const actor = this.actor();
    const tasks = await this.applyProcedureInternal(
      record,
      templateId ?? record.template_id ?? null,
      replace,
      actor,
      now()
    );
    await this.refreshCounters(recordId, actor);
    return tasks;
  }

  private async applyProcedureInternal(
    record: StoredRecord,
    templateId: string | null,
    replace: boolean,
    actor: Actor,
    ts: string
  ): Promise<TaskItem[]> {
    const template = await this.procedureFor(templateId, record.investigation_type);
    if (!template) {
      this.deps.logger.debug(`No procedure for investigation type "${record.investigation_type}"`);
      return [];
    }
    const type = template.name;
    const existing = await this.searchItems<TaskItem>(
      record.id,
      term('kind', 'task'),
      MAX_TASKS_PER_CASE
    );
    const keptTitles = new Set<string>();
    if (replace) {
      const removable = existing.filter((t) => !isTaskFinished(t.status));
      existing
        .filter((t) => isTaskFinished(t.status))
        .forEach((t) => keptTitles.add(t.title.toLowerCase()));
      if (removable.length) {
        await this.es.deleteByQuery({
          index: INVESTIGATION_ITEMS_INDEX,
          refresh: true,
          query: {
            bool: {
              filter: [
                term('record_id', record.id),
                terms(
                  'id',
                  removable.map((t) => t.id)
                ),
              ],
            },
          },
        });
      }
    } else {
      existing.forEach((t) => keptTitles.add(t.title.toLowerCase()));
    }
    const claims = await this.searchItems<ClaimItem>(record.id, term('kind', 'claim'), 1000);
    const toCreate = template.tasks.filter((t) => !keptTitles.has(t.title.toLowerCase()));
    const kept = replace ? existing.filter((t) => isTaskFinished(t.status)) : existing;
    const newCount = toCreate.reduce((n, t) => n + 1 + (t.subtasks?.length ?? 0), 0);
    if (kept.length + newCount > MAX_TASKS_PER_CASE) {
      throw Boom.badRequest(`An investigation can have at most ${MAX_TASKS_PER_CASE} tasks`);
    }
    const lastRoot = Math.max(
      0,
      ...kept.filter((t) => !t.task.parent_task_id).map((t) => t.task.sort_order ?? 0)
    );
    const ids = toCreate.map(() => uuidv4());
    const idByTitle = new Map<string, string>();
    toCreate.forEach((t, i) => idByTitle.set(t.title.toLowerCase(), ids[i]));
    existing.forEach((t) => idByTitle.set(t.title.toLowerCase(), t.id));
    const inputs: Array<ItemInput & { _id?: string }> = toCreate.map((t, i) => {
      const owner =
        t.owner_type === 'agent'
          ? {
              type: 'agent' as const,
              id: record.agent_id ?? this.deps.agent.agentId,
              name: record.agent_name ?? this.deps.agent.agentName,
            }
          : t.owner_type === 'automation'
          ? { type: 'automation' as const, id: 'workflow', name: 'Workflow' }
          : t.owner_type === 'team'
          ? {
              type: 'team' as const,
              id: t.owner ?? 'Security Ops',
              name: t.owner ?? 'Security Ops',
            }
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
        status: 'open',
        task: {
          phase: t.phase,
          description: t.description ?? null,
          required: t.required,
          owner,
          depends_on: t.after ? idByTitle.get(t.after.toLowerCase()) ?? null : null,
          auto,
          cancel_reason: null,
          note: null,
          completed_by: null,
          started_at: null,
          completed_at: null,
          template_ref: template.name,
          priority: t.priority ?? 'medium',
          assignees: [],
          due_date: dueDateFrom(t.due_within, ts),
          sort_order: lastRoot + (i + 1) * TASK_SORT_ORDER_GAP,
          parent_task_id: null,
          workflow_id: t.owner_type === 'automation' ? t.workflow_id ?? null : null,
          workflow_run: null,
        },
      };
    });
    const subtaskInputs: Array<ItemInput & { _id?: string }> = toCreate.flatMap((t, i) =>
      (t.subtasks ?? []).map((sub, j) => ({
        _id: uuidv4(),
        kind: 'task' as const,
        title: sub.title,
        status: 'open' as const,
        task: {
          phase: t.phase,
          description: sub.description ?? null,
          required: sub.required,
          owner: { type: 'person' as const, id: null, name: null },
          depends_on: null,
          auto: null,
          cancel_reason: null,
          note: null,
          completed_by: null,
          started_at: null,
          completed_at: null,
          template_ref: template.name,
          priority: sub.priority ?? t.priority ?? 'medium',
          assignees: [],
          due_date: dueDateFrom(sub.due_within, ts),
          sort_order: (j + 1) * TASK_SORT_ORDER_GAP,
          parent_task_id: ids[i],
          workflow_id: null,
          workflow_run: null,
        },
      }))
    );
    const all = [...inputs, ...subtaskInputs];
    const created = all.length
      ? (await this.bulkCreateItemsInternal(record, all, actor, { silent: true, ts })).items
      : [];
    const required = template.tasks.filter((t) => t.required).length;
    await this.appendActivity(record.id, [
      {
        ts,
        actor,
        action: 'procedure.applied',
        message: `Applied the ${type} procedure`,
        details: `${plural(template.tasks.length, 'task')}, ${required} required.${
          replace ? ' Unfinished tasks from the previous procedure were removed.' : ''
        }`,
        links: [{ kind: 'tab', id: 'procedure', label: 'Procedure' }],
      },
    ]);
    return created as TaskItem[];
  }

  /* ---------------------------------------------------------------- */
  /* Items                                                             */
  /* ---------------------------------------------------------------- */

  /** Task-list limits: 100 tasks per record, one level of subtasks, 100 comments per task. */
  private async ensureTaskLimits(
    recordId: string,
    inputs: Array<ItemInput & { _id?: string }>
  ): Promise<void> {
    const newTasks = inputs.filter(
      (input): input is Extract<ItemInput, { kind: 'task' }> & { _id?: string } =>
        input.kind === 'task'
    );
    const taskComments = inputs.filter(
      (input): input is Extract<ItemInput, { kind: 'comment' }> => input.kind === 'comment'
    );
    if (!newTasks.length && !taskComments.length) return;
    const existing = await this.searchItems<TaskItem>(
      recordId,
      term('kind', 'task'),
      MAX_TASKS_PER_CASE + 1
    );
    if (newTasks.length && existing.length + newTasks.length > MAX_TASKS_PER_CASE) {
      throw Boom.badRequest(`An investigation can have at most ${MAX_TASKS_PER_CASE} tasks`);
    }
    const byId = new Map<string, { parent: string | null }>(
      existing.map((t) => [t.id, { parent: t.task.parent_task_id ?? null }])
    );
    for (const task of newTasks) {
      if (task._id) byId.set(task._id, { parent: task.task.parent_task_id ?? null });
    }
    for (const task of newTasks) {
      const parentId = task.task.parent_task_id;
      if (parentId) {
        const parent = byId.get(parentId);
        if (!parent) throw Boom.badRequest(`Parent task ${parentId} is not in this investigation`);
        if (parent.parent) throw Boom.badRequest('Sub-tasks cannot have their own sub-tasks');
      }
    }
    const lastSortOrder = new Map<string | null, number>();
    for (const t of existing) {
      const key = t.task.parent_task_id ?? null;
      lastSortOrder.set(key, Math.max(lastSortOrder.get(key) ?? 0, t.task.sort_order ?? 0));
    }
    for (const task of newTasks) {
      if (!task.task.sort_order) {
        const key = task.task.parent_task_id ?? null;
        const next = (lastSortOrder.get(key) ?? 0) + TASK_SORT_ORDER_GAP;
        task.task.sort_order = next;
        lastSortOrder.set(key, next);
      }
    }
    const taskIds = new Set(existing.map((t) => t.id));
    const perTask = new Map<string, number>();
    for (const comment of taskComments) {
      const target = comment.comment.target_id;
      if (taskIds.has(target)) perTask.set(target, (perTask.get(target) ?? 0) + 1);
    }
    for (const [taskId, adding] of perTask) {
      const { count } = await this.es.count({
        index: INVESTIGATION_ITEMS_INDEX,
        query: {
          bool: {
            filter: [
              term('record_id', recordId),
              term('kind', 'comment'),
              term('comment.target_id', taskId),
            ],
          },
        },
      });
      if (count + adding > MAX_COMMENTS_PER_TASK) {
        throw Boom.badRequest(`A task can have at most ${MAX_COMMENTS_PER_TASK} comments`);
      }
    }
  }

  /** Sets `sort_order` for sibling tasks (all roots, or the subtasks of one parent). */
  public async reorderTasks(recordId: string, taskIds: string[]): Promise<TaskItem[]> {
    await this.loadForWrite(recordId);
    const tasks = await this.searchItems<TaskItem>(
      recordId,
      { bool: { filter: [term('kind', 'task'), terms('id', taskIds)] } },
      MAX_TASKS_PER_CASE
    );
    const found = new Set(tasks.map((t) => t.id));
    const foreign = taskIds.filter((taskId) => !found.has(taskId));
    if (foreign.length) {
      throw Boom.badRequest(`Tasks ${foreign.join(', ')} do not belong to this investigation`);
    }
    const parents = new Set(tasks.map((t) => t.task.parent_task_id ?? null));
    if (parents.size > 1) throw Boom.badRequest('Reorder tasks that share the same parent');
    await this.es.bulk({
      refresh: true,
      operations: taskIds.flatMap((taskId, index) => [
        { update: { _index: INVESTIGATION_ITEMS_INDEX, _id: taskId } },
        { doc: { task: { sort_order: (index + 1) * TASK_SORT_ORDER_GAP } } },
      ]),
    });
    await this.appendActivity(recordId, [
      {
        ts: now(),
        actor: this.actor(),
        action: 'procedure.reordered',
        message: `Reordered ${plural(taskIds.length, 'task')}`,
        links: [{ kind: 'tab', id: 'procedure', label: 'Procedure' }],
      },
    ]);
    return orderTasks(
      await this.searchItems<TaskItem>(recordId, term('kind', 'task'), MAX_TASKS_PER_CASE)
    );
  }

  /** Starts the workflow of an automation task; the task completes when the run succeeds. */
  public async runTaskWorkflow(recordId: string, taskId: string): Promise<TaskItem> {
    const { record } = await this.loadForWrite(recordId);
    const found = await this.getItemUnchecked(recordId, taskId);
    if (found.kind !== 'task') throw Boom.badRequest('Only tasks can run a workflow.');
    const task = await this.refreshTaskWorkflow(recordId, found as TaskItem);
    if (isTaskFinished(task.status)) {
      throw Boom.badRequest(`Task "${task.title}" is already finished.`);
    }
    if (task.task.workflow_run?.status === 'running') {
      throw Boom.conflict(`Task "${task.title}" already has a workflow run in progress.`);
    }
    const workflowId = task.task.workflow_id;
    if (!workflowId) throw Boom.badRequest(`Task "${task.title}" has no workflow to run.`);
    const { workflows } = this.deps;
    if (!workflows?.isAvailable()) throw Boom.forbidden('Workflows are not available.');
    if (!(await workflows.canExecute())) {
      throw Boom.forbidden('You need the Workflows execute privilege to run this workflow.');
    }
    const { executionId } = await workflows.run({ workflowId, caseId: record.case_id });
    const actor = this.actor();
    const ts = now();
    const workflowRun: TaskWorkflowRun = {
      execution_id: executionId,
      status: 'running',
      started_at: ts,
      finished_at: null,
      error: null,
    };
    const updated = await this.writeTaskWorkflowRun(
      task,
      { updated_at: ts, updated_by: actor, task: { workflow_run: workflowRun } },
      {
        ...task,
        updated_at: ts,
        updated_by: actor,
        task: { ...task.task, workflow_run: workflowRun },
      }
    );
    if (!updated) {
      throw Boom.conflict(
        `Task "${task.title}" was changed by someone else. Reload it and try again.`
      );
    }
    await this.appendActivity(recordId, [
      {
        ts,
        actor,
        action: 'task.workflow_run',
        target: { kind: 'task', id: task.id, ref: task.ref, title: task.title },
        message: `Started the workflow for task "${clip(task.title, 120)}"`,
        details: `Workflow ${workflowId}, execution ${executionId}.`,
        links: [{ kind: 'task', id: task.id, label: task.ref }],
      },
    ]);
    return updated;
  }

  /** Partial update of a task guarded by its version; null when someone else changed it first. */
  private async writeTaskWorkflowRun(
    task: TaskItem,
    doc: Record<string, unknown>,
    base: TaskItem
  ): Promise<TaskItem | null> {
    try {
      const res = await this.es.update<StoredItem, Record<string, unknown>>({
        index: INVESTIGATION_ITEMS_INDEX,
        id: task.id,
        refresh: true,
        ...decodeVersion(task.version ?? ''),
        doc,
      });
      return { ...base, version: encodeVersion(res._seq_no, res._primary_term) };
    } catch (error) {
      if (error?.meta?.statusCode === 409) return null;
      throw error;
    }
  }

  /**
   * Reads the status of a running workflow. A succeeded run completes the task (by an automation
   * actor naming the workflow); a failed run records the error and leaves the task unfinished.
   */
  public async refreshTaskWorkflow(recordId: string, task: TaskItem): Promise<TaskItem> {
    const run = task.task.workflow_run;
    const { workflows } = this.deps;
    if (run?.status !== 'running' || !workflows) return task;
    let execution: TaskWorkflowExecution | null = null;
    try {
      execution = await workflows.getExecution(run.execution_id);
    } catch (error) {
      this.deps.logger.warn(`Could not read workflow execution ${run.execution_id}: ${error}`);
      return task;
    }
    if (!execution) {
      if (Date.now() - Date.parse(run.started_at) < TASK_WORKFLOW_LOST_AFTER_MS) return task;
      execution = { status: 'failed', error: 'The workflow run could not be found.' };
    }
    if (execution.status === 'running') return task;
    const ts = now();
    const finishedAt = execution.finishedAt || ts;
    const workflowId = task.task.workflow_id ?? 'workflow';
    const workflowName = execution.workflowName ?? workflowId;
    const automation: Actor = { type: 'automation', id: workflowId, name: workflowName };
    const succeeded = execution.status === 'succeeded';
    const completes = succeeded && !isTaskFinished(task.status);
    const nextRun = {
      ...run,
      status: execution.status,
      finished_at: finishedAt,
      error: succeeded ? null : execution.error || 'The workflow run failed.',
    };
    const completion = completes
      ? {
          completed_by: automation,
          completed_at: finishedAt,
          cancel_reason: null,
          note: `Completed when the run of the workflow "${workflowName}" succeeded.`,
        }
      : {};
    const updated = await this.writeTaskWorkflowRun(
      task,
      {
        updated_at: ts,
        updated_by: automation,
        ...(completes ? { status: 'completed' } : {}),
        task: { workflow_run: nextRun, ...completion },
      },
      {
        ...task,
        ...(completes ? { status: 'completed' as const } : {}),
        updated_at: ts,
        updated_by: automation,
        task: { ...task.task, workflow_run: nextRun, ...completion },
      }
    );
    if (!updated) return task;
    await this.appendActivity(recordId, [
      {
        ts,
        actor: automation,
        action: 'task.workflow_run',
        target: { kind: 'task', id: task.id, ref: task.ref, title: task.title },
        message: succeeded
          ? `Workflow "${clip(workflowName, 100)}" ${
              completes ? 'completed' : 'succeeded for'
            } task "${clip(task.title, 120)}"`
          : `Workflow "${clip(workflowName, 100)}" failed for task "${clip(task.title, 120)}"`,
        details: succeeded ? null : nextRun.error,
        links: [{ kind: 'task', id: task.id, label: task.ref }],
      },
    ]);
    if (completes) await this.refreshCounters(recordId, automation);
    return updated;
  }

  /** Refreshes the running workflow of every task in `items`; other items pass through. */
  private async settleTaskWorkflows<T extends InvestigationItem>(
    recordId: string,
    items: T[]
  ): Promise<T[]> {
    if (!this.deps.workflows) return items;
    const running = items.filter(
      (item): item is T & TaskItem =>
        item.kind === 'task' && (item as TaskItem).task.workflow_run?.status === 'running'
    );
    if (!running.length) return items;
    const settled = new Map<string, TaskItem>();
    await Promise.all(
      running.map(async (item) => {
        settled.set(item.id, await this.refreshTaskWorkflow(recordId, item));
      })
    );
    return items.map((item) => (settled.get(item.id) as T | undefined) ?? item);
  }

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
        ...(sourceIncludes
          ? {
              _source: { includes: [...sourceIncludes, 'id', 'kind', 'ref', 'title', 'record_id'] },
            }
          : {}),
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

  private buildItemQuery(
    recordId: string,
    req: FindItemsRequest
  ): {
    query: QueryDslQueryContainer;
    postFilter: QueryDslQueryContainer[];
  } {
    const filter: QueryDslQueryContainer[] = [term('record_id', recordId)];
    const postFilter: QueryDslQueryContainer[] = [];
    if (req.kind?.length) filter.push(terms('kind', req.kind));
    if (req.target_id) filter.push(term('comment.target_id', req.target_id));
    if (req.ids?.length) filter.push(terms('id', req.ids));
    if (req.refs?.length)
      filter.push(
        terms(
          'ref',
          req.refs.map((r) => r.toLowerCase())
        )
      );
    if (req.created_after) filter.push({ range: { created_at: { gt: req.created_after } } });
    if (req.type?.length) postFilter.push(terms('evidence.type', req.type));
    if (req.indicator_type?.length)
      postFilter.push(
        terms('evidence.indicator.type', expandIndicatorTypeFilter(req.indicator_type))
      );
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
            fields: [
              'title^3',
              'text',
              'evidence.why',
              'claim.question^2',
              'claim.conclusion',
              'claim.note',
              'task.description',
            ],
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
      if (lower.length >= 3) {
        // Substring match on short keyword fields; bounded by the record_id filter.
        const pattern = `*${lower.replace(/[\\*?]/g, (c) => `\\${c}`)}*`;
        should.push({ wildcard: { 'evidence.indicator.value': { value: pattern } } });
        should.push({ wildcard: { 'title.keyword': { value: pattern } } });
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
  public async findItemsUnchecked(
    recordId: string,
    req: FindItemsRequest
  ): Promise<FindItemsResponse> {
    const perPage = Math.min(
      req.per_page ?? INVESTIGATION_LIMITS.defaultPerPage,
      INVESTIGATION_LIMITS.maxPerPage
    );
    const page = Math.max(req.page ?? 1, 1);
    const { query, postFilter } = this.buildItemQuery(recordId, req);
    const sortField = ITEM_SORT_FIELDS[req.sort_field ?? 'ref_num'] ?? 'ref_num';
    const sort: Sort = [
      { [sortField]: { order: req.sort_order ?? 'asc', unmapped_type: 'keyword' } },
      { id: { order: 'asc' } },
    ];
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
              indicator_type: { terms: { field: 'evidence.indicator.type', size: 40 } },
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
          const top = (
            b as unknown as { who: { hits: { hits: Array<{ _source: { created_by: Actor } }> } } }
          ).who.hits.hits[0];
          const who = top?._source.created_by;
          return {
            id: b.key,
            name: who?.name ?? b.key,
            type: who?.type ?? 'user',
            count: b.doc_count,
          };
        }),
      };
    }
    return {
      items: await this.settleTaskWorkflows(
        recordId,
        hits.map((h) => this.toItem(h))
      ),
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
    const doc = await this.es.get<StoredItem>(
      { index: INVESTIGATION_ITEMS_INDEX, id: itemId },
      { ignore: [404] }
    );
    if (!doc.found || !doc._source || doc._source.record_id !== recordId) {
      throw Boom.notFound(`Item ${itemId} not found`);
    }
    return this.toItem(doc as unknown as SearchHit<StoredItem>);
  }

  public async bulkCreateItems(
    recordId: string,
    req: BulkCreateItemsRequest
  ): Promise<BulkCreateItemsResponse> {
    const { record } = await this.loadForWrite(recordId);
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
    rawInputs: Array<ItemInput & { _id?: string }>,
    actor: Actor,
    opts: { extractIndicators?: boolean; linkAlerts?: boolean; silent?: boolean; ts?: string } = {}
  ): Promise<{ items: InvestigationItem[]; errors: Array<{ index: number; message: string }> }> {
    if (!rawInputs.length) return { items: [], errors: [] };
    // Item 13: indicator types are Cases observable type keys, values go through the Cases validators.
    const checked = await this.checkIndicatorInputs(rawInputs);
    const { inputs, originalIndex } = checked;
    if (!inputs.length) return { items: [], errors: checked.errors };
    const counts: Partial<Record<ItemKind, number>> = {};
    for (const input of inputs) counts[input.kind] = (counts[input.kind] ?? 0) + 1;
    await this.ensureTaskLimits(record.id, inputs);
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
      operations: docs.flatMap((doc) => [
        { create: { _index: INVESTIGATION_ITEMS_INDEX, _id: doc.id } },
        doc,
      ]),
    });
    const errors: Array<{ index: number; message: string }> = [...checked.errors];
    const created: StoredItem[] = [];
    res.items.forEach((entry, i) => {
      const op = entry.create;
      if (op?.error) {
        errors.push({ index: originalIndex[i], message: op.error.reason ?? op.error.type });
      } else created.push(docs[i]);
    });
    const items = created.map(
      (doc, i) =>
        ({
          ...doc,
          version: encodeVersion(
            res.items[i]?.create?._seq_no,
            res.items[i]?.create?._primary_term
          ),
        } as unknown as InvestigationItem)
    );

    const alerts = items.filter(
      (i): i is EvidenceItem =>
        i.kind === 'evidence' && i.evidence.type === 'alert' && !!i.evidence.alert?.id
    );
    if (alerts.length && opts.linkAlerts && record.access?.mode !== 'restricted') {
      // A restricted investigation never shows up on its alerts.
      await this.linkAlerts(record.id, alerts);
    }
    if (alerts.length && opts.extractIndicators) {
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
      const link = {
        kind: item.kind === 'timeline_event' ? ('record' as const) : (item.kind as 'evidence'),
        id: item.id,
        label: item.ref,
      };
      const verb: Record<ItemKind, string> = {
        evidence: `Added evidence ${describeItem(item)}`,
        claim: `Opened claim ${describeItem(item)}`,
        entity: `Added ${item.title} to the scope`,
        link: `Linked ${item.title}`,
        task: `Added task "${clip(item.title, 120)}"`,
        comment: `Commented${
          item.kind === 'comment' &&
          (item as { comment: { target_id: string } }).comment.target_id !== item.record_id
            ? ' on an item'
            : ''
        }`,
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
      const key =
        item.kind === 'evidence'
          ? EVIDENCE_TYPE_LABELS[item.evidence.type].toLowerCase()
          : item.kind.replace('_', ' ');
      byKind.set(key, (byKind.get(key) ?? 0) + 1);
    }
    const allEvidence = items.every((i) => i.kind === 'evidence');
    return {
      ts: when,
      actor,
      action: 'items.created',
      message: allEvidence
        ? `Added ${plural(items.length, 'evidence item')}`
        : `Added ${plural(items.length, 'item')}`,
      details: Array.from(byKind.entries())
        .map(([k, n]) => (n === 1 ? `1 ${k}` : `${n.toLocaleString('en-US')} ${pluralNoun(k)}`))
        .join(', '),
      links: [
        {
          kind: 'tab',
          id: allEvidence ? 'evidence' : 'overview',
          label: allEvidence ? 'Evidence' : 'Overview',
        },
      ],
    };
  }

  /** Server-side normalisation and invariants shared by create and update. */
  private normalizeItem(doc: StoredItem, actor: Actor, isCreate: boolean): StoredItem {
    if (doc.kind === 'evidence') {
      const ev = doc.evidence;
      if (ev.indicator?.value) {
        const value = ev.indicator.value.trim();
        // Old short names (ip, file_hash, ...) become the Cases key; custom keys stay as they are.
        ev.indicator = {
          type: matchIndicatorTypeKey(ev.indicator.type, value) ?? ev.indicator.type,
          value,
        };
      }
      if (ev.snapshot && !ev.snapshot_hash) {
        ev.snapshot_hash =
          ev.snapshot.kind === 'file' && ev.snapshot.sha256
            ? ev.snapshot.sha256
            : hashSnapshot(ev.snapshot);
      }
      if (ev.snapshot && !ev.preserved_at) ev.preserved_at = doc.created_at;
    }
    if (doc.kind === 'claim') {
      doc.claim.supporting_evidence_ids = doc.claim.supporting_evidence_ids ?? [];
      doc.claim.opposing_evidence_ids = doc.claim.opposing_evidence_ids ?? [];
      doc.claim.gaps = doc.claim.gaps ?? [];
      if (actor.type === 'agent' && isCreate) doc.claim.needs_review = true;
      doc.title =
        doc.claim.conclusion && (doc.status === 'supported' || doc.status === 'refuted')
          ? doc.claim.conclusion
          : doc.claim.question;
    }
    if (doc.kind === 'entity') {
      doc.entity.evidence_ids = doc.entity.evidence_ids ?? [];
      doc.entity.attributes = doc.entity.attributes ?? [];
      doc.entity.tags = doc.entity.tags ?? [];
      doc.title = doc.entity.name;
    }
    if (doc.kind === 'task') {
      if (doc.status === 'cancelled' && !doc.task.cancel_reason) {
        throw Boom.badRequest(`Task "${doc.title}" needs a reason to be cancelled`);
      }
      doc.task.priority = doc.task.priority ?? 'medium';
      doc.task.assignees = doc.task.assignees ?? [];
      doc.task.due_date = doc.task.due_date ?? null;
      doc.task.parent_task_id = doc.task.parent_task_id ?? null;
      doc.task.sort_order = doc.task.sort_order ?? 0;
    }
    return doc;
  }

  private async linkAlerts(recordId: string, alerts: EvidenceItem[]): Promise<void> {
    const alertsClient = await this.deps.getAlertsClient().catch(() => undefined);
    if (!alertsClient) return;
    const refs = alerts.map((a) => ({
      id: a.evidence.alert?.id as string,
      index: a.evidence.alert?.index as string,
    }));
    for (let i = 0; i < refs.length; i += 1000) {
      try {
        await alertsClient.bulkUpdateCases({
          alerts: refs.slice(i, i + 1000),
          caseIds: [recordId],
        });
      } catch (error) {
        this.deps.logger.warn(
          `Investigation ${recordId}: could not record the case on alerts: ${error}`
        );
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* Item 13: observables use the Cases definitions                    */
  /* ---------------------------------------------------------------- */

  /**
   * Resolves every indicator input to a Cases observable type key and validates its value with the
   * Cases validators. Invalid inputs are reported by their position and left out.
   */
  private async checkIndicatorInputs<T extends ItemInput>(
    raw: T[]
  ): Promise<{
    inputs: T[];
    originalIndex: number[];
    errors: Array<{ index: number; message: string }>;
  }> {
    const hasIndicator = (input: ItemInput): boolean =>
      input.kind === 'evidence' && !!input.evidence.indicator?.value;
    if (!raw.some(hasIndicator)) {
      return { inputs: raw, originalIndex: raw.map((_, index) => index), errors: [] };
    }
    const types = await getObservableTypes(this.deps.casesClient);
    const inputs: T[] = [];
    const originalIndex: number[] = [];
    const errors: Array<{ index: number; message: string }> = [];
    raw.forEach((input, index) => {
      if (input.kind !== 'evidence' || !input.evidence.indicator?.value) {
        inputs.push(input);
        originalIndex.push(index);
        return;
      }
      const { type: rawType, value } = input.evidence.indicator;
      const resolved = resolveIndicatorForWrite(types, rawType, value);
      if (resolved.error !== undefined) {
        errors.push({ index, message: resolved.error });
        return;
      }
      inputs.push({
        ...input,
        evidence: { ...input.evidence, indicator: { type: resolved.type, value: value.trim() } },
      });
      originalIndex.push(index);
    });
    return { inputs, originalIndex, errors };
  }

  /** Observables (Cases type key and value) in each attached alert, read in batches from the alert indices. */
  private async collectAlertObservables(
    alerts: EvidenceItem[]
  ): Promise<Map<string, { type: string; value: string; source: EvidenceItem }>> {
    const fieldNames = Array.from(
      new Set([
        'source.ip',
        'destination.ip',
        'host.name',
        'file.path',
        'dns.question.name',
        'agent.id',
        ...getHashFields(),
      ])
    );
    const alertsById = new Map<string, EvidenceItem>();
    const idsByIndex = new Map<string, string[]>();
    for (const alert of alerts) {
      const { id, index } = alert.evidence.alert ?? {};
      if (id && index) {
        alertsById.set(id, alert);
        idsByIndex.set(index, [...(idsByIndex.get(index) ?? []), id]);
      }
    }
    const found = new Map<string, { type: string; value: string; source: EvidenceItem }>();
    for (const [index, ids] of idsByIndex) {
      for (let from = 0; from < ids.length; from += EXTRACTION_ALERT_BATCH) {
        const batch = ids.slice(from, from + EXTRACTION_ALERT_BATCH);
        const res = await this.deps.scopedEsClient.search<Record<string, unknown>>({
          index,
          size: batch.length,
          query: { ids: { values: batch } },
          fields: fieldNames,
          _source: false,
        });
        for (const hit of res.hits.hits) {
          const source = hit._id ? alertsById.get(hit._id) : undefined;
          const ecs: FlattedEcsData[] = Object.entries(hit.fields ?? {}).map(([field, value]) => ({
            field,
            value: (Array.isArray(value) ? value : [value]).map(String),
          }));
          for (const observable of source ? getObservablesFromEcs([ecs]) : []) {
            const value = observable.value.trim();
            const key = value.toLowerCase();
            if (source && value.length && value.length < 2048 && !found.has(key)) {
              found.set(key, { type: observable.typeKey, value, source });
            }
          }
        }
      }
    }
    return found;
  }

  /**
   * Pulls observables out of the attached alert documents with the Cases extractor
   * (`getObservablesFromEcs`) and adds them as indicators typed with Cases observable type keys.
   * Alerts are read and the new indicators written in batches, so the number of alerts is not limited.
   */
  private async extractIndicators(
    record: StoredRecord,
    alerts: EvidenceItem[],
    actor: Actor
  ): Promise<void> {
    try {
      const found = await this.collectAlertObservables(alerts);
      if (!found.size) return;
      const values = Array.from(found.keys());
      const have = new Set<string>();
      for (let from = 0; from < values.length; from += EXTRACTION_WRITE_BATCH) {
        const chunk = values.slice(from, from + EXTRACTION_WRITE_BATCH);
        const existing = await this.es.search({
          index: INVESTIGATION_ITEMS_INDEX,
          size: 0,
          query: {
            bool: {
              filter: [term('record_id', record.id), terms('evidence.indicator.value', chunk)],
            },
          },
          aggs: { v: { terms: { field: 'evidence.indicator.value', size: chunk.length } } },
        });
        buckets(existing.aggregations?.v).forEach((b) => have.add(b.key));
      }
      const inputs: ItemInput[] = Array.from(found.entries())
        .filter(([key]) => !have.has(key))
        .map(([, { type, value, source }]) => ({
          kind: 'evidence',
          title: value,
          links: [{ relation: 'derived_from', target_id: source.id }],
          evidence: {
            type: 'indicator',
            why: `Extracted from alert ${source.ref}.`,
            source: {
              label: 'Extracted from alert',
              kind: 'alert',
              index: source.evidence.alert?.index,
              id: source.evidence.alert?.id,
            },
            indicator: { type, value },
          },
        }));
      if (!inputs.length) return;
      const automation: Actor = {
        type: 'automation',
        id: 'indicator-extraction',
        name: 'Indicator extraction',
        on_behalf_of: actor.name,
      };
      const created: InvestigationItem[] = [];
      for (let from = 0; from < inputs.length; from += EXTRACTION_WRITE_BATCH) {
        const res = await this.bulkCreateItemsInternal(
          record,
          inputs.slice(from, from + EXTRACTION_WRITE_BATCH),
          automation,
          { extractIndicators: false, linkAlerts: false, silent: true }
        );
        created.push(...res.items);
      }
      if (created.length) {
        await this.appendActivity(record.id, [this.describeCreate(created, automation)]);
      }
    } catch (error) {
      this.deps.logger.warn(`Investigation ${record.id}: indicator extraction failed: ${error}`);
    }
  }

  /** Completes tasks whose automatic rule is settled by this claim. */
  private async completeTasksForClaim(
    recordId: string,
    claim: ClaimItem,
    actor: Actor,
    ts?: string
  ): Promise<void> {
    const question = claim.claim.question?.toLowerCase();
    const tasks = await this.searchItems<TaskItem>(
      recordId,
      {
        bool: {
          filter: [term('kind', 'task'), term('task.auto.type', 'claim')],
          must_not: [terms('status', ['completed', 'cancelled'])],
          should: [
            term('task.auto.claim_id', claim.id),
            ...(question ? [term('task.auto.question', question)] : []),
          ],
          minimum_should_match: 1,
        },
      },
      50
    );
    await this.autoComplete(
      recordId,
      tasks,
      `Completed automatically when ${claim.ref} was ${claim.status}.`,
      actor,
      ts,
      { kind: 'claim', id: claim.id, label: claim.ref }
    );
  }

  private async completeTasksForProposal(
    recordId: string,
    proposal: ProposalItem,
    actor: Actor
  ): Promise<void> {
    const tasks = await this.searchItems<TaskItem>(
      recordId,
      {
        bool: {
          filter: [
            term('kind', 'task'),
            term('task.auto.type', 'action'),
            term('task.auto.category', proposal.proposal.category),
          ],
          must_not: [terms('status', ['completed', 'cancelled'])],
        },
      },
      50
    );
    await this.autoComplete(
      recordId,
      tasks,
      `Completed automatically when "${proposal.title}" was approved.`,
      actor,
      undefined,
      { kind: 'proposal', id: proposal.id, label: proposal.ref }
    );
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
    const automation: Actor = {
      type: 'automation',
      id: 'workflow',
      name: 'Workflow',
      on_behalf_of: actor.name,
    };
    await this.es.bulk({
      refresh: true,
      operations: tasks.flatMap((t) => [
        { update: { _index: INVESTIGATION_ITEMS_INDEX, _id: t.id } },
        {
          doc: {
            status: 'completed',
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
    for (const key of [
      'title',
      'text',
      'status',
      'links',
      'restricted',
      'exclude_from_ai',
    ] as const) {
      if (patch[key] !== undefined) (next as Record<string, unknown>)[key] = patch[key];
    }
    const kindKey = item.kind as keyof ItemPatch;
    const kindPatch = patch[kindKey];
    for (const key of [
      'evidence',
      'claim',
      'entity',
      'link',
      'task',
      'comment',
      'proposal',
      'timeline_event',
    ] as const) {
      if (patch[key] !== undefined && key !== kindKey) {
        throw Boom.badRequest(`Cannot patch "${key}" on a ${item.kind} item`);
      }
    }
    if (kindPatch && typeof kindPatch === 'object') {
      next[item.kind] = {
        ...((item as unknown as Record<string, object>)[item.kind] ?? {}),
        ...kindPatch,
      };
    }
    next.updated_at = ts;
    next.updated_by = actor;

    if (item.kind === 'task') {
      if (patch.status && !TASK_STATUSES.includes(patch.status as TaskItem['status'])) {
        throw Boom.badRequest(`Task status must be one of: ${TASK_STATUSES.join(', ')}`);
      }
      const task = next as unknown as TaskItem;
      const previous = item as unknown as TaskItem;
      if (patch.status === 'completed' && previous.task.workflow_run?.status === 'running') {
        throw Boom.conflict(
          `Task "${item.title}" completes when its workflow run succeeds. Wait for the run to end.`
        );
      }
      if (patch.status === 'in_progress' && !task.task.started_at) {
        task.task = { ...task.task, started_at: ts };
      }
      if (patch.status && isTaskFinished(patch.status) && !isTaskFinished(item.status)) {
        task.task = { ...task.task, completed_by: actor, completed_at: ts };
      }
      if (patch.status && !isTaskFinished(patch.status)) {
        task.task = { ...task.task, completed_by: null, completed_at: null, cancel_reason: null };
      }
      if (task.status === 'cancelled' && !task.task.cancel_reason) {
        throw Boom.badRequest(`Task "${item.title}" needs a reason to be cancelled`);
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
      if (
        actor.type === 'agent' &&
        (patch.status !== undefined ||
          patch.claim?.conclusion !== undefined ||
          patch.claim?.confidence !== undefined)
      ) {
        claim.claim = { ...claim.claim, needs_review: true };
      }
      if (patch.status === 'supported' || patch.status === 'refuted') {
        claim.claim = { ...claim.claim, stale_reason: patch.claim?.stale_reason ?? null };
      }
    }
    return this.normalizeItem(next, actor, false);
  }

  private describeUpdate(
    before: StoredItem,
    after: StoredItem,
    actor: Actor,
    ts: string
  ): Omit<ActivityEntry, 'id' | 'record_id' | 'space_id'> {
    const target = { kind: before.kind, id: before.id, ref: before.ref, title: after.title };
    const link = {
      kind:
        before.kind === 'timeline_event' || before.kind === 'comment'
          ? ('record' as const)
          : (before.kind as 'evidence'),
      id: before.id,
      label: before.ref,
    };
    const base = { ts, actor, target, links: [link] };
    if (before.kind === 'claim') {
      const b = before as unknown as ClaimItem;
      const a = after as unknown as ClaimItem;
      if (a.status !== b.status) {
        const pct =
          a.claim.confidence !== null && a.claim.confidence !== undefined
            ? ` at ${a.claim.confidence}%`
            : '';
        const why =
          a.status === 'blocked' || a.status === 'open'
            ? a.claim.note
              ? `: ${clip(a.claim.note, 160)}`
              : ''
            : '';
        return {
          ...base,
          action: 'claim.status_changed',
          message: `Marked ${b.ref} ${a.status}${pct}${why}`,
          details: a.claim.reasoning ?? null,
          before: { status: b.status, conclusion: b.claim.conclusion },
          after: { status: a.status, conclusion: a.claim.conclusion },
        };
      }
      if (b.claim.needs_review && !a.claim.needs_review) {
        return {
          ...base,
          action: 'claim.reviewed',
          message: `Accepted the conclusion of ${b.ref}`,
        };
      }
      if ((a.claim.conclusion ?? '') !== (b.claim.conclusion ?? '')) {
        return {
          ...base,
          action: 'claim.conclusion_changed',
          message: `Edited the conclusion of ${b.ref}`,
          before: b.claim.conclusion,
          after: a.claim.conclusion,
        };
      }
      const addedEv = (a.claim.supporting_evidence_ids ?? []).filter(
        (id) => !(b.claim.supporting_evidence_ids ?? []).includes(id)
      );
      if (addedEv.length) {
        return {
          ...base,
          action: 'claim.evidence_linked',
          message: `Linked ${plural(addedEv.length, 'evidence item')} to ${b.ref}`,
        };
      }
      return {
        ...base,
        action: 'claim.updated',
        message: `Updated claim ${b.ref}`,
        before: b.claim,
        after: a.claim,
      };
    }
    if (before.kind === 'task') {
      const a = after as unknown as TaskItem;
      if (a.status !== before.status) {
        const msg: Record<string, string> = {
          completed: `Completed task "${clip(a.title, 120)}"`,
          cancelled: `Cancelled task "${clip(a.title, 120)}"`,
          in_progress: `Started task "${clip(a.title, 120)}"`,
          open: `Reopened task "${clip(a.title, 120)}"`,
        };
        return {
          ...base,
          action: 'task.status_changed',
          message: msg[a.status ?? 'open'],
          details: a.task.cancel_reason ?? a.task.note ?? null,
        };
      }
      const b = before as unknown as TaskItem;
      if (a.task.owner?.id !== b.task.owner?.id || a.task.owner?.type !== b.task.owner?.type) {
        return {
          ...base,
          action: 'task.assigned',
          message: `Assigned "${clip(a.title, 100)}" to ${
            a.task.owner?.name ?? a.task.owner?.id ?? 'nobody'
          }`,
        };
      }
      return { ...base, action: 'task.updated', message: `Edited task "${clip(a.title, 120)}"` };
    }
    if (before.kind === 'proposal') {
      const a = after as unknown as ProposalItem;
      if (a.status !== before.status) {
        const reason = a.proposal.decision?.reason
          ? ` (${a.proposal.decision.reason.toLowerCase()})`
          : '';
        const msg: Record<string, string> = {
          approved: `Approved ${clip(a.title, 140)}`,
          rejected: `Rejected ${clip(a.title, 140)}${reason}`,
          pending: `Reopened the proposal ${clip(a.title, 140)}`,
          withdrawn: `Withdrew ${clip(a.title, 140)}`,
        };
        return {
          ...base,
          action: 'proposal.decided',
          message: msg[a.status],
          details: a.proposal.decision?.note ?? null,
        };
      }
      if (a.title !== before.title) {
        return {
          ...base,
          action: 'proposal.revised',
          message: `Revised the proposal to "${clip(a.title, 140)}"`,
          before: before.title,
          after: a.title,
        };
      }
      return { ...base, action: 'proposal.updated', message: `Updated proposal ${before.ref}` };
    }
    if (before.kind === 'entity' && after.status !== before.status) {
      return {
        ...base,
        action: 'entity.scope_changed',
        message: `Marked ${after.title} as ${after.status}`,
      };
    }
    if (before.kind === 'link' && after.status !== before.status) {
      return {
        ...base,
        action: 'link.status_changed',
        message: `Marked the link "${clip(after.title, 100)}" as ${after.status}`,
      };
    }
    if ((after.text ?? '') !== (before.text ?? '')) {
      return {
        ...base,
        action: 'item.text_changed',
        message: `Edited ${before.kind === 'comment' ? 'a comment' : before.ref}`,
        before: before.text,
        after: after.text,
      };
    }
    if (after.exclude_from_ai !== before.exclude_from_ai) {
      return {
        ...base,
        action: 'item.ai_visibility',
        message: after.exclude_from_ai
          ? `Hid ${before.ref} from agents`
          : `Shared ${before.ref} with agents`,
      };
    }
    return {
      ...base,
      action: 'item.updated',
      message: `Edited ${before.ref}: ${clip(after.title, 100)}`,
    };
  }

  private async afterUpdate(
    recordId: string,
    before: StoredItem,
    after: StoredItem,
    actor: Actor
  ): Promise<void> {
    if (
      after.kind === 'claim' &&
      after.status !== before.status &&
      (after.status === 'supported' || after.status === 'refuted')
    ) {
      await this.completeTasksForClaim(recordId, after as unknown as ClaimItem, actor);
    }
    if (after.kind === 'proposal' && after.status === 'approved' && before.status !== 'approved') {
      await this.completeTasksForProposal(recordId, after as unknown as ProposalItem, actor);
    }
  }

  public async updateItem(
    recordId: string,
    itemId: string,
    req: UpdateItemRequest
  ): Promise<InvestigationItem> {
    await this.loadForWrite(recordId);
    return this.updateItemUnchecked(recordId, itemId, req);
  }

  public async updateItemUnchecked(
    recordId: string,
    itemId: string,
    req: UpdateItemRequest
  ): Promise<InvestigationItem> {
    await this.ensureCanWrite();
    const actor = this.actor(req.actor);
    const current = await this.es.get<StoredItem>(
      { index: INVESTIGATION_ITEMS_INDEX, id: itemId },
      { ignore: [404] }
    );
    if (!current.found || !current._source || current._source.record_id !== recordId) {
      throw Boom.notFound(`Item ${itemId} not found`);
    }
    const currentVersion = encodeVersion(current._seq_no, current._primary_term);
    if (req.version !== currentVersion) {
      throw Boom.conflict(
        `Item ${current._source.ref} was changed by someone else. Reload it and try again.`
      );
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
        throw Boom.conflict(
          `Item ${before.ref} was changed by someone else. Reload it and try again.`
        );
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

  public async bulkUpdateItems(
    recordId: string,
    req: BulkUpdateItemsRequest
  ): Promise<BulkUpdateItemsResponse> {
    await this.loadForWrite(recordId);
    if (req.items.length > INVESTIGATION_LIMITS.maxBulkItems) {
      throw Boom.badRequest(`At most ${INVESTIGATION_LIMITS.maxBulkItems} items per request`);
    }
    const actor = this.actor(req.actor);
    const ts = now();
    const got = await this.es.mget<StoredItem>({
      index: INVESTIGATION_ITEMS_INDEX,
      ids: req.items.map((i) => i.id),
    });
    const errors: BulkUpdateItemsResponse['errors'] = [];
    const planned: Array<{ before: StoredItem; after: StoredItem; seq: number; term: number }> = [];
    req.items.forEach((change, i) => {
      const doc = got.docs[i] as {
        found?: boolean;
        _source?: StoredItem;
        _seq_no?: number;
        _primary_term?: number;
      };
      if (!doc.found || !doc._source || doc._source.record_id !== recordId) {
        errors.push({ id: change.id, status: 404, message: 'Not found' });
        return;
      }
      const version = encodeVersion(doc._seq_no, doc._primary_term) as string;
      if (change.version && change.version !== version) {
        errors.push({
          id: change.id,
          status: 409,
          message: `Item ${doc._source.ref} was changed by someone else`,
        });
        return;
      }
      try {
        planned.push({
          before: doc._source,
          after: this.applyPatch(doc._source, change.patch, actor, ts),
          seq: doc._seq_no ?? 0,
          term: doc._primary_term ?? 0,
        });
      } catch (error) {
        errors.push({
          id: change.id,
          status: error?.output?.statusCode ?? 400,
          message: error.message,
        });
      }
    });
    const updated: InvestigationItem[] = [];
    if (planned.length) {
      const res = await this.es.bulk({
        refresh: true,
        operations: planned.flatMap((p) => [
          {
            index: {
              _index: INVESTIGATION_ITEMS_INDEX,
              _id: p.after.id,
              if_seq_no: p.seq,
              if_primary_term: p.term,
            },
          },
          p.after,
        ]),
      });
      const done: typeof planned = [];
      res.items.forEach((entry, i) => {
        const op = entry.index;
        if (op?.error) {
          errors.push({
            id: planned[i].after.id,
            status: op.status,
            message: op.error.reason ?? op.error.type,
          });
        } else {
          done.push(planned[i]);
          const { ref_num: _r, ...rest } = planned[i].after;
          updated.push({
            ...rest,
            version: encodeVersion(op?._seq_no, op?._primary_term),
          } as InvestigationItem);
        }
      });
      const layoutOnly = req.items.every((change) => isLayoutOnly(change.patch));
      if (layoutOnly) {
        return { items: updated, errors };
      }
      if (done.length === 1) {
        await this.appendActivity(recordId, [
          this.describeUpdate(done[0].before, done[0].after, actor, ts),
        ]);
      } else if (done.length > 1) {
        const statuses = Array.from(new Set(done.map((d) => d.after.status).filter(Boolean)));
        await this.appendActivity(recordId, [
          {
            ts,
            actor,
            action: 'items.updated',
            message: `Updated ${plural(done.length, 'item')}${
              statuses.length === 1 ? ` to ${statuses[0]}` : ''
            }`,
            details:
              done
                .slice(0, 10)
                .map((d) => d.before.ref)
                .join(', ') + (done.length > 10 ? ', …' : ''),
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
    await this.loadForWrite(recordId);
    const actor = this.actor();
    const got = await this.es.mget<StoredItem>({
      index: INVESTIGATION_ITEMS_INDEX,
      ids,
      _source_includes: ['ref', 'title', 'record_id', 'kind'],
    });
    const owned = got.docs
      .map((d) => d as { found?: boolean; _id: string; _source?: StoredItem })
      .filter((d) => d.found && d._source?.record_id === recordId);
    if (!owned.length) return { deleted: 0 };
    const res = await this.es.deleteByQuery({
      index: INVESTIGATION_ITEMS_INDEX,
      refresh: true,
      query: {
        bool: {
          filter: [
            term('record_id', recordId),
            terms(
              'id',
              owned.map((d) => d._id)
            ),
          ],
        },
      },
    });
    await this.appendActivity(recordId, [
      {
        ts: now(),
        actor,
        action: 'items.deleted',
        message:
          owned.length === 1
            ? `Removed ${describeItem(owned[0]._source as StoredItem)}`
            : `Removed ${plural(owned.length, 'item')}`,
        details:
          owned.length > 1
            ? owned
                .slice(0, 10)
                .map((d) => d._source?.ref)
                .join(', ')
            : null,
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
    const { record } = await this.loadForWrite(recordId);
    const actor = this.actor();
    const rows = parseCsv(csv);
    if (!rows.length) throw Boom.badRequest('The CSV is empty');
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const hasHeader = header.includes('value') || header.includes('indicator');
    const valueIdx = hasHeader ? Math.max(header.indexOf('value'), header.indexOf('indicator')) : 0;
    const typeIdx = hasHeader
      ? Math.max(header.indexOf('type'), header.indexOf('indicator_type'))
      : -1;
    const whyIdx = hasHeader
      ? Math.max(header.indexOf('why'), header.indexOf('note'), header.indexOf('description'))
      : -1;
    const data = hasHeader ? rows.slice(1) : rows;
    const errors: ImportIndicatorsResponse['errors'] = [];
    const seen = new Set<string>();
    const types = await getObservableTypes(this.deps.casesClient);
    const parsed: Array<{
      value: string;
      type: string;
      why: string | null;
    }> = [];
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
      const rawType = typeIdx >= 0 ? (row[typeIdx] ?? '').trim() : '';
      // A type the file names must be a Cases observable type (key, label or an old short name);
      // an empty or unknown type is read from the value.
      const type = resolveIndicatorTypeKey(rawType, value, types);
      const resolved = resolveIndicatorForWrite(types, type, value);
      if (resolved.error !== undefined) {
        errors.push({ line, message: `"${clip(value, 80)}": ${resolved.error}` });
        return;
      }
      parsed.push({
        value,
        type: resolved.type,
        why: whyIdx >= 0 ? (row[whyIdx] ?? '').trim() || null : null,
      });
    });
    const existing = new Set<string>();
    for (let i = 0; i < parsed.length; i += 1000) {
      const chunk = parsed.slice(i, i + 1000).map((p) => p.value.toLowerCase());
      const res = await this.es.search({
        index: INVESTIGATION_ITEMS_INDEX,
        size: 0,
        query: {
          bool: { filter: [term('record_id', recordId), terms('evidence.indicator.value', chunk)] },
        },
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

  public async exportItems(
    recordId: string,
    req: ExportItemsRequest
  ): Promise<{ body: string; contentType: string; filename: string }> {
    const { record } = await this.load(recordId);
    const { query, postFilter } = this.buildItemQuery(recordId, {
      ...req,
      kind: req.kind?.length ? req.kind : ['evidence'],
    });
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
    const observableTypes = await getObservableTypes(this.deps.casesClient);
    const typeLabel = (e: EvidenceItem): string | null =>
      e.evidence?.indicator
        ? getObservableTypeLabel(observableTypes, e.evidence.indicator.type)
        : null;
    const base = `${record.display_id}-evidence`;
    if (req.format === 'json') {
      return {
        contentType: 'application/json',
        filename: `${base}.json`,
        body: JSON.stringify(
          rows.map((e) => ({
            id: e.ref,
            type: e.evidence ? EVIDENCE_TYPE_LABELS[e.evidence.type] : e.kind,
            indicator_type: typeLabel(e),
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
      return {
        contentType: 'text/plain',
        filename: `${base}.txt`,
        body: rows.map(value).join('\n'),
      };
    }
    if (req.format === 'stix') {
      const pattern = (e: EvidenceItem): string | null => {
        const ind = e.evidence?.indicator;
        return ind ? indicatorStixPattern(ind.type, ind.value) : null;
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
        body: JSON.stringify(
          { type: 'bundle', id: `bundle--${uuidv4()}`, objects, created },
          null,
          2
        ),
      };
    }
    const header = 'id,type,indicator_type,value,added_by,added,source,why,sha256';
    const lines = rows.map((e) =>
      [
        e.ref,
        e.evidence ? EVIDENCE_TYPE_LABELS[e.evidence.type] : e.kind,
        typeLabel(e) ?? '',
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
    return {
      contentType: 'text/csv',
      filename: `${base}.csv`,
      body: [header, ...lines].join('\n'),
    };
  }

  public async preserve(recordId: string, ids: string[]): Promise<InvestigationItem[]> {
    await this.loadForWrite(recordId);
    const actor = this.actor();
    const ts = now();
    const got = await this.es.mget<StoredItem>({ index: INVESTIGATION_ITEMS_INDEX, ids });
    const updates: Array<{ id: string; version: string; patch: ItemPatch }> = [];
    const evidenceDocs = (
      got.docs as Array<{
        found?: boolean;
        _id: string;
        _source?: StoredItem;
        _seq_no?: number;
        _primary_term?: number;
      }>
    ).filter(
      (doc) => doc.found && doc._source?.record_id === recordId && doc._source.kind === 'evidence'
    );
    for (const doc of evidenceDocs) {
      const item = doc._source as unknown as EvidenceItem & { ref_num: number };
      let snapshot = item.evidence.snapshot ?? null;
      if (item.evidence.type === 'alert' && item.evidence.alert?.id && item.evidence.alert.index) {
        const res = await this.deps.scopedEsClient
          .search<Record<string, unknown>>({
            index: item.evidence.alert.index,
            size: 1,
            query: { ids: { values: [item.evidence.alert.id] } },
          })
          .catch(() => undefined);
        const src = res?.hits.hits[0]?._source as Record<string, unknown> | undefined;
        if (src) {
          const get = (path: string): unknown =>
            path
              .split('.')
              .reduce<unknown>(
                (o, k) =>
                  o && typeof o === 'object'
                    ? (o as Record<string, unknown>)[k] ?? (o as Record<string, unknown>)[path]
                    : undefined,
                src
              ) ?? src[path];
          const str = (v: unknown) =>
            v === undefined || v === null ? '' : Array.isArray(v) ? v.join(', ') : String(v);
          snapshot = {
            kind: 'alert',
            severity: str(get('kibana.alert.severity')),
            risk_score: Number(get('kibana.alert.risk_score') ?? 0),
            timestamp: str(get('@timestamp')),
            rule: str(get('kibana.alert.rule.name')),
            description: str(get('kibana.alert.rule.description')),
            reason: str(get('kibana.alert.reason')),
            mitre: [],
            fields: [
              'host.name',
              'user.name',
              'process.name',
              'process.parent.name',
              'source.ip',
              'destination.ip',
              'kibana.alert.workflow_status',
            ]
              .map((f) => [f, str(get(f))] as [string, string])
              .filter(([, v]) => v),
          };
        }
      }
      if (snapshot) {
        updates.push({
          id: doc._id,
          version: encodeVersion(doc._seq_no, doc._primary_term) as string,
          patch: {
            evidence: { snapshot, snapshot_hash: hashSnapshot(snapshot), preserved_at: ts },
          },
        });
      }
    }
    if (!updates.length) return [];
    const res = await this.bulkUpdateItems(recordId, { items: updates, actor });
    await this.appendActivity(recordId, [
      {
        ts,
        actor,
        action: 'evidence.preserved',
        message: `Preserved copies of ${plural(res.items.length, 'item')}`,
        details: res.items.map((i) => i.ref).join(', '),
        links: [],
      },
    ]);
    return res.items;
  }

  public async addFileEvidence(
    recordId: string,
    file: { buffer: Buffer; filename: string; mimeType?: string },
    why: string | null
  ): Promise<InvestigationItem> {
    const { record } = await this.loadForWrite(recordId);
    const actor = this.actor();
    const { Readable } = await import('stream');
    const digest = sha256(file.buffer);
    const attachment = await this.deps.casesClient.attachments.addFile({
      caseId: recordId,
      file: Readable.from(file.buffer) as unknown as Parameters<
        CasesClient['attachments']['addFile']
      >[0]['file'],
      filename: file.filename.replace(/\.[^.]+$/, ''),
      mimeType: file.mimeType,
    });
    const att = attachment as unknown as { id: string; attachmentId?: string | string[] };
    const fileId = Array.isArray(att.attachmentId)
      ? att.attachmentId[0]
      : att.attachmentId ?? att.id;
    const size = file.buffer.length;
    const human =
      size > 1024 * 1024
        ? `${(size / 1024 / 1024).toFixed(1)} MB`
        : `${Math.max(1, Math.round(size / 1024))} KB`;
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
            snapshot: {
              kind: 'file',
              name: file.filename,
              size: human,
              sha256: digest,
              mime_type: file.mimeType,
            },
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
    if (values.indicators.length)
      should.push(
        terms(
          'evidence.indicator.value',
          values.indicators.map((v) => v.toLowerCase())
        )
      );
    if (values.entities.length)
      should.push(
        terms(
          'entity.name',
          values.entities.map((v) => v.toLowerCase())
        )
      );
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
            ind: {
              terms: {
                field: 'evidence.indicator.value',
                size: 5,
                ...(values.indicators.length
                  ? { include: values.indicators.map((v) => v.toLowerCase()) }
                  : {}),
              },
            },
            ent: {
              terms: {
                field: 'entity.name',
                size: 5,
                ...(values.entities.length
                  ? { include: values.entities.map((v) => v.toLowerCase()) }
                  : {}),
              },
            },
            alr: {
              filter: values.alerts.length
                ? terms('evidence.alert.id', values.alerts)
                : { match_none: {} },
            },
          },
        },
      },
    });
    const recBuckets = buckets(res.aggregations?.records) as Array<
      Bucket & Record<string, AggregationsAggregate>
    >;
    if (!recBuckets.length) return [];
    const docs = await this.es.mget<StoredRecord>({
      index: INVESTIGATION_RECORDS_INDEX,
      ids: recBuckets.map((b) => b.key),
    });
    const byId = new Map(
      docs.docs
        .map((d) => d as { found?: boolean; _id: string; _source?: StoredRecord })
        .filter(
          (d) =>
            d.found &&
            d._source &&
            d._source.space_id === this.deps.spaceId &&
            this.canRead(d._source)
        )
        .map((d) => [d._id, d._source as StoredRecord])
    );
    return recBuckets
      .filter((b) => byId.has(b.key))
      .map((b) => {
        const r = byId.get(b.key) as StoredRecord;
        const ind = buckets(b.ind)
          .map((x) => x.key)
          .filter((k) => values.indicators.length);
        const ent = buckets(b.ent)
          .map((x) => x.key)
          .filter(() => values.entities.length);
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
  private async recordValues(
    recordId: string
  ): Promise<{ indicators: string[]; entities: string[]; alerts: string[] }> {
    const collect = async (
      field: string,
      filter: QueryDslQueryContainer,
      cap: number
    ): Promise<string[]> => {
      const out: string[] = [];
      let after: Record<string, string | number | null> | undefined;
      while (out.length < cap) {
        const res = await this.es.search({
          index: INVESTIGATION_ITEMS_INDEX,
          size: 0,
          query: { bool: { filter: [term('record_id', recordId), filter] } },
          aggs: {
            v: {
              composite: {
                size: 2000,
                sources: [{ v: { terms: { field } } }],
                ...(after ? { after } : {}),
              },
            },
          },
        });
        const agg = res.aggregations?.v as
          | { buckets: Array<{ key: { v: string } }>; after_key?: Record<string, string> }
          | undefined;
        const page = agg?.buckets ?? [];
        out.push(...page.map((b) => b.key.v));
        if (page.length < 2000 || !agg?.after_key) break;
        after = agg.after_key;
      }
      return out.slice(0, cap);
    };
    const [indicators, entities, alerts] = await Promise.all([
      collect('evidence.indicator.value', { exists: { field: 'evidence.indicator.value' } }, 10000),
      collect(
        'entity.name',
        { bool: { filter: [term('kind', 'entity')], must_not: [term('status', 'dismissed')] } },
        2000
      ),
      collect('evidence.alert.id', { exists: { field: 'evidence.alert.id' } }, 10000),
    ]);
    return { indicators, entities, alerts };
  }

  public async related(recordId: string): Promise<RelatedRecordsResponse> {
    const { record } = await this.load(recordId);
    const values = await this.recordValues(recordId);
    const exclude = [
      recordId,
      ...(record.merged_from ?? []),
      ...(record.merged_into ? [record.merged_into] : []),
    ];
    const computed = await this.otherRecordsMatching(values, exclude);
    const related = await this.withLinkedRecords(record, computed);
    const mergedIds = [
      ...(record.merged_from ?? []),
      ...(record.merged_into ? [record.merged_into] : []),
    ];
    if (mergedIds.length) {
      const docs = await this.es.mget<StoredRecord>({
        index: INVESTIGATION_RECORDS_INDEX,
        ids: mergedIds,
      });
      const readable = (docs.docs as Array<{ found?: boolean; _source?: StoredRecord }>)
        .map((d) => (d.found ? d._source : undefined))
        .filter((r): r is StoredRecord => r !== undefined && this.canRead(r));
      for (const r of readable) {
        related.unshift({
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
          reasons: [
            {
              type: 'merged',
              value:
                r.merged_into === recordId
                  ? 'Merged into this investigation'
                  : 'This investigation was merged into it',
            },
          ],
          shared_values: [],
        });
      }
    }
    return { related };
  }

  public async findDuplicates(req: DuplicateCheckRequest): Promise<{ related: RelatedRecord[] }> {
    await this.ensureCanReadOwner();
    const related = await this.otherRecordsMatching(
      {
        indicators: req.indicator_values ?? [],
        entities: req.entity_names ?? [],
        alerts: req.alert_ids ?? [],
      },
      req.exclude_record_id ? [req.exclude_record_id] : [],
      10
    );
    const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
    return {
      related: related.filter(
        (r) =>
          r.record.status !== 'closed' ||
          Date.parse(r.record.close_outcome?.closed_at ?? r.record.updated_at) >= cutoff
      ),
    };
  }

  public async lookupIndicators(
    values: string[],
    excludeRecordId?: string
  ): Promise<IndicatorLookupResponse> {
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
    const valueBuckets = buckets(res.aggregations?.v) as Array<
      Bucket & { r: AggregationsAggregate }
    >;
    const recordIds = Array.from(
      new Set(valueBuckets.flatMap((b) => buckets(b.r).map((x) => x.key)))
    );
    const records = new Map<string, StoredRecord>();
    if (recordIds.length) {
      const docs = await this.es.mget<StoredRecord>({
        index: INVESTIGATION_RECORDS_INDEX,
        ids: recordIds,
        _source_includes: ['id', 'display_id', 'title', 'space_id', 'access', 'assignees'],
      });
      for (const raw of docs.docs) {
        const d = raw as { found?: boolean; _id: string; _source?: StoredRecord };
        if (
          d.found &&
          d._source &&
          d._source.space_id === this.deps.spaceId &&
          this.canRead(d._source)
        )
          records.set(d._id, d._source);
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

  /* ---------------------------------------------------------------- */
  /* Item 16: timings                                                  */
  /* ---------------------------------------------------------------- */

  /**
   * Time to first response, time in progress and time to close, in seconds. Durations come from the
   * Cases lifespan metrics, less the time the record spent in pausing statuses; the first response is
   * the first comment, status change or assignment by someone other than the case's creator.
   */
  public async timings(recordId: string): Promise<InvestigationTimings> {
    const { record } = await this.load(recordId);
    const { casesClient } = this.deps;
    const [metrics, theCase] = await Promise.all([
      casesClient.metrics.getCaseMetrics({
        caseId: record.case_id,
        features: [CaseMetricsFeature.LIFESPAN],
      }),
      casesClient.cases.get({ id: record.case_id, includeComments: false }),
    ]);
    const lifespan = metrics.lifespan;
    const paused = getPausedSeconds(record);
    const afterPause = (seconds: number): number => Math.max(Math.round(seconds - paused), 0);

    const createdAt = Date.parse(theCase.created_at);
    const creator = theCase.created_by;
    const isCreator = (user: { username?: string | null; profile_uid?: string | null }): boolean =>
      creator.profile_uid && user.profile_uid
        ? creator.profile_uid === user.profile_uid
        : creator.username === user.username;
    let firstResponse: number | null = null;
    for (let page = 1; page <= FIRST_RESPONSE_MAX_PAGES && firstResponse === null; page++) {
      const res = await casesClient.userActions.find({
        caseId: record.case_id,
        params: { sortOrder: 'asc', perPage: 100, page },
      });
      const response = res.userActions.find(
        (action) =>
          FIRST_RESPONSE_ACTION_TYPES.has(action.type) &&
          !isCreator(action.created_by) &&
          Date.parse(action.created_at) >= createdAt
      );
      if (response) {
        firstResponse = Math.max(
          Math.round((Date.parse(response.created_at) - createdAt) / 1000),
          0
        );
      }
      if (res.userActions.length < 100) break;
    }

    const inProgressMs = lifespan?.statusInfo.inProgressDuration ?? 0;
    const closeDate = lifespan?.closeDate ? Date.parse(lifespan.closeDate) : null;
    return {
      time_to_first_response: firstResponse,
      time_in_progress: inProgressMs > 0 ? afterPause(inProgressMs / 1000) : null,
      time_to_close:
        record.status === 'closed' && closeDate !== null
          ? afterPause((closeDate - createdAt) / 1000)
          : null,
      time_paused: Math.round(paused),
    };
  }

  public async since(recordId: string, sinceParam?: string): Promise<SinceLastHandoffResponse> {
    const { record } = await this.load(recordId);
    const since = sinceParam ?? record.last_handoff?.at ?? null;
    if (!since) return { since: null, handoff_by: null, items: [] };
    const out: SinceLastHandoffResponse['items'] = [];
    const counters = { ...emptyCounters(), ...(record.counters ?? {}) };
    const recent = await this.es.search({
      index: INVESTIGATION_ITEMS_INDEX,
      size: 0,
      query: {
        bool: {
          filter: [
            term('record_id', recordId),
            term('kind', 'evidence'),
            { range: { created_at: { gt: since } } },
          ],
        },
      },
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
        headline: `+${byType.alert.toLocaleString(
          'en-US'
        )} alerts, ${counters.alerts.toLocaleString('en-US')} in total`,
        detail: rule ? `Most are "${rule.key}" alerts.` : 'New alerts were attached.',
        target: { kind: 'tab', id: 'evidence', label: 'Evidence' },
      });
    }
    if (byType.indicator) {
      const observableTypes = await getObservableTypes(this.deps.casesClient);
      const kinds = buckets(aggs.ind).map(
        (b) => `${b.doc_count} ${getObservableTypeLabel(observableTypes, b.key).toLowerCase()}`
      );
      out.push({
        key: 'indicators',
        headline: `+${byType.indicator.toLocaleString(
          'en-US'
        )} indicators, ${counters.indicators.toLocaleString('en-US')} in total`,
        detail: kinds.length ? `Including ${kinds.join(', ')}.` : 'New indicators were added.',
        target: { kind: 'tab', id: 'evidence', label: 'Review new evidence' },
      });
    }
    const verdicts = await this.es.search<ActivityEntry>({
      index: INVESTIGATION_ACTIVITY_INDEX,
      size: 50,
      query: {
        bool: {
          filter: [
            term('record_id', recordId),
            term('action', 'record.agent_verdict_changed'),
            { range: { ts: { gt: since } } },
          ],
        },
      },
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
    const stale = await this.searchItems<ClaimItem>(
      recordId,
      { bool: { filter: [term('kind', 'claim'), { exists: { field: 'claim.stale_reason' } }] } },
      20
    );
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
        query: {
          bool: { filter: [term('record_id', recordId), term('action', 'record.owner_changed')] },
        },
        sort: [{ ts: { order: 'desc' } }],
      });
      const at = left.hits.hits[0]?._source?.ts;
      const days = at ? Math.max(1, Math.round((Date.now() - Date.parse(at)) / 86400000)) : null;
      out.push({
        key: 'owner',
        headline: 'The owner left',
        detail: days
          ? `Nobody has owned this for ${plural(days, 'day')}.`
          : 'Nobody owns this investigation.',
        target: { kind: 'tab', id: 'activity', label: 'Activity' },
      });
    }
    return { since, handoff_by: record.last_handoff?.by ?? null, items: out };
  }

  public async history(recordId: string, targetId?: string): Promise<ChangeHistoryResponse> {
    const { record } = await this.load(recordId);
    const filter: QueryDslQueryContainer[] = [
      terms('record_id', [recordId, ...(record.merged_from ?? [])]),
      terms('action', HISTORY_ACTIONS),
    ];
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
      if (text)
        versions.push({ ts: e.ts, actor: e.actor, what, text, target_id: e.target?.id ?? null });
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
      tasks: orderTasks(tasks),
      timeline: timeline.hits.hits.map((h) => this.toItem(h)) as InvestigationItem[],
      activity: activity.hits.hits.map((h) => h._source as ActivityEntry),
    });
    return { markdown, filename: `${record.display_id}-report.md` };
  }

  public async createThread(
    recordId: string,
    req: CreateThreadRequest
  ): Promise<{ record: InvestigationRecord; thread: ThreadRef }> {
    const { record } = await this.loadForWrite(recordId);
    const create = this.deps.agent.createConversation;
    const { available, reason } = await this.deps.agent.isAvailable();
    if (!create || !available) {
      throw Boom.badRequest(
        reason ?? 'Agent Builder is not available, so threads cannot be created.'
      );
    }
    if ((record.threads ?? []).length >= INVESTIGATION_LIMITS.maxThreads) {
      throw Boom.badRequest(`At most ${INVESTIGATION_LIMITS.maxThreads} threads per investigation`);
    }
    const actor = this.actor();
    const conversationId = await create({ title: `${record.display_id}: ${req.title}`, recordId });
    const thread: ThreadRef = {
      conversation_id: conversationId,
      title: req.title,
      created_at: now(),
      created_by: actor,
      anchor: req.anchor ?? null,
    };
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
  /* Items 12 and 17: restricted access and explicit links            */
  /* ---------------------------------------------------------------- */

  /** Removes the case id from the record's alerts (restricting) or puts it back (unrestricting). */
  private async syncAlertCaseIds(recordId: string, change: 'add' | 'remove'): Promise<void> {
    const alertsClient = await this.deps.getAlertsClient().catch(() => undefined);
    if (!alertsClient) return;
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
        const alerts = ids.slice(i, i + 1000).map((id) => ({ id, index }));
        if (change === 'remove') {
          await alertsClient.removeCaseIdFromAlerts({ alerts, caseId: recordId });
        } else {
          await alertsClient.bulkUpdateCases({ alerts, caseIds: [recordId] });
        }
      }
    }
  }

  private async changeLink(
    recordId: string,
    otherId: string,
    change: 'add' | 'remove',
    ts: string
  ): Promise<void> {
    await this.es.update({
      index: INVESTIGATION_RECORDS_INDEX,
      id: recordId,
      refresh: true,
      retry_on_conflict: 5,
      script: {
        lang: 'painless',
        source: `
          if (ctx._source.linked_records == null) { ctx._source.linked_records = new ArrayList(); }
          if (params.change == 'add') {
            if (!ctx._source.linked_records.contains(params.other)) {
              ctx._source.linked_records.add(params.other);
            }
          } else {
            ctx._source.linked_records.removeIf(id -> id == params.other);
          }
          ctx._source.updated_at = params.ts;`,
        params: { change, other: otherId, ts },
      },
    });
  }

  /** Links two investigations. The link is stored on both and both get an Activity entry. */
  public async linkRecords(recordId: string, otherId: string): Promise<LinkRecordResponse> {
    if (recordId === otherId) {
      throw Boom.badRequest('An investigation cannot be linked to itself.');
    }
    const { record } = await this.loadForWrite(recordId);
    const { record: other } = await this.load(otherId);
    const alreadyLinked =
      (record.linked_records ?? []).includes(otherId) &&
      (other.linked_records ?? []).includes(recordId);
    if (!alreadyLinked) {
      const limit = INVESTIGATION_LIMITS.maxLinkedRecords;
      const isFull = (side: StoredRecord, otherRecordId: string): boolean =>
        !(side.linked_records ?? []).includes(otherRecordId) &&
        (side.linked_records ?? []).length >= limit;
      if (isFull(record, otherId) || isFull(other, recordId)) {
        throw Boom.badRequest(`An investigation can be linked to at most ${limit} others.`);
      }
      const actor = this.actor();
      const ts = now();
      await Promise.all([
        this.changeLink(recordId, otherId, 'add', ts),
        this.changeLink(otherId, recordId, 'add', ts),
      ]);
      await Promise.all([
        this.appendActivity(recordId, [
          {
            ts,
            actor,
            action: 'record.linked',
            target: { kind: 'record', id: otherId, title: other.title },
            message: `Linked this investigation to ${other.display_id}`,
            details: other.title,
            links: [{ kind: 'record', id: otherId, label: other.display_id }],
          },
        ]),
        this.appendActivity(otherId, [
          {
            ts,
            actor,
            action: 'record.linked',
            target: { kind: 'record', id: recordId, title: record.title },
            message: `Linked this investigation to ${record.display_id}`,
            details: record.title,
            links: [{ kind: 'record', id: recordId, label: record.display_id }],
          },
        ]),
      ]);
    }
    return {
      record: (await this.getRecord(recordId)).record,
      other: { id: other.id, display_id: other.display_id, title: other.title },
    };
  }

  /** Removes the link from both records. The other side may already be gone or hidden. */
  public async unlinkRecords(recordId: string, otherId: string): Promise<LinkRecordResponse> {
    const { record } = await this.loadForWrite(recordId);
    const other = await this.load(otherId)
      .then(({ record: loaded }) => loaded)
      .catch((error) => {
        if (Boom.isBoom(error) && error.output.statusCode === 404) return undefined;
        throw error;
      });
    const isLinked =
      (record.linked_records ?? []).includes(otherId) ||
      (other?.linked_records ?? []).includes(recordId);
    if (!isLinked) {
      throw Boom.notFound('These investigations are not linked.');
    }
    const actor = this.actor();
    const ts = now();
    await Promise.all([
      this.changeLink(recordId, otherId, 'remove', ts),
      ...(other ? [this.changeLink(otherId, recordId, 'remove', ts)] : []),
    ]);
    await this.appendActivity(recordId, [
      {
        ts,
        actor,
        action: 'record.unlinked',
        target: { kind: 'record', id: otherId, title: other?.title ?? null },
        message: `Unlinked this investigation from ${other?.display_id ?? 'another investigation'}`,
        details: other?.title ?? null,
        links: other ? [{ kind: 'record', id: otherId, label: other.display_id }] : [],
      },
    ]);
    if (other) {
      await this.appendActivity(otherId, [
        {
          ts,
          actor,
          action: 'record.unlinked',
          target: { kind: 'record', id: recordId, title: record.title },
          message: `Unlinked this investigation from ${record.display_id}`,
          details: record.title,
          links: [{ kind: 'record', id: recordId, label: record.display_id }],
        },
      ]);
    }
    return {
      record: (await this.getRecord(recordId)).record,
      other: {
        id: otherId,
        display_id: other?.display_id ?? otherId,
        title: other?.title ?? '',
      },
    };
  }

  /** Puts the records linked to `record` first in its related list, with the reason "Linked". */
  private async withLinkedRecords(
    record: StoredRecord,
    computed: RelatedRecord[]
  ): Promise<RelatedRecord[]> {
    const ids = record.linked_records ?? [];
    if (!ids.length) return computed;
    const docs = await this.es.mget<StoredRecord>({ index: INVESTIGATION_RECORDS_INDEX, ids });
    const linked = (docs.docs as Array<{ found?: boolean; _source?: StoredRecord }>)
      .map((d) => (d.found ? d._source : undefined))
      .filter(
        (r): r is StoredRecord =>
          r !== undefined && r.space_id === this.deps.spaceId && this.canRead(r)
      );
    const linkedIds = new Set(linked.map((r) => r.id));
    const byId = new Map(computed.map((item) => [item.record.id, item]));
    const first: RelatedRecord[] = linked.map((r) => {
      const found = byId.get(r.id);
      return {
        record: found?.record ?? {
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
        reasons: [{ type: 'linked' as const, value: 'Linked' }, ...(found?.reasons ?? [])],
        shared_values: found?.shared_values ?? [],
      };
    });
    return [...first, ...computed.filter((item) => !linkedIds.has(item.record.id))];
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
      query: {
        bool: {
          filter: [term('conversation_ids', conversationId), term('space_id', this.deps.spaceId)],
        },
      },
    });
    return res.hits.hits[0]?._source?.id ?? null;
  }

  /** Required (now or on close) template fields of the record that have no value, at most 8. */
  private async emptyRequiredFields(
    record: StoredRecord,
    values: Record<string, string>
  ): Promise<Array<{ key: string; label: string; onClose: boolean }>> {
    if (!record.template_id) return [];
    const { fields } = await this.deps.casesClient.cases
      .getApplicableFields({ caseId: record.case_id })
      .catch(() => ({ fields: [] }));
    return fields
      .filter((field) => !field.displayOnly && (field.required || field.requiredOnClose))
      .filter((field) => {
        const value = values[field.key];
        return value === undefined || value === '' || value === '[]';
      })
      .slice(0, 8)
      .map((field) => ({ key: field.key, label: field.label, onClose: !field.required }));
  }

  /** Compact record state for the agent, built from the record and its five newest items. */
  public async buildDigest(recordId: string): Promise<string> {
    const { record, theCase } = await this.load(recordId);
    const emptyFields = await this.emptyRequiredFields(record, theCase.extended_fields ?? {});
    const newest = await this.es.search<StoredItem>({
      index: INVESTIGATION_ITEMS_INDEX,
      size: INVESTIGATION_LIMITS.digestNewestItems,
      query: {
        bool: {
          filter: [term('record_id', recordId)],
          must_not: [term('exclude_from_ai', true), term('kind', 'comment')],
        },
      },
      sort: [{ created_at: { order: 'desc' } }],
      _source: {
        includes: [
          'ref',
          'kind',
          'title',
          'status',
          'created_at',
          'created_by.name',
          'evidence.type',
        ],
      },
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
      `Status: ${record.status} | Priority: ${record.priority} | Type: ${
        record.investigation_type
      } | Owner: ${record.owner?.name ?? 'none'} | Verdict: ${verdict}`,
      record.summary
        ? `Summary: ${clip(record.summary, 400)}`
        : `Description: ${clip(record.description, 300)}`,
      `Evidence: ${c.evidence} (${c.alerts} alerts, ${c.indicators} indicators) | Claims: ${
        c.claims
      } (${c.claims_by_status.open ?? 0} open, ${c.claims_by_status.blocked ?? 0} blocked, ${
        c.claims_needs_review
      } need review) | Scope: ${c.entities_in_scope} in scope, ${
        c.entities_suspected
      } suspected | Tasks: ${c.tasks_done}/${c.tasks - c.tasks_skipped} done, ${
        c.required_tasks_left
      } required left${
        c.tasks_overdue ? `, ${c.tasks_overdue} overdue` : ''
      } | Proposals pending: ${c.proposals_pending}`,
      ...(emptyFields.length
        ? [
            `Empty required fields: ${emptyFields
              .map((f) => `${f.label} (${f.key}${f.onClose ? ', to close' : ''})`)
              .join('; ')}`,
          ]
        : []),
      'Newest items:',
      ...newest.hits.hits.map((h) => {
        const s = h._source as StoredItem & { evidence?: { type?: string } };
        return `- ${s.ref} ${s.kind}${s.evidence?.type ? `/${s.evidence.type}` : ''}${
          s.status ? ` [${s.status}]` : ''
        }: ${clip(s.title, 100)} (${s.created_by?.name ?? '?'})`;
      }),
      'Read more with the investigation tools, one page at a time. Refer to items by ref (E12, C3, T5).',
      '</investigation_digest>',
    ];
    return lines.join('\n');
  }

  /* ---------------------------------------------------------------- */
  /* Items 10 and 11: external ticket (push, auto push, sync)          */
  /* ---------------------------------------------------------------- */

  /** True on the service a sync uses, so what it pulled is never pushed back. */
  private suppressAutoPush = false;
  /** Writes made by a ticket sync: the one sync entry describes them, so they add none of their own. */
  private quietHistory = false;

  private ticketStateId(recordId: string): string {
    return `external_ticket_state:${recordId}`;
  }

  private async getTicketState(recordId: string): Promise<ExternalTicketState | undefined> {
    const doc = await this.es
      .get<ExternalTicketState>({
        index: INVESTIGATION_CONFIG_INDEX,
        id: this.ticketStateId(recordId),
      })
      .catch(() => undefined);
    return doc?._source;
  }

  private async saveTicketState(
    recordId: string,
    patch: Partial<Omit<ExternalTicketState, 'type' | 'record_id'>>
  ): Promise<void> {
    const current = await this.getTicketState(recordId);
    await this.es.index({
      index: INVESTIGATION_CONFIG_INDEX,
      id: this.ticketStateId(recordId),
      refresh: true,
      document: {
        ...current,
        ...patch,
        type: 'external_ticket_state',
        record_id: recordId,
      } satisfies ExternalTicketState,
    });
  }

  private async buildExternalTicket(
    record: StoredRecord,
    theCase: Awaited<ReturnType<CasesClient['cases']['get']>>
  ): Promise<ExternalTicketResponse> {
    const caseConnector = theCase.connector;
    const connector =
      caseConnector && caseConnector.type !== '.none'
        ? {
            id: caseConnector.id,
            name: caseConnector.name,
            type: caseConnector.type as string,
            fields: (caseConnector.fields as Record<string, unknown> | null) ?? null,
          }
        : null;
    const [available, pushInfo, state] = await Promise.all([
      this.deps.casesClient.configure.getConnectors().catch(() => []),
      connector
        ? this.deps.casesClient.userActions
            .getConnectors({ caseId: record.case_id })
            .catch(() => ({}))
        : Promise.resolve({}),
      this.getTicketState(record.id),
    ]);
    const push = connector
      ? (
          pushInfo as Record<
            string,
            { push?: { needsToBePushed: boolean; hasBeenPushed: boolean } }
          >
        )[connector.id]?.push
      : undefined;
    const externalService = theCase.external_service ?? null;
    const hasBeenPushed = Boolean(push?.hasBeenPushed);
    let needsUpdate = Boolean(push?.needsToBePushed);
    if (needsUpdate && hasBeenPushed && externalService && state?.sync_action_ids?.length) {
      needsUpdate = await this.hasUnpushedChanges(
        record,
        externalService.pushed_at,
        new Set(state.sync_action_ids)
      );
    }
    return {
      connector,
      external_service: externalService
        ? {
            connector_id: externalService.connector_id,
            connector_name: externalService.connector_name,
            external_id: externalService.external_id,
            external_title: externalService.external_title,
            external_url: externalService.external_url,
            pushed_at: externalService.pushed_at,
            pushed_by: externalService.pushed_by,
          }
        : null,
      needs_update: needsUpdate,
      has_been_pushed: hasBeenPushed,
      auto_push: Boolean(record.auto_push),
      last_sync: state?.last_sync ?? null,
      connectors: available.map((c) => ({ id: c.id, name: c.name, type: c.actionTypeId })),
    };
  }

  /**
   * Cases says the incident needs an update when any case action is newer than the push. Actions a
   * sync wrote (what it pulled from the ticket) do not count, so a sync alone never asks for a push.
   */
  private async hasUnpushedChanges(
    record: StoredRecord,
    pushedAt: string,
    syncActionIds: Set<string>
  ): Promise<boolean> {
    const res = await this.deps.casesClient.userActions.find({
      caseId: record.case_id,
      params: { sortOrder: 'desc', perPage: 100, page: 1 },
    });
    return res.userActions.some(
      (action) =>
        action.created_at > pushedAt &&
        !syncActionIds.has(action.id) &&
        TICKET_CHANGE_ACTION_TYPES.includes(action.type) &&
        (action.type !== 'comment' || action.action === 'create')
    );
  }

  public async getExternalTicket(recordId: string): Promise<ExternalTicketResponse> {
    const { record, theCase } = await this.load(recordId);
    return this.buildExternalTicket(record, theCase);
  }

  public async updateExternalTicket(
    recordId: string,
    req: UpdateExternalTicketRequest
  ): Promise<ExternalTicketResponse> {
    const { record, theCase } = await this.loadForWrite(recordId);
    const actor = this.actor();
    if (req.connector !== undefined) {
      const next =
        req.connector && req.connector.type !== '.none'
          ? { ...req.connector, fields: req.connector.fields ?? null }
          : { id: 'none', name: 'none', type: '.none', fields: null };
      const current = theCase.connector;
      const same =
        current?.id === next.id &&
        JSON.stringify(current?.fields ?? null) === JSON.stringify(next.fields);
      if (!same) {
        if (next.id !== 'none') {
          const supported = await this.deps.casesClient.configure.getConnectors();
          if (!supported.some((c) => c.id === next.id)) {
            throw Boom.badRequest(`${next.name} is not a connector Cases can push to.`);
          }
        }
        const startedAt = now();
        await this.deps.casesClient.cases.bulkUpdate({
          cases: [{ id: recordId, version: theCase.version, connector: next }],
        } as Parameters<CasesClient['cases']['bulkUpdate']>[0]);
        await this.ingestCaseUserActions(record, { startedAt, actor, ts: now() });
      }
    }
    if (req.auto_push !== undefined && req.auto_push !== Boolean(record.auto_push)) {
      await this.es.update({
        index: INVESTIGATION_RECORDS_INDEX,
        id: recordId,
        refresh: true,
        retry_on_conflict: 3,
        doc: { auto_push: req.auto_push },
      });
    }
    const fresh = await this.load(recordId);
    return this.buildExternalTicket(fresh.record, fresh.theCase);
  }

  public async pushExternalTicket(recordId: string): Promise<ExternalTicketResponse> {
    const { record, theCase } = await this.loadForWrite(recordId);
    const connectorId = theCase.connector?.type !== '.none' ? theCase.connector?.id : undefined;
    if (!connectorId) throw Boom.badRequest('Choose an external ticket connector first.');
    await this.pushNow(record, connectorId, this.actor());
    const fresh = await this.load(recordId);
    return this.buildExternalTicket(fresh.record, fresh.theCase);
  }

  /** The Cases manual push, with its case actions copied to Activity under `actor`. */
  private async pushNow(record: StoredRecord, connectorId: string, actor: Actor): Promise<void> {
    const startedAt = now();
    const pushed = await this.deps.casesClient.cases.push({
      caseId: record.case_id,
      connectorId,
      pushType: 'manual',
    });
    await this.ingestCaseUserActions(record, { startedAt, actor, ts: now() });
    // What the ticket looks like now is the starting point for the next sync.
    const external = pushed.external_service;
    if (external) {
      const incident = await this.readIncident(connectorId, external.external_id).catch(
        () => undefined
      );
      const state = await this.getTicketState(record.id);
      if (incident) {
        await this.saveTicketState(record.id, {
          baseline: {
            title: incident.title,
            description: incident.description,
            // A status the ticket moved to is news for the next sync, not something a push overwrites.
            status: state?.baseline?.status ?? incident.status,
          },
        });
      }
    }
  }

  /** Schedules one push shortly after a write; a later write restarts the wait. */
  private scheduleAutoPush(record: StoredRecord, actions: CaseUserAction[]): void {
    if (this.suppressAutoPush || !record.auto_push) return;
    if (!actions.some((action) => AUTO_PUSH_ACTION_TYPES.includes(action.type))) return;
    const key = `${this.deps.spaceId}:${record.id}`;
    const pending = InvestigationsService.autoPushTimers.get(key);
    if (pending) clearTimeout(pending);
    const timer = setTimeout(() => {
      InvestigationsService.autoPushTimers.delete(key);
      this.runAutoPush(record.id).catch((error) =>
        this.deps.logger.warn(`Investigation ${record.id}: automatic push failed: ${error}`)
      );
    }, AUTO_PUSH_DEBOUNCE_MS);
    timer.unref?.();
    InvestigationsService.autoPushTimers.set(key, timer);
  }

  private async runAutoPush(recordId: string): Promise<void> {
    const { record, theCase } = await this.loadForWrite(recordId);
    const connector = theCase.connector;
    if (!record.auto_push || !connector || connector.type === '.none') return;
    const ticket = await this.buildExternalTicket(record, theCase);
    // Only an incident that already exists is kept up to date; the first push stays a choice.
    if (!ticket.has_been_pushed || !ticket.needs_update) return;
    await this.pushNow(record, connector.id, {
      type: 'automation',
      id: 'cases-investigations-auto-push',
      name: 'Automatic push',
      on_behalf_of: this.deps.user.fullName,
    });
  }

  /** Reads an incident from a Cases Webhook connector: its `getIncidentUrl`, title, description and status. */
  private async readIncident(
    connectorId: string,
    externalId: string
  ): Promise<{ title: string | null; description: string | null; status: string | null }> {
    const connectors = await this.deps.casesClient.configure.getConnectors();
    const connector = connectors.find((c) => c.id === connectorId);
    if (!connector) throw Boom.badRequest('The connector is no longer available.');
    const config = (connector.config ?? {}) as Record<string, unknown>;
    const template = typeof config.getIncidentUrl === 'string' ? config.getIncidentUrl : '';
    if (!template) {
      throw Boom.badRequest(`${connector.name} cannot be read: it has no incident URL.`);
    }
    const render = (text: string) =>
      text.replace(/\{\{\{?\s*external\.system\.id\s*\}?\}\}/g, encodeURIComponent(externalId));
    const url = new URL(render(template));
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw Boom.badRequest(`${connector.name} has an incident URL that is not http or https.`);
    }
    const method = String(config.getIncidentMethod ?? 'get').toUpperCase();
    const headers: Record<string, string> = { accept: 'application/json' };
    if (config.headers && typeof config.headers === 'object') {
      for (const [name, value] of Object.entries(config.headers as Record<string, unknown>)) {
        if (typeof value === 'string') headers[name] = value;
      }
    }
    const body =
      method === 'POST' && typeof config.getIncidentJson === 'string'
        ? render(config.getIncidentJson)
        : undefined;
    let res: Response;
    try {
      const deadline = timeoutSignal(10_000);
      try {
        res = await fetch(url, {
          method,
          headers: body ? { ...headers, 'content-type': 'application/json' } : headers,
          body,
          signal: deadline,
        });
      } finally {
        deadline.dispose();
      }
    } catch (error) {
      throw Boom.failedDependency(`Could not reach ${connector.name}: ${caseErrorMessage(error)}`);
    }
    if (!res.ok) {
      throw Boom.failedDependency(
        `${connector.name} answered ${res.status} for incident ${externalId}.`
      );
    }
    const incident = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const text = (value: unknown): string | null =>
      typeof value === 'string' ? value : value == null ? null : String(value);
    return {
      title: text(incident.title),
      description: text(incident.description),
      status:
        text(incident.status)
          ?.toLowerCase()
          .replace(/[\s-]+/g, '_') ?? null,
    };
  }

  /**
   * Pulls what changed in the ticket since the last push or sync. Title and description are applied
   * both ways (the ticket wins when it changed), the status only comes from the ticket, tags and
   * comments only go to it. Nothing pulled here is pushed back.
   */
  public async syncExternalTicket(recordId: string): Promise<ExternalTicketResponse> {
    const { record, theCase } = await this.loadForWrite(recordId);
    const connector = theCase.connector;
    const external = theCase.external_service;
    if (!connector || connector.type === '.none') {
      throw Boom.badRequest('Choose an external ticket connector first.');
    }
    if (!external || external.connector_id !== connector.id) {
      throw Boom.badRequest(
        `This investigation has not been pushed to ${connector.name} yet, so there is nothing to sync from.`
      );
    }
    const incident = await this.readIncident(connector.id, external.external_id);
    const state = await this.getTicketState(recordId);
    const baseline = state?.baseline ?? null;
    const asConnector: Actor = {
      type: 'automation',
      id: connector.id,
      name: connector.name,
      on_behalf_of: this.deps.user.fullName,
    };
    const syncing = new InvestigationsService({ ...this.deps, actor: asConnector });
    syncing.suppressAutoPush = true;
    syncing.quietHistory = true;
    const startedAt = now();
    const changes: string[] = [];
    const patch: UpdateRecordRequest = {};
    const title = incident.title?.trim().slice(0, MAX_TITLE_LENGTH);
    if (title && title !== record.title && title !== baseline?.title) {
      patch.title = title;
      changes.push('title');
    }
    const description = incident.description?.slice(0, MAX_DESCRIPTION_LENGTH);
    if (
      description != null &&
      description !== record.description &&
      description !== baseline?.description
    ) {
      patch.description = description;
      changes.push('description');
    }

    // The ticket's own words map onto the case statuses. A pushed ticket starts as `open`, so
    // without a baseline an `open` ticket carries no news.
    const statusMoved =
      incident.status != null &&
      (baseline ? incident.status !== baseline.status : incident.status !== 'open');
    let closeRequested = false;
    let baselineStatus = incident.status;
    if (statusMoved && record.status !== 'closed') {
      if (incident.status === 'in_progress' && record.status === 'open') {
        patch.status = 'in-progress';
        changes.push('status (in progress)');
      } else if (incident.status === 'open' && record.status === 'in-progress') {
        patch.status = 'open';
        changes.push('status (open)');
      } else if (incident.status === 'closed') {
        closeRequested = true;
      }
    }
    if (Object.keys(patch).length) await syncing.updateRecord(recordId, patch);
    if (closeRequested) {
      try {
        await syncing.closeRecord(recordId, { close_reason: 'other' });
        changes.push('status (closed)');
      } catch (error) {
        if (!Boom.isBoom(error) || error.output.statusCode !== 400) throw error;
        // Required tasks or fields still block the close: the record stays open, and the entry says why.
        const reason = error.message.replace(/^The investigation cannot close yet\.\s*/, '');
        changes.push(
          `status left open because the ticket is closed but the investigation cannot close yet. ${reason}`.trim()
        );
        baselineStatus = baseline?.status ?? 'open';
      }
    }

    // Case actions the sync wrote do not make the ticket need an update.
    const written = (
      await this.deps.casesClient.userActions.find({
        caseId: record.case_id,
        params: { sortOrder: 'desc', perPage: 100, page: 1 },
      })
    ).userActions.filter((action) => action.created_at >= startedAt);
    const at = now();
    const lastSync: ExternalTicketSync = { at, by: this.currentUserActor(), changes };
    await this.saveTicketState(recordId, {
      last_sync: lastSync,
      baseline: {
        title: incident.title,
        description: incident.description,
        status: baselineStatus,
      },
      sync_action_ids: [...(state?.sync_action_ids ?? []), ...written.map((a) => a.id)].slice(-200),
    });
    if (changes.length) {
      await this.appendActivity(recordId, [
        {
          ts: at,
          actor: asConnector,
          action: 'record.synced',
          target: { kind: 'record', id: recordId, title: patch.title ?? record.title },
          message: `Synced from ${connector.name}: ${changes.join(', ')}`,
          details: null,
          links: [],
          origin: 'connector',
        },
      ]);
    }
    await this.refreshCounters(recordId, asConnector, { touch: false });
    const fresh = await this.load(recordId);
    return this.buildExternalTicket(fresh.record, fresh.theCase);
  }
}

/** Case actions that make an incident out of date (the ones Cases counts for a Webhook connector). */
const TICKET_CHANGE_ACTION_TYPES: string[] = [
  'title',
  'description',
  'tags',
  'comment',
  'status',
  'severity',
  'connector',
];
/** Case actions that start the automatic push timer. */
const AUTO_PUSH_ACTION_TYPES: string[] = [
  'title',
  'description',
  'tags',
  'comment',
  'status',
  'severity',
  'extended_fields',
];
const AUTO_PUSH_DEBOUNCE_MS = 3000;

/** Per-record ticket bookkeeping kept in the configuration index. */
interface ExternalTicketState {
  type: 'external_ticket_state';
  record_id: string;
  last_sync?: ExternalTicketSync | null;
  /** Ticket values at the last push or sync: a sync applies only what changed since. */
  baseline?: { title: string | null; description: string | null; status: string | null } | null;
  /** Case user actions written by a sync; they do not make the incident need an update. */
  sync_action_ids?: string[];
}
