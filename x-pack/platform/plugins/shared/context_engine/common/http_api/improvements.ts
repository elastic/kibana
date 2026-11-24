/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImprovementAction } from './improvement_actions';
import type { KiFields, KiPartialFields } from '../step_types/ki';

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

/** The body the action writes. */
export interface ImprovementPayload {
  /** For `add_ki` — the document exactly as `context-engine.createKi` takes it. */
  ki?: KiFields;
  /** For `edit_ki` — the fields to change, exactly as `context-engine.updateKi` takes it. */
  ki_patch?: KiPartialFields;
  workflow_yaml?: string;
  source?: { type: 'esql' | 'connector'; value: string };
}

/** Response to starting a feedback analysis run. */
export interface RunFeedbackAnalysisResponse {
  /** Id of the started workflow execution. */
  execution_id: string;
}

/** Why a proposal was not recorded. */
export type SkippedImprovementReason =
  | 'action_not_allowed'
  | 'invalid'
  | 'duplicate'
  | 'limit_exceeded'
  | 'proposal_failed';

export interface RecordImprovementsResponse {
  /** Changes put up for review, in the order they were proposed. */
  recorded: Array<{ improvement_id: string; action: ImprovementAction; title: string }>;
  /** Proposals that were dropped, each with the reason. */
  skipped: Array<{
    action?: string;
    title?: string;
    reason: SkippedImprovementReason;
    detail: string;
  }>;
}
