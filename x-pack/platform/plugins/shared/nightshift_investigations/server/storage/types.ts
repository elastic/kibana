/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  InvestigationBlindSpot,
  InvestigationHypothesis,
  InvestigationImpact,
  InvestigationRecommendation,
  InvestigationStatus,
  InvestigationSubjectType,
  InvestigationTriggerType,
  PaginatedResponse,
  Severity,
} from '../../common';
import type { TriggerFeedback } from '@kbn/significant-events-schema';

/**
 * Camelcase version of the structured-output fields, used by the storage layer.
 * The API-facing shape lives in `common/InvestigationStructuredOutput` (snake_case).
 * Only `blindSpots` and `triggerFeedback` differ in casing; the rest are identical.
 */
export interface InvestigationStorageStructuredOutput {
  summary?: string;
  conclusion?: string;
  severity?: Severity;
  hypotheses?: InvestigationHypothesis[];
  recommendations?: InvestigationRecommendation[];
  blindSpots?: InvestigationBlindSpot[];
  triggerFeedback?: TriggerFeedback[];
  impact?: InvestigationImpact;
}

export interface InvestigationAttributes extends InvestigationStorageStructuredOutput {
  status: InvestigationStatus;
  subjectType: InvestigationSubjectType;
  subjectId: string;
  subjectSummary?: string;
  triggerType: InvestigationTriggerType;
  concurrencyKey?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  executedBy?: string;
  error?: string;
  conversationId?: string;
}

export interface InvestigationRecord extends InvestigationAttributes {
  id: string;
  version?: string;
}

/** An investigation with only `Fields` loaded. `id` and `version` are always present. */
export type ProjectedInvestigationRecord<Fields extends keyof InvestigationAttributes> = Pick<
  InvestigationAttributes,
  Fields
> & {
  id: string;
  version?: string;
};

export interface InvestigationPatch extends InvestigationStorageStructuredOutput {
  status?: InvestigationStatus;
  startedAt?: string;
  completedAt?: string;
  executedBy?: string;
  error?: string;
  conversationId?: string;
}

/**
 * Filters shared by the list query, the severity-count facet and the cross-space sweep.
 *
 * Excludes `severities`, pagination and sort: none of them apply to a facet count.
 * `FindInvestigationsQuery` extends this with the parts that are list-only.
 */
export interface SeverityCountsQuery {
  statuses?: InvestigationStatus[];
  subjectTypes?: InvestigationSubjectType[];
  /**
   * Full-text query across subjectSummary, summary, and conclusion.
   * Passed as `search` + `searchFields` to the SO find API, not as part of the KQL filter.
   */
  query?: string;
  concurrencyKey?: string;
  createdAfter?: string;
  createdBefore?: string;
  startedAfter?: string;
  startedBefore?: string;
  completedAfter?: string;
  completedBefore?: string;
}

export interface FindInvestigationsQuery<
  Fields extends keyof InvestigationAttributes = keyof InvestigationAttributes
> extends SeverityCountsQuery {
  severities?: Severity[];
  sortField?: 'createdAt' | 'completedAt' | 'severity';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  perPage?: number;
  fields?: Fields[];
}

/** Counts of investigations at each severity tier, always zero-filled for all four options. */
export type SeverityCounts = Record<Severity, number>;

export type FindInvestigationsResult<
  Fields extends keyof InvestigationAttributes = keyof InvestigationAttributes
> = PaginatedResponse<ProjectedInvestigationRecord<Fields>>;

export interface InvestigationRepository {
  create(params: { id: string; attributes: InvestigationAttributes }): Promise<void>;
  get(id: string): Promise<InvestigationRecord | undefined>;
  update(params: { id: string; patch: InvestigationPatch; version?: string }): Promise<void>;
  find<Fields extends keyof InvestigationAttributes = keyof InvestigationAttributes>(
    query: FindInvestigationsQuery<Fields>
  ): Promise<FindInvestigationsResult<Fields>>;
  countBySeverity(query: SeverityCountsQuery): Promise<SeverityCounts>;
}

export type FindInvestigationsAcrossSpacesResult<
  Fields extends keyof InvestigationAttributes = keyof InvestigationAttributes
> = PaginatedResponse<{ investigation: ProjectedInvestigationRecord<Fields>; spaceId: string }>;

/**
 * Reads and writes investigations in every space at once, for background work that runs without a
 * request and therefore cannot be scoped to one space the way {@link InvestigationRepository} is.
 */
export interface InvestigationSweepRepository {
  findAcrossSpaces<Fields extends keyof InvestigationAttributes = keyof InvestigationAttributes>(
    query: FindInvestigationsQuery<Fields>
  ): Promise<FindInvestigationsAcrossSpacesResult<Fields>>;
  updateInSpace(params: {
    id: string;
    spaceId: string;
    patch: InvestigationPatch;
    version?: string;
  }): Promise<void>;
}
