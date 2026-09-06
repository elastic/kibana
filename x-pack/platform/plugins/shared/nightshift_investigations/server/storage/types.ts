/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  InvestigationStatus,
  InvestigationStructuredOutput,
  InvestigationSubjectType,
  InvestigationTriggerType,
  PaginatedResponse,
  Severity,
} from '../../common';

export interface InvestigationAttributes extends InvestigationStructuredOutput {
  status: InvestigationStatus;
  subject_type: InvestigationSubjectType;
  subject_id: string;
  subject_summary?: string;
  trigger_type: InvestigationTriggerType;
  concurrency_key?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  executed_by?: string;
  error?: string;
  conversation_id?: string;
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

export interface InvestigationPatch extends InvestigationStructuredOutput {
  status?: InvestigationStatus;
  started_at?: string;
  completed_at?: string;
  executed_by?: string;
  error?: string;
  conversation_id?: string;
}

export interface FindInvestigationsQuery<
  Fields extends keyof InvestigationAttributes = keyof InvestigationAttributes
> {
  statuses?: InvestigationStatus[];
  severities?: Severity[];
  subjectTypes?: InvestigationSubjectType[];
  /**
   * Full-text query across subject_summary, summary, and conclusion.
   * Passed as `search` + `searchFields` to the SO find API.
   */
  query?: string;
  concurrencyKey?: string;
  createdAfter?: string;
  createdBefore?: string;
  startedAfter?: string;
  startedBefore?: string;
  completedAfter?: string;
  completedBefore?: string;
  sortField?: 'created_at' | 'completed_at' | 'severity';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  perPage?: number;
  fields?: Fields[];
}

/** Counts of investigations at each severity tier, always zero-filled for all four options. */
export type SeverityCounts = Record<Severity, number>;

export interface FindInvestigationsResult<
  Fields extends keyof InvestigationAttributes = keyof InvestigationAttributes
> extends PaginatedResponse<ProjectedInvestigationRecord<Fields>> {
  /** Severity facet counts. Always present; reflects base filters but not the active severity selection. */
  severityCounts: SeverityCounts;
}

export interface InvestigationRepository {
  create(params: { id: string; attributes: InvestigationAttributes }): Promise<void>;
  get(id: string): Promise<InvestigationRecord | undefined>;
  update(params: { id: string; patch: InvestigationPatch; version?: string }): Promise<void>;
  find<Fields extends keyof InvestigationAttributes = keyof InvestigationAttributes>(
    query: FindInvestigationsQuery<Fields>
  ): Promise<FindInvestigationsResult<Fields>>;
}
