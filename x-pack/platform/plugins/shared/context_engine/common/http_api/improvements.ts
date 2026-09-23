/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImprovementAction } from './improvement_actions';
import type { KiFields, KiPartialFields } from '../step_types/ki';

/**
 * The single global Context Engine improvements index.
 *
 * Global rather than per-space (unlike signals): an improvement targets an AI index's KI
 * pipeline, and the AI index registry has no space dimension. One index also means a single
 * `deleteByAiIndex` cleans up completely when an AI index goes away.
 */
export const IMPROVEMENTS_INDEX = 'context-engine-improvements';

/**
 * Where an improvement stands with its reviewer.
 *
 * - `suggested` — proposed by an analysis run, waiting for review. The only status a write reaches.
 * - `applied` — approved, and the change was written to the AI index.
 * - `rejected` — dismissed by a reviewer; nothing was written. `resolution.reason` says why.
 * - `failed` — approved, but the apply step errored, so nothing was written. Deliberately a status
 *   rather than an error return: the improvement stays visible in the review UI and remains
 *   actionable for a retry once the cause is fixed, and `resolution.error` carries the reason.
 */
export type ImprovementStatus = 'suggested' | 'applied' | 'rejected' | 'failed';

/** The `add_*` actions create their target, so they carry no {@link ImprovementTarget}. */
export const isAddAction = (action: ImprovementAction): boolean => action.startsWith('add_');

/** What the action operates on. The `add_*` actions create their target and carry a `subject` instead. */
export interface ImprovementTarget {
  /** ES `_id` of the KI document in the AI index dest. */
  ki_id?: string;
  /** Automation id, for `edit_workflow` / `remove_workflow`. */
  workflow_id?: string;
  /** The existing source, for `edit_source` / `remove_source`. */
  source_value?: string;
  /**
   * What an `add_*` action is about — typically the index or source whose missing coverage the
   * addition would close. An `add_*` action has no existing target to identify it, and its payload
   * is agent-authored prose, so without this the change fingerprint would either collapse every
   * addition into one improvement or churn a new one on every run.
   */
  subject?: string;
}

/**
 * The body the action writes. Kept in `_source`, not indexed — see the storage schema.
 *
 * The KI fields are the step contracts rather than a local shape, so a proposal cannot describe a
 * document the apply step would reject. Hand-rolling them had already drifted: `type` and `title`
 * are required by `createKi` but were optional here, so an improvement could typecheck and then
 * fail on apply. Note that both step schemas strip unknown top-level keys, so custom fields belong
 * under `attributes`.
 */
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
  /**
   * Why a reviewer dismissed the improvement, in their words. Distinct from `error`: this is a
   * judgement, not a fault. The run briefing reads it back, so the analysis knows a fix was
   * considered and turned down rather than re-proposing it on the next pass.
   */
  reason?: string;
  /** Why the apply step errored, when status is `failed`. Nothing was written. */
  error?: string;
  /** The KI / workflow the apply step created or touched, so the UI can link to it. */
  applied_target_id?: string;
}

export interface ImprovementProvenance {
  /** The analysis run that produced it. */
  agent_run_id: string;
  /** Signals it was derived from. */
  signal_ids: string[];
  /** Spaces those signals came from; the analysis reads across all of them. */
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
  /** True on the newest revision of this `improvement_id`; `list`/`get` filter on it. */
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

/**
 * What a caller supplies to {@link ImprovementsServiceApi.write}. The service owns the append-log
 * fields (`revision_id`, `previous_revision_id`, `latest`, `@timestamp`) so a caller cannot
 * construct a lineage that breaks the single-head invariant.
 */
export type ImprovementRevisionInput = Omit<
  Improvement,
  'revision_id' | 'previous_revision_id' | 'latest' | '@timestamp' | 'suggested_at'
> & {
  /** Defaults to the write time. */
  suggested_at?: string;
};

/** The statuses a caller may transition an improvement to; `suggested` is only reached by a write. */
export type ImprovementTransition = Extract<ImprovementStatus, 'applied' | 'rejected' | 'failed'>;

/** Response shape of a paginated improvements list: one entry per `improvement_id` (its head). */
export interface ListImprovementsResponse {
  items: Improvement[];
  total: number;
}
