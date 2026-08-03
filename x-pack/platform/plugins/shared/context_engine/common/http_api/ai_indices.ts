/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The type of backing store an AI index is attached to. `index` covers a
 * concrete index name or an index pattern (e.g. `foo`, `foo,bar`, `foo*`).
 */
export type AiIndexType = 'data_stream' | 'index';

export interface AiIndexDest {
  type: AiIndexType;
  value: string;
}

export type AiIndexSourceType = 'esql';

export interface AiIndexSource {
  type: AiIndexSourceType;
  value: string;
}

export type AiIndexAutomationType = 'workflow';

/**
 * The job an automation performs for the AI index. Only `ki_creation` today:
 * these workflows populate the backing store with knowledge items. The
 * self-improvement loop (case building + trace classification) runs as Task
 * Manager tasks, not automations, so it has no role here.
 */
export type AiIndexAutomationRole = 'ki_creation';

export const aiIndexAutomationRoles: readonly AiIndexAutomationRole[] = ['ki_creation'] as const;

export interface AiIndexAutomation {
  type: AiIndexAutomationType;
  value: string;
  role?: AiIndexAutomationRole;
  /**
   * Marks an automation the management agent owns and may rewrite. Hand-written
   * automations stay unmanaged and are never modified for the user.
   */
  managed?: boolean;
}

/**
 * Self-improvement configuration. When enabled, the plugin schedules the
 * `case_builder` and `trace_classifier` Task Manager tasks against `traces_index`
 * to build cases from agent traces and classify them into patterns.
 */
export interface AiIndexSelfImprovement {
  enabled: boolean;
  traces_index: string;
}

export interface AiIndexProperties {
  description?: string;
  dest: AiIndexDest;
  automations: AiIndexAutomation[];
  sources: AiIndexSource[];
  self_improvement?: AiIndexSelfImprovement;
}

export interface AiIndexHttpItem extends AiIndexProperties {
  id: string;
  managed: boolean;
  date_created: string;
  date_modified: string;
}

export type GetAiIndexResponse = AiIndexHttpItem;

export interface ListAiIndexResponse {
  ai_indices: AiIndexHttpItem[];
}

export interface CreateAiIndexRequest extends AiIndexProperties {
  id: string;
}

export interface CreateAiIndexResponse {
  status: 'created';
}

export interface PutAiIndexResponse {
  status: 'created' | 'updated';
}

export interface DeleteAiIndexResponse {
  acknowledged: boolean;
}
