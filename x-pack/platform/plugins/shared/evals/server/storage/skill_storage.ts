/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';

export const PROPOSED_SKILL_SAVED_OBJECT_TYPE = 'evals-proposed-skill';

export interface ProposedSkillAttributes {
  name: string;
  description: string;
  markdown: string;
  confidence: number;
  derived_from?: string;
  variant_group_id?: string;
  variant_label?: string;

  validation_status: string;
  validation_final_score?: number;
  validation_composite_score?: number;
  validation_composite_grade?: string;
  validation_started_at?: string;
  validation_completed_at?: string;
  validation_connector_id?: string;
  validation_duration_ms?: number;
  validation_evaluator_results?: string; // JSON
  validation_gate_result?: string; // JSON
  validation_iterations?: string; // JSON
  validation_convergence?: string; // JSON
  validation_error?: string;

  review_status: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  rejection_reason?: string;

  deployed: boolean;
  deployed_at?: string;
  agent_builder_skill_id?: string;

  improvement_history?: string; // JSON

  created_at: string;
  updated_at: string;
  exploration_execution_id?: string;
  source_indices?: string; // JSON
}

export const proposedSkillSavedObjectType: SavedObjectsType = {
  name: PROPOSED_SKILL_SAVED_OBJECT_TYPE,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      name: { type: 'keyword' },
      description: { type: 'text' },
      markdown: { type: 'text' },
      confidence: { type: 'float' },
      derived_from: { type: 'keyword' },
      variant_group_id: { type: 'keyword' },
      variant_label: { type: 'keyword' },
      validation_status: { type: 'keyword' },
      validation_final_score: { type: 'float' },
      validation_composite_grade: { type: 'keyword' },
      review_status: { type: 'keyword' },
      reviewed_by: { type: 'keyword' },
      reviewed_at: { type: 'date' },
      deployed: { type: 'boolean' },
      deployed_at: { type: 'date' },
      agent_builder_skill_id: { type: 'keyword' },
      created_at: { type: 'date' },
      updated_at: { type: 'date' },
      exploration_execution_id: { type: 'keyword' },
    },
  },
  // Baseline model version so future schema changes have a migration anchor.
  modelVersions: {
    1: { changes: [] },
  },
};
