/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository, SavedObjectsServiceStart } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { INVESTIGATION_DETAILS_SO_TYPE } from '../saved_objects/investigation_saved_object';
import type { InvestigationAttributes } from './types';

/**
 * CamelCase record shape this service returns. Uses `string` for fields that the
 * NSI domain layer narrows to enums — callers may cast to their concrete types.
 */
export interface InvestigationRecord {
  id: string;
  spaceId: string;
  solution: string;
  subjectType: string;
  subjectId: string;
  subjectSummary?: string;
  status: string;
  severity?: string;
  summary?: string;
  conclusion?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
  conversationId?: string;
  hypotheses?: Array<Record<string, unknown>>;
  recommendations?: Array<Record<string, unknown>>;
  blindSpots?: Array<Record<string, unknown>>;
  triggerType?: string;
  concurrencyKey?: string;
  executedBy?: string;
  error?: string;
  triggerFeedback?: Array<Record<string, unknown>>;
  impact?: { entities: Array<Record<string, unknown>> };
}

export interface InvestigationsListQuery {
  status?: string;
  severity?: string;
  subjectType?: string;
  concurrencyKey?: string;
  sortField?: 'createdAt' | 'completedAt' | 'severity';
  sortOrder?: 'asc' | 'desc';
  size: number;
  from: number;
}

export interface InvestigationsListResult {
  items: InvestigationRecord[];
  total: number;
  severityCounts: Record<string, number>;
}

export interface InvestigationsService {
  upsert(spaceId: string, doc: Omit<InvestigationRecord, 'id'>): Promise<InvestigationRecord>;
  get(spaceId: string, id: string): Promise<InvestigationRecord | null>;
  list(spaceId: string, query: InvestigationsListQuery): Promise<InvestigationsListResult>;
  getSeverityCounts(
    spaceId: string,
    query: { status?: string; solution?: string; subjectType?: string }
  ): Promise<Record<string, number>>;
}

const soTypeToRecord = (
  id: string,
  attrs: InvestigationAttributes,
  spaceId: string
): InvestigationRecord => ({
  id,
  spaceId,
  solution: 'nightshift',
  subjectType: attrs.subject_type,
  subjectId: attrs.subject_id,
  subjectSummary: attrs.subject_summary,
  status: attrs.status,
  severity: attrs.severity,
  summary: attrs.summary,
  conclusion: attrs.conclusion,
  createdAt: attrs.created_at,
  startedAt: attrs.started_at,
  completedAt: attrs.completed_at,
  updatedAt: attrs.completed_at ?? attrs.started_at ?? attrs.created_at,
  conversationId: attrs.conversation_id,
  hypotheses: attrs.hypotheses,
  recommendations: attrs.recommendations,
  blindSpots: attrs.blind_spots,
  triggerType: attrs.trigger_type,
  concurrencyKey: attrs.concurrency_key,
  executedBy: attrs.executed_by,
  error: attrs.error,
  triggerFeedback: attrs.trigger_feedback,
  impact: attrs.impact,
});

const docToAttrs = (doc: Omit<InvestigationRecord, 'id'>): InvestigationAttributes => ({
  status: doc.status,
  subject_type: doc.subjectType,
  subject_id: doc.subjectId,
  subject_summary: doc.subjectSummary,
  trigger_type: doc.triggerType ?? 'manual',
  concurrency_key: doc.concurrencyKey,
  created_at: doc.createdAt,
  started_at: doc.startedAt,
  completed_at: doc.completedAt,
  executed_by: doc.executedBy,
  error: doc.error,
  conversation_id: doc.conversationId,
  severity: doc.severity,
  summary: doc.summary,
  conclusion: doc.conclusion,
  hypotheses: doc.hypotheses,
  recommendations: doc.recommendations,
  blind_spots: doc.blindSpots,
  trigger_feedback: doc.triggerFeedback,
  impact: doc.impact,
});

export interface SoInvestigationsServiceDeps {
  savedObjects: SavedObjectsServiceStart;
}

/**
 * SO-backed InvestigationsService.
 * Uses the internal SO repository; authorization is enforced at the route / step layer.
 * Uses conversationId as the SO document id so attachment resolve(origin) round-trips
 * to SO.get(conversationId).
 */
export class SoInvestigationsService implements InvestigationsService {
  private readonly repo: ISavedObjectsRepository;

  constructor({ savedObjects }: SoInvestigationsServiceDeps) {
    this.repo = savedObjects.createInternalRepository([INVESTIGATION_DETAILS_SO_TYPE]);
  }

