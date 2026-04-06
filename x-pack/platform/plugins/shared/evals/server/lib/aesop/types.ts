/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ProposedSkillDocument {
  name: string;
  description: string;
  markdown: string;
  content?: string;
  confidence: number;
  derived_from?: 'patterns' | 'relationships' | 'conversations' | 'llm' | 'skill_improvement';
  improvement_type?: 'new' | 'improvement' | 'customization';

  source?: {
    pattern_id: string;
    pattern_frequency: number;
    rationale: string;
    source_indices?: string[];
  };

  metadata?: {
    created_at: string;
    indices_explored: number;
    source_indices?: string[];
    exploration_execution_id: string;
    cycle_number: number;
    discovery_trace_id: string;
  };

  validation?: {
    status: 'pending' | 'validating' | 'passed' | 'failed';
    final_score?: number;
    started_at?: string;
    completed_at?: string;
    connector_id?: string;
    eval_trace_id?: string;
    duration_ms?: number;
    criteria?: {
      relevance: number;
      completeness: number;
      accuracy: number;
      specificity: number;
      safety: number;
    };
    llm_feedback?: string;
    strengths?: string[];
    weaknesses?: string[];
    suggestions?: string[];
    llm_prompt?: string;
    llm_raw_response?: string;
    iterations?: Array<{ score: number; iteration: number; timestamp?: string }>;
    convergence?: {
      converged: boolean;
      reason: string;
      total_iterations: number;
      total_duration_ms: number;
    };
    error?: string;
  };

  review?: {
    status: 'pending_review' | 'approved' | 'rejected';
    reviewed_by?: string;
    reviewed_at?: string;
    review_notes?: string;
    rejection_reason?: string;
    suggested_improvements?: string;
  };

  deployment?: {
    deployed: boolean;
    deployed_at?: string;
    agent_builder_skill_id?: string;
    tool_ids?: string[];
    updated_existing?: boolean;
    redeployed?: boolean;
  };

  base_skill?: {
    id: string;
    name: string;
    readonly: boolean;
    original_content?: string;
  };

  cross_evaluation?: {
    triggered_by_rejection: string;
    action: 'auto_rejected' | 'flagged';
    severity: string;
    reason: string;
    evaluated_at: string;
  };

  rejection_metadata?: {
    rejected_at: string;
    validation_score?: number;
    pattern_frequency?: number;
    confidence?: number;
  };

  improvement_history?: Array<{
    improved_at: string;
    improved_by: string;
    connector_id: string;
    previous_score?: number;
    feedback_applied?: string;
  }>;

  last_edited_at?: string;
  last_edited_by?: string;
}
