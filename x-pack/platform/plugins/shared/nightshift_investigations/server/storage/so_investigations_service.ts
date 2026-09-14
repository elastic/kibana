/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository, SavedObjectsServiceStart } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type {
  InvestigationBlindSpot,
  InvestigationHypothesis,
  InvestigationImpact,
  InvestigationRecommendation,
  Severity,
  TriggerFeedback,
} from '@kbn/significant-events-schema';
import type {
  InvestigationStatus,
  InvestigationSubjectType,
  InvestigationTriggerType,
} from '../../common';
import type {
  NightshiftInvestigationRecord,
  NightshiftInvestigationsService,
} from '../client/investigations_client';
import { NIGHTSHIFT_INVESTIGATION_SO_TYPE } from '../saved_objects';
import type { InvestigationAttributes } from './types';

/** Local alias for NightshiftListResult (private in investigations_client.ts). */
interface ListResult {
  items: NightshiftInvestigationRecord[];
  total: number;
  severityCounts: Record<string, number>;
}

const soTypeToRecord = (
  id: string,
  attrs: InvestigationAttributes,
  spaceId: string
): NightshiftInvestigationRecord => ({
  id,
  spaceId,
  solution: 'nightshift',
  subjectType: attrs.subject_type as InvestigationSubjectType,
  subjectId: attrs.subject_id,
  subjectSummary: attrs.subject_summary,
  status: attrs.status as InvestigationStatus,
  severity: attrs.severity as Severity | undefined,
  summary: attrs.summary,
  conclusion: attrs.conclusion,
  createdAt: attrs.created_at,
  startedAt: attrs.started_at,
  completedAt: attrs.completed_at,
  updatedAt: attrs.completed_at ?? attrs.started_at ?? attrs.created_at,
  conversationId: attrs.conversation_id,
  hypotheses: attrs.hypotheses as InvestigationHypothesis[] | undefined,
  recommendations: attrs.recommendations as InvestigationRecommendation[] | undefined,
  blindSpots: attrs.blind_spots as InvestigationBlindSpot[] | undefined,
  triggerType: attrs.trigger_type as InvestigationTriggerType | undefined,
  concurrencyKey: attrs.concurrency_key,
  executedBy: attrs.executed_by,
  error: attrs.error,
  triggerFeedback: attrs.trigger_feedback as TriggerFeedback[] | undefined,
  impact: attrs.impact as InvestigationImpact | undefined,
});