  private ns(spaceId: string): string | undefined {
    return spaceId === 'default' ? undefined : spaceId;
  }

  async upsert(spaceId: string, doc: Omit<InvestigationRecord, 'id'>): Promise<InvestigationRecord> {
    const id = doc.conversationId ?? doc.subjectId;
    const attrs = docToAttrs(doc);
    const ns = this.ns(spaceId);
    try {
      await this.repo.get(INVESTIGATION_DETAILS_SO_TYPE, id, { namespace: ns });
      await this.repo.update<InvestigationAttributes>(INVESTIGATION_DETAILS_SO_TYPE, id, attrs, {
        namespace: ns,
      });
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        await this.repo.create<InvestigationAttributes>(INVESTIGATION_DETAILS_SO_TYPE, attrs, {
          id,
          namespace: ns,
        });
      } else {
        throw err;
      }
    }
    const so = await this.repo.get<InvestigationAttributes>(INVESTIGATION_DETAILS_SO_TYPE, id, {
      namespace: ns,
    });
    return soTypeToRecord(so.id, so.attributes, spaceId);
  }

  async get(spaceId: string, id: string): Promise<InvestigationRecord | null> {
    const ns = this.ns(spaceId);
    try {
      const so = await this.repo.get<InvestigationAttributes>(
        INVESTIGATION_DETAILS_SO_TYPE,
        id,
        { namespace: ns }
      );
      return soTypeToRecord(so.id, so.attributes, spaceId);
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) return null;
      throw err;
    }
  }

  async list(spaceId: string, query: InvestigationsListQuery): Promise<InvestigationsListResult> {
    const ns = this.ns(spaceId);
    const a = (f: string) => `${INVESTIGATION_DETAILS_SO_TYPE}.attributes.${f}`;
    const filters: string[] = [];
    if (query.status) filters.push(`${a('status')}: "${query.status}"`);
    if (query.severity) filters.push(`${a('severity')}: "${query.severity}"`);
    if (query.subjectType) filters.push(`${a('subject_type')}: "${query.subjectType}"`);
    if (query.concurrencyKey) filters.push(`${a('concurrency_key')}: "${query.concurrencyKey}"`);
    const filter = filters.length ? filters.join(' AND ') : undefined;

    const [listResult, countsResult] = await Promise.all([
      this.repo.find<InvestigationAttributes>({
        type: INVESTIGATION_DETAILS_SO_TYPE,
        namespaces: [ns ?? 'default'],
        filter,
        sortField:
          query.sortField === 'createdAt'
            ? 'created_at'
            : query.sortField === 'completedAt'
            ? 'completed_at'
            : query.sortField === 'severity'
            ? 'severity'
            : 'created_at',
        sortOrder: query.sortOrder ?? 'desc',
        page: Math.floor(query.from / query.size) + 1,
        perPage: query.size,
      }),
      this.getSeverityCounts(spaceId, { status: query.status, subjectType: query.subjectType }),
    ]);

    return {
      items: listResult.saved_objects.map((so) => soTypeToRecord(so.id, so.attributes, spaceId)),
      total: listResult.total,
      severityCounts: countsResult,
    };
  }

  async getSeverityCounts(
    spaceId: string,
    query: { status?: string; solution?: string; subjectType?: string }
  ): Promise<Record<string, number>> {
    const ns = this.ns(spaceId);
    const a = (f: string) => `${INVESTIGATION_DETAILS_SO_TYPE}.attributes.${f}`;
    const filters: string[] = [];
    if (query.status) filters.push(`${a('status')}: "${query.status}"`);
    if (query.subjectType) filters.push(`${a('subject_type')}: "${query.subjectType}"`);
    type Aggs = { severity: { buckets: Array<{ key: string; doc_count: number }> } };
    const result = await this.repo.find<InvestigationAttributes, Aggs>({
      type: INVESTIGATION_DETAILS_SO_TYPE,
      namespaces: [ns ?? 'default'],
      filter: filters.length ? filters.join(' AND ') : undefined,
      perPage: 0,
      aggs: {
        severity: {
          terms: {
            field: `${INVESTIGATION_DETAILS_SO_TYPE}.attributes.severity`,
            size: 10,
          },
        },
      },
    });
    const buckets = new Map(
      (result.aggregations?.severity?.buckets ?? []).map((b) => [b.key, b.doc_count])
    );
    return {
      '80-critical': buckets.get('80-critical') ?? 0,
      '60-high': buckets.get('60-high') ?? 0,
      '40-medium': buckets.get('40-medium') ?? 0,
      '20-low': buckets.get('20-low') ?? 0,
    };
  }
}
