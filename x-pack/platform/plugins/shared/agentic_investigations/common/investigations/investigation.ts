/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  SEVERITY_OPTIONS,
  investigationHypothesisSchema,
  investigationRecommendationSchema,
  investigationBlindSpotSchema,
  MAX_IMPACT_ENTITIES,
  MAX_HYPOTHESES,
  MAX_RECOMMENDATIONS,
  MAX_BLIND_SPOTS,
} from '@kbn/significant-events-schema';

/** Every string reaching the API is bounded to prevent unbounded-input DoS. */
const MAX_ID_LENGTH = 256;
const MAX_TITLE_LENGTH = 512;
const MAX_SUMMARY_LENGTH = 8192;
/** ISO 8601 timestamps; generous enough for any offset notation. */
const MAX_TIMESTAMP_LENGTH = 64;
const MAX_SOLUTION_LENGTH = 64;

export const investigationStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
]);
export type InvestigationStatus = z.infer<typeof investigationStatusSchema>;

/** Same severity vocabulary the significant-events schema establishes; never drifts. */
export const investigationSeveritySchema = z.enum(SEVERITY_OPTIONS);
export type InvestigationSeverity = z.infer<typeof investigationSeveritySchema>;

/**
 * One entity affected by the investigated situation. Stored as a nested field
 * so compound (name + type) term queries are evaluated per-entity by
 * Elasticsearch rather than across the flattened array.
 * `nameText` duplicates `name` as an analysed field to support full-text search
 * in addition to exact keyword matching.
 *
 * NOTE: this schema is intentionally distinct from `investigationImpactEntitySchema`
 * in `@kbn/significant-events-schema`. That schema uses snake_case field names
 * (`feature_id`, `stream_name`) and carries an `evidence` sub-object suited to
 * the workflow agent's output format. This schema uses camelCase (matching Kibana
 * SO / ES document conventions for this plugin) and adds `nameText` for
 * full-text search. Do not replace this schema with the shared one; the two serve
 * different persistence layers.
 */
const impactedEntitySchema = z.object({
  name: z.string().max(MAX_TITLE_LENGTH),
  nameText: z.string().max(MAX_TITLE_LENGTH),
  type: z.string().max(MAX_ID_LENGTH).optional(),
  featureId: z.string().max(MAX_ID_LENGTH).optional(),
  streamName: z.string().max(MAX_ID_LENGTH).optional(),
});
export type ImpactedEntity = z.infer<typeof impactedEntitySchema>;

export const investigationSchema = z.object({
  id: z.string().max(MAX_ID_LENGTH),
  spaceId: z.string().max(MAX_ID_LENGTH),
  /** Agent Builder conversation driving this investigation. Absent for standalone runs. */
  conversationId: z.string().max(MAX_ID_LENGTH).optional(),
  /** Originating solution namespace (e.g. 'observability', 'security'). */
  solution: z.string().max(MAX_SOLUTION_LENGTH),
  /** What kind of trigger produced this investigation. */
  subjectType: z.enum(['significant_event', 'alert', 'case', 'custom']),
  subjectId: z.string().max(MAX_ID_LENGTH),
  subjectSummary: z.string().max(MAX_SUMMARY_LENGTH).optional(),
  status: investigationStatusSchema,
  severity: investigationSeveritySchema.optional(),
  /**
   * Numeric mirror of `severity` for sort clauses — stored as a `byte` in the
   * index so ordering is a sort clause rather than an in-memory pass.
   * Computed on write from `severity`; never accepted from callers.
   */
  severityRank: z.number().int().optional(),
  title: z.string().max(MAX_TITLE_LENGTH).optional(),
  summary: z.string().max(MAX_SUMMARY_LENGTH).optional(),
  createdAt: z.string().max(MAX_TIMESTAMP_LENGTH),
  startedAt: z.string().max(MAX_TIMESTAMP_LENGTH).optional(),
  completedAt: z.string().max(MAX_TIMESTAMP_LENGTH).optional(),
  updatedAt: z.string().max(MAX_TIMESTAMP_LENGTH),
  /**
   * Nested field: each entity is a nested object so compound queries on
   * name + type or name + featureId evaluate correctly per entity.
   */
  impactedEntities: z.array(impactedEntitySchema).max(MAX_IMPACT_ENTITIES),
  /**
   * Investigation-derived content stored opaque (dynamic: false in the index
   * mapping). Not filterable or aggregatable; used exclusively by attachment
   * resolve() to populate the four investigation attachment types.
   */
  hypotheses: z.array(investigationHypothesisSchema).max(MAX_HYPOTHESES),
  recommendations: z.array(investigationRecommendationSchema).max(MAX_RECOMMENDATIONS),
  blindSpots: z.array(investigationBlindSpotSchema).max(MAX_BLIND_SPOTS),
  /**
   * Nightshift-specific fields. These allow the nightshift investigation client
   * to round-trip its full state through the shared investigation entity without
   * data loss. Stored opaque (dynamic: false) where applicable.
   */
  /** What kind of trigger produced this run (e.g. 'manual', 'significant_event', 'alert'). */
  triggerType: z.string().max(MAX_ID_LENGTH).optional(),
  /**
   * Concurrency deduplication key. Investigations with the same key are
   * run with cancel-in-progress semantics; superseded runs are set to 'cancelled'.
   */
  concurrencyKey: z.string().max(MAX_ID_LENGTH).optional(),
  /** Identity of the principal (user profile uid or system id) that triggered this investigation. */
  executedBy: z.string().max(MAX_ID_LENGTH).optional(),
  /** Error message from a failed investigation run. */
  error: z.string().max(MAX_SUMMARY_LENGTH).optional(),
  /** Final conclusion produced by the investigation agent. */
  conclusion: z.string().max(MAX_SUMMARY_LENGTH).optional(),
  /** Structured trigger feedback entries (opaque, dynamic: false in the index). */
  triggerFeedback: z.array(z.object({}).passthrough()).optional(),
});
export type Investigation = z.infer<typeof investigationSchema>;

/** Partial update shape — all fields except identity are optional. */
export type InvestigationPatch = Partial<Omit<Investigation, 'id' | 'spaceId' | 'createdAt'>>;

export interface ListInvestigationsQuery {
  status?: InvestigationStatus;
  severity?: InvestigationSeverity;
  solution?: string;
  subjectType?: string;
  /** Page size — must stay within Elasticsearch's default result window. */
  size: number;
  from: number;
}

/** Severity label → document count. */
export type InvestigationSeverityCounts = Record<string, number>;
