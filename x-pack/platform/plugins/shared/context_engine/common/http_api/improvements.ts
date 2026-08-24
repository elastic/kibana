/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Prefix for the per-space Context Engine improvements indices (one index per Kibana space).
 *
 * The `.contextengine-` prefix is not cosmetic. Elasticsearch's built-in `kibana_system` role grants
 * `read,write,manage` on `.contextengine-*` with `allow_restricted_indices`, and grants nothing on a
 * `context-engine-improvements-*` pattern, so Kibana's internal user cannot create an index under
 * the latter name. It also makes the index restricted: not even `superuser` can read or write it
 * directly, which is why the store is only ever reached through `ImprovementsService`. Moving to
 * `context-engine-improvements-` (the unrestricted namespace `context-engine-signals-*` lives in)
 * means adding that pattern to the role in the Elasticsearch repo first.
 */
export const IMPROVEMENT_INDEX_PREFIX = '.contextengine-improvements-';

/** The improvements index name for a given Kibana space. */
export const buildImprovementsIndexName = (spaceId: string): string =>
  `${IMPROVEMENT_INDEX_PREFIX}${spaceId}`;

/**
 * What an improvement does when applied. Removals are soft: a KI is flagged as deleted and a
 * workflow is disabled, so an applied removal is always recoverable.
 */
export const IMPROVEMENT_ACTIONS = [
  'add_ki',
  'edit_ki',
  'remove_ki',
  'add_workflow',
  'edit_workflow',
  'remove_workflow',
] as const;

export type ImprovementAction = (typeof IMPROVEMENT_ACTIONS)[number];

/**
 * Review lifecycle. `proposed` is the only state the user acts on; `failed` is an approval whose
 * apply step errored, and stays actionable so it can be retried once the cause is fixed.
 */
export const IMPROVEMENT_STATUSES = ['proposed', 'applied', 'rejected', 'failed'] as const;

export type ImprovementStatus = (typeof IMPROVEMENT_STATUSES)[number];

/** Statuses the user still has to act on; the panel shows these by default. */
export const OPEN_IMPROVEMENT_STATUSES: readonly ImprovementStatus[] = ['proposed', 'failed'];

/** What an action operates on. Absent for `add_ki` / `add_workflow`, which create their target. */
export interface ImprovementTarget {
  /** ES `_id` of the KI document in the AI index dest, for `edit_ki` / `remove_ki`. */
  ki_id?: string;
  /** Workflow id, for `edit_workflow` / `remove_workflow`. */
  workflow_id?: string;
}

/** The KI fields an `add_ki` / `edit_ki` improvement writes. Mirrors the base AI index mappings. */
export interface ImprovementKiPayload {
  type?: string;
  title?: string;
  description?: string;
  content?: string;
  tags?: string[];
  attributes?: Record<string, unknown>;
}

/**
 * Action-shaped body of an improvement. `ki` carries the document for `*_ki` actions and
 * `workflow_yaml` the definition for `add_workflow` / `edit_workflow`; `remove_*` needs neither.
 */
export interface ImprovementPayload {
  ki?: ImprovementKiPayload;
  workflow_yaml?: string;
}

/** How an approval or rejection resolved. */
export interface ImprovementResolution {
  /** Username of the user who approved or rejected. */
  by?: string;
  /** Failure reason when `status` is `failed`. */
  error?: string;
  /** Id of the KI or workflow the apply step created or touched. */
  applied_target_id?: string;
}

/**
 * A proposed change to an AI index's Knowledge Indicators or automations, plus its review
 * lifecycle. `improvement_id` is the ES `_id`, so re-proposing the same id overwrites rather than
 * duplicates.
 */
export interface ImprovementEnvelope {
  improvement_id: string;
  /** The AI index this improvement targets. */
  ai_index_id: string;
  status: ImprovementStatus;
  action: ImprovementAction;
  /** Short, user-facing summary of the change. */
  title: string;
  /** Why the agent proposed it, in terms of the signals it saw. */
  rationale: string;
  /** Signal tags that motivated the suggestion, for tracing it back to the evidence. */
  signal_tags?: string[];
  signal_ids?: string[];
  target?: ImprovementTarget;
  payload: ImprovementPayload;
  /** Agent's self-reported confidence, 0-1. */
  confidence?: number;
  /** Workflow execution id of the run that proposed this. */
  run_id?: string;
  suggested_at: string;
  applied_at?: string;
  rejected_at?: string;
  resolution?: ImprovementResolution;
}

/** A single suggestion as the feedback agent returns it, before it becomes an improvement. */
export interface ProposedImprovement {
  action: ImprovementAction;
  title: string;
  rationale: string;
  confidence?: number;
  signal_tags?: string[];
  signal_ids?: string[];
  target_ki_id?: string;
  target_workflow_id?: string;
  ki?: ImprovementKiPayload;
  workflow_yaml?: string;
}

/** Response of the improvements list (paginated, newest first). */
export interface ListImprovementsResponse {
  improvements: ImprovementEnvelope[];
  /** Total number of improvements matching the query (for pagination). */
  total: number;
}

/** Body of the improvements-record route, written by a feedback-loop run. */
export interface RecordImprovementsRequest {
  ai_index_id: string;
  run_id?: string;
  improvements: ProposedImprovement[];
}

export interface RecordImprovementsResponse {
  /** Ids of the improvements that were recorded. */
  recorded: string[];
  /** Suggestions dropped because they duplicated an existing proposal or resolution. */
  skipped: number;
}

/** Response of approve/reject: the improvement in its new state. */
export interface MutateImprovementResponse {
  improvement: ImprovementEnvelope;
}
