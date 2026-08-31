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
  investigation_id: string;
  status: InvestigationStatus;
  subject_type: InvestigationSubjectType;
  subject_id: string;
  subject_summary?: string;
  trigger_type: InvestigationTriggerType;
  concurrency_key?: string;
  created_at: string;
  completed_at?: string;
  executed_by?: string;
  error?: string;
  conversation_id?: string;
}

export interface InvestigationRecord extends InvestigationAttributes {
  id: string;
  version?: string;
}

export interface InvestigationPatch extends InvestigationStructuredOutput {
  status?: InvestigationStatus;
  completed_at?: string;
  executed_by?: string;
  error?: string;
  conversation_id?: string;
}

export interface FindInvestigationsQuery {
  statuses?: InvestigationStatus[];
  concurrencyKey?: string;
  createdAfter?: string;
  createdBefore?: string;
  completedAfter?: string;
  completedBefore?: string;
  sortField?: 'created_at' | 'completed_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  perPage?: number;
  fields?: Array<keyof InvestigationAttributes>;
}

export type FindInvestigationsResult = PaginatedResponse<InvestigationRecord>;

export interface InvestigationRepository {
  create({ id, attributes }: { id: string; attributes: InvestigationAttributes }): Promise<void>;
  get(id: string): Promise<InvestigationRecord | undefined>;
  update(id: string, patch: InvestigationPatch, options?: { version?: string }): Promise<void>;
  find(query: FindInvestigationsQuery): Promise<FindInvestigationsResult>;
}
