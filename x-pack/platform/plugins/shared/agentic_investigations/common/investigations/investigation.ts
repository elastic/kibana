/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ProposalConfidence, ProposalImpact, ProposalStatus } from '@kbn/proposals-common';
import type { InvestigationEvidence } from '../evidence/evidence';
import type { Hypothesis } from '../hypotheses/hypotheses';
import { INVESTIGATION_SUBJECT_TYPES, MAX_SUBJECT_ID_LENGTH } from '../subjects/constants';
import type {
  AlertSubjectSnapshot,
  InvestigationSubjectTriggerType,
  InvestigationSubjectType,
  SlackThreadSubject,
} from '../subjects/subject';
import {
  DEFAULT_INVESTIGATIONS_PAGE_SIZE,
  INVESTIGATION_METADATA_STATUSES,
  INVESTIGATION_SEVERITIES,
  INVESTIGATION_SEVERITY_NONE,
  INVESTIGATIONS_SORT_FIELDS,
  MAX_INVESTIGATION_CANDIDATES,
  MAX_INVESTIGATION_FILTER_VALUES,
  MAX_INVESTIGATION_ID_FILTER_VALUES,
  MAX_INVESTIGATIONS_PAGE_SIZE,
} from './constants';

const MAX_ID_LENGTH = 256;
const MAX_FILTER_TEXT_LENGTH = 256;

export type InvestigationSeverity = (typeof INVESTIGATION_SEVERITIES)[number];
/** A severity filter value: a severity, or `none` for investigations without one. */
export type InvestigationSeverityFilterValue =
  | InvestigationSeverity
  | typeof INVESTIGATION_SEVERITY_NONE;
export type InvestigationMetadataStatus = (typeof INVESTIGATION_METADATA_STATUSES)[number];
export type InvestigationsSortField = (typeof INVESTIGATIONS_SORT_FIELDS)[number];

/**
 * A multi-valued filter. A query string sends one value as a string and several as repeated
 * keys, so both forms are accepted and normalized to an array.
 */
const multiValued = <TItem extends z.ZodType>(
  item: TItem,
  maxValues: number = MAX_INVESTIGATION_FILTER_VALUES
) =>
  z
    .union([item, z.array(item).min(1).max(maxValues)])
    .transform((value): Array<z.output<TItem>> => (Array.isArray(value) ? value : [value]))
    .optional();

/** `true`/`false` from a query string, or a boolean from an in-process caller. */
const booleanParam = z
  .union([z.boolean(), z.enum(['true', 'false']).transform((value) => value === 'true')])
  .optional();

export const investigationIdSchema = z.string().min(1).max(MAX_ID_LENGTH);

export const investigationIdParamsSchema = z.object({ id: investigationIdSchema });

/** Filters shared by the list and the severity counts. All of them are ANDed. */
export const investigationFiltersSchema = z.object({
  /** Investigation (conversation) ids, for reading a known set such as the cards on screen. */
  id: multiValued(investigationIdSchema, MAX_INVESTIGATION_ID_FILTER_VALUES),
  status: multiValued(z.enum(INVESTIGATION_METADATA_STATUSES)),
  /** `none` matches investigations whose severity has not been set. */
  severity: multiValued(z.enum([...INVESTIGATION_SEVERITIES, INVESTIGATION_SEVERITY_NONE])),
  /** True: only investigations an agent or driver workflow is working on now. False: the rest. */
  in_progress: booleanParam,
  subject_type: multiValued(z.enum(INVESTIGATION_SUBJECT_TYPES)),
  subject_id: multiValued(z.string().min(1).max(MAX_SUBJECT_ID_LENGTH)),
  /** Impacted entity id or name, matched exactly. */
  entity: z.string().min(1).max(MAX_FILTER_TEXT_LENGTH).optional(),
  /** Case-insensitive text matched against the title, summary, and verdict. */
  query: z.string().trim().min(1).max(MAX_FILTER_TEXT_LENGTH).optional(),
  created_after: z.iso.datetime({ offset: true }).optional(),
  created_before: z.iso.datetime({ offset: true }).optional(),
});
export type InvestigationFiltersInput = z.input<typeof investigationFiltersSchema>;
export type InvestigationFilters = z.output<typeof investigationFiltersSchema>;