const docToAttrs = (doc: Omit<NightshiftInvestigationRecord, 'id'>): InvestigationAttributes => ({
  status: doc.status,
  subject_type: doc.subjectType,
  subject_id: doc.subjectId,
  subject_summary: doc.subjectSummary,
  trigger_type: (doc.triggerType as InvestigationTriggerType | undefined) ?? 'manual',
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

export interface SoNightshiftInvestigationsServiceDeps {
  savedObjects: SavedObjectsServiceStart;
}

/**
 * SO-backed NightshiftInvestigationsService.
 * Uses the internal SO repository — authorization is enforced at the route / step layer.
 */
export class SoNightshiftInvestigationsService implements NightshiftInvestigationsService {
  private readonly repo: ISavedObjectsRepository;

  constructor({ savedObjects }: SoNightshiftInvestigationsServiceDeps) {
    this.repo = savedObjects.createInternalRepository([NIGHTSHIFT_INVESTIGATION_SO_TYPE]);
  }

  private ns(spaceId: string): string | undefined {
    return spaceId === 'default' ? undefined : spaceId;
  }

  async upsert(
    spaceId: string,
    doc: Omit<NightshiftInvestigationRecord, 'id'>
  ): Promise<NightshiftInvestigationRecord> {
    // Use conversationId as the SO id so attachment resolve(origin) works with conversationId.
    const id = doc.conversationId ?? doc.subjectId;
    const attrs = docToAttrs(doc);
    const ns = this.ns(spaceId);
    try {
      await this.repo.get(NIGHTSHIFT_INVESTIGATION_SO_TYPE, id, { namespace: ns });
      await this.repo.update<InvestigationAttributes>(NIGHTSHIFT_INVESTIGATION_SO_TYPE, id, attrs, {
        namespace: ns,
      });
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        await this.repo.create<InvestigationAttributes>(NIGHTSHIFT_INVESTIGATION_SO_TYPE, attrs, {
          id,
          namespace: ns,
        });
      } else {
        throw err;
      }
    }
    const so = await this.repo.get<InvestigationAttributes>(NIGHTSHIFT_INVESTIGATION_SO_TYPE, id, {
      namespace: ns,
    });
    return soTypeToRecord(so.id, so.attributes, spaceId);
  }

  async get(spaceId: string, id: string): Promise<NightshiftInvestigationRecord | null> {
    const ns = this.ns(spaceId);
    try {
      const so = await this.repo.get<InvestigationAttributes>(
        NIGHTSHIFT_INVESTIGATION_SO_TYPE,
        id,
        { namespace: ns }
      );
      return soTypeToRecord(so.id, so.attributes, spaceId);
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) return null;
      throw err;
    }
  }

  async list(
    spaceId: string,
    query: {
      status?: InvestigationStatus;
      severity?: Severity;
      subjectType?: InvestigationSubjectType;
      concurrencyKey?: string;
      sortField?: 'createdAt' | 'completedAt' | 'severity';
      sortOrder?: 'asc' | 'desc';
      size: number;
      from: number;
    }
  ): Promise<ListResult> {
    const ns = this.ns(spaceId);
    const a = (f: string) => `${NIGHTSHIFT_INVESTIGATION_SO_TYPE}.attributes.${f}`;
    const filters: string[] = [];
    if (query.status) filters.push(`${a('status')}: "${query.status}"`);
    if (query.severity) filters.push(`${a('severity')}: "${query.severity}"`);
    if (query.subjectType) filters.push(`${a('subject_type')}: "${query.subjectType}"`);
    if (query.concurrencyKey) filters.push(`${a('concurrency_key')}: "${query.concurrencyKey}"`);
    const filter = filters.length ? filters.join(' AND ') : undefined;

    const [listResult, countsResult] = await Promise.all([
      this.repo.find<InvestigationAttributes>({
        type: NIGHTSHIFT_INVESTIGATION_SO_TYPE,
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
      this.getSeverityCounts(spaceId, {
        status: query.status,
        subjectType: query.subjectType,
      }),
    ]);

    return {
      items: listResult.saved_objects.map((so) =>
        soTypeToRecord(so.id, so.attributes, spaceId)
      ),
      total: listResult.total,
      severityCounts: countsResult,
    };
  }

  async getSeverityCounts(
    spaceId: string,
    query: { status?: InvestigationStatus; solution?: string; subjectType?: InvestigationSubjectType }
  ): Promise<Record<string, number>> {
    const ns = this.ns(spaceId);
    const a = (f: string) => `${NIGHTSHIFT_INVESTIGATION_SO_TYPE}.attributes.${f}`;
    const filters: string[] = [];
    if (query.status) filters.push(`${a('status')}: "${query.status}"`);
    if (query.subjectType) filters.push(`${a('subject_type')}: "${query.subjectType}"`);
    type Aggs = { severity: { buckets: Array<{ key: string; doc_count: number }> } };
    const result = await this.repo.find<InvestigationAttributes, Aggs>({
      type: NIGHTSHIFT_INVESTIGATION_SO_TYPE,
      namespaces: [ns ?? 'default'],
      filter: filters.length ? filters.join(' AND ') : undefined,
      perPage: 0,
      aggs: {
        severity: {
          terms: {
            field: `${NIGHTSHIFT_INVESTIGATION_SO_TYPE}.attributes.severity`,
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
