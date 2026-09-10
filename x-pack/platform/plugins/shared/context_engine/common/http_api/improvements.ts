/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImprovementAction } from './improvement_actions';
import type { KiFields, KiPartialFields } from '../step_types/ki';

/** The single global Context Engine improvements index. */
export const IMPROVEMENTS_INDEX = 'context-engine-improvements';

/** Where an improvement stands with its reviewer. */
export const IMPROVEMENT_STATUSES = ['suggested', 'applied', 'rejected', 'failed'] as const;

export type ImprovementStatus = (typeof IMPROVEMENT_STATUSES)[number];

export const isImprovementStatus = (value: string): value is ImprovementStatus =>
  (IMPROVEMENT_STATUSES as readonly string[]).includes(value);

/**
 * How much history an AI index carries, without the documents. A run is told the shape of what
 * came before so it knows whether to look, and queries the index itself for the lineage of the
 * target it lands on.
 */
export interface ImprovementHistorySummary {
  total: number;
  by_status: Partial<Record<ImprovementStatus, number>>;
}

/** True for the `add_*` actions, which create their target. */
export const isAddAction = (action: ImprovementAction): boolean => action.startsWith('add_');

/** What the action operates on. */
export interface ImprovementTarget {
  /** ES `_id` of the KI document in the AI index dest. */
  ki_id?: string;
  /** Automation id, for `edit_workflow` / `remove_workflow`. */
  workflow_id?: string;
  /** The existing source, for `edit_source` / `remove_source`. */
  source_value?: string;
  /**
   * What an `add_*` action is about, typically the index or source whose missing coverage the
   * addition would close.
   */
  subject?: string;
}

/** The body the action writes. Kept in `_source`, not indexed. */
export interface ImprovementPayload {
  /** For `add_ki` — the document exactly as `context-engine.createKi` takes it. */
  ki?: KiFields;
  /** For `edit_ki` — the fields to change, exactly as `context-engine.updateKi` takes it. */
  ki_patch?: KiPartialFields;
  workflow_yaml?: string;
  source?: { type: 'esql' | 'connector'; value: string };
}

/** How an approval or rejection resolved. */
export interface ImprovementResolution {
  /** Username who approved / rejected. */
  by?: string;
  /** Why a reviewer dismissed the improvement, in their words. */
  reason?: string;
  /** Why the apply step errored, when status is `failed`. Nothing was written. */
  error?: string;
  /** The KI / workflow the apply step created or touched. */
  applied_target_id?: string;
}

export interface ImprovementProvenance {
  /** The analysis run that produced it. */
  agent_run_id: string;
  /** Signals it was derived from. */
  signal_ids: string[];
  /** Spaces those signals came from. */
  signal_spaces: string[];
  signal_window: { from: string; to: string };
  signal_count: number;
  /** Classifier tags that drove it (`query_error` / `empty_retrieval` / `coverage_gap`). */
  tags?: string[];
}

export interface Improvement {
  /** Stable, idempotent lineage key. An indexed field, not the ES `_id`. */
  improvement_id: string;
  /** Unique per revision; this is the ES `_id`. */
  revision_id: string;
  /** Append-log lineage: the revision this one superseded. */
  previous_revision_id?: string;
  /** True on the newest revision of this `improvement_id`. */
  latest: boolean;
  ai_index_id: string;
  /** Revision time. */
  '@timestamp': string;
  status: ImprovementStatus;
  suggested_at: string;
  applied_at?: string;
  rejected_at?: string;
  title: string;
  rationale: string;
  action: ImprovementAction;
  target?: ImprovementTarget;
  payload: ImprovementPayload;
  resolution?: ImprovementResolution;
  provenance: ImprovementProvenance;
}

/** What a caller supplies to {@link ImprovementsServiceApi.write}. */
export type ImprovementRevisionInput = Omit<
  Improvement,
  'revision_id' | 'previous_revision_id' | 'latest' | '@timestamp' | 'suggested_at'
> & {
  /** Defaults to the write time. */
  suggested_at?: string;
};

/** The statuses a caller may transition an improvement to. */
export type ImprovementTransition = Extract<ImprovementStatus, 'applied' | 'rejected' | 'failed'>;

/** Response shape of a paginated improvements list: one entry per `improvement_id` (its head). */
export interface ListImprovementsResponse {
  items: Improvement[];
  total: number;
}

/** What an analysis run posts when it finishes. */
export interface RecordImprovementsRequest {
  ai_index_id: string;
  /** The workflow execution that produced these. */
  agent_run_id: string;
  signal_window: { from: string; to: string };
  signal_spaces: string[];
  improvements: unknown[];
}

/** Why a proposal was not recorded. */
export type SkippedImprovementReason =
  | 'action_not_allowed'
  | 'invalid'
  | 'duplicate'
  | 'conflict'
  | 'limit_exceeded';

export interface RecordImprovementsResponse {
  /** Lineages that gained a revision, in the order they were proposed. */
  recorded: Array<{ improvement_id: string; action: ImprovementAction; title: string }>;
  /** Proposals that were dropped, each with the reason. */
  skipped: Array<{
    action?: string;
    title?: string;
    reason: SkippedImprovementReason;
    detail: string;
  }>;
}