export const listInvestigationsQuerySchema = investigationFiltersSchema
  .extend({
    sort_field: z.enum(INVESTIGATIONS_SORT_FIELDS).default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
    page: z.coerce.number().int().min(1).default(1),
    per_page: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_INVESTIGATIONS_PAGE_SIZE)
      .default(DEFAULT_INVESTIGATIONS_PAGE_SIZE),
  })
  .refine(({ page, per_page: perPage }) => page * perPage <= MAX_INVESTIGATION_CANDIDATES, {
    message: `page * per_page must not exceed ${MAX_INVESTIGATION_CANDIDATES}; investigations beyond that are not reachable through this API`,
  });
export type ListInvestigationsQueryInput = z.input<typeof listInvestigationsQuerySchema>;
export type ListInvestigationsQuery = z.output<typeof listInvestigationsQuerySchema>;

/** The investigation template fields this API reads. A missing status reads as open. */
export interface InvestigationMetadata {
  status: InvestigationMetadataStatus;
  severity?: InvestigationSeverity;
  /** What happened. */
  summary?: string;
  /** The conclusion. */
  verdict?: string;
}

/** What the investigation is about, one entry per subject. */
export interface InvestigationSubjectResponse {
  type: InvestigationSubjectType;
  id: string;
  summary?: string;
  trigger_type?: InvestigationSubjectTriggerType;
  snapshot?: AlertSubjectSnapshot;
  slack?: SlackThreadSubject;
  created_at: string;
  updated_at?: string;
}

export interface InvestigationImpactEntityResponse {
  id: string;
  name?: string;
  type?: string;
  feature_id?: string;
  stream_name?: string;
  evidence?: InvestigationEvidence;
}

export interface InvestigationImpactResponse {
  summary?: string;
  evidence?: InvestigationEvidence;
  entities: InvestigationImpactEntityResponse[];
  created_at: string;
  updated_at?: string;
}

export interface InvestigationHypothesesResponse {
  hypotheses: Hypothesis[];
  created_at: string;
  updated_at?: string;
}

/** A proposed action on the investigation, without its action input or decision details. */
export interface InvestigationProposalSummary {
  id: string;
  title: string;
  comment: string;
  status: ProposalStatus;
  impact: ProposalImpact;
  confidence: ProposalConfidence;
  category?: string;
  created_at: string;
  decided_at?: string;
}

/** An investigation in a list: the conversation, its metadata, subjects, and impact. */
export interface InvestigationSummary {
  /** The conversation id. */
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  agent_id: string;
  metadata: InvestigationMetadata;
  /** An agent run or a registered driver workflow execution is working on it now. */
  in_progress: boolean;
  subjects: InvestigationSubjectResponse[];
  impact?: InvestigationImpactResponse;
  /**
   * Proposed actions waiting for a decision. Absent when the proposals plugin is unavailable or
   * the caller may not read proposals.
   */
  pending_proposal_count?: number;
}

/** One investigation, with hypotheses and proposed actions. */
export interface Investigation extends InvestigationSummary {
  hypotheses?: InvestigationHypothesesResponse;
  proposals: InvestigationProposalSummary[];
}

export interface ListInvestigationsResponse {
  results: InvestigationSummary[];
  /** `total` counts at most {@link MAX_INVESTIGATION_CANDIDATES} investigations. */
  pagination: { total: number; page: number; per_page: number };
}

/** Filtered investigations per severity. Investigations without a severity are not counted. */
export type InvestigationSeverityCounts = Record<InvestigationSeverity, number>;
