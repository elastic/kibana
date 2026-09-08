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
  concurrencyKey?: string;
  createdAfter?: string;
  createdBefore?: string;
  startedAfter?: string;
  startedBefore?: string;
  completedAfter?: string;
  completedBefore?: string;
  sortField?: 'created_at' | 'completed_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  perPage?: number;
  fields?: Fields[];
}

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
