/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SkillAlert {
  id: string;
  type: 'drift' | 'low_success_rate' | 'low_usage' | 'error_spike';
  severity: 'warning' | 'critical';
  message: string;
  created_at: string;
  acknowledged: boolean;
}

export interface SkillPerformanceMetrics {
  skill_id: string;
  skill_name: string;
  deployed_at: string;
  period: { from: string; to: string };
  usage: {
    total_invocations: number;
    unique_agents: number;
    unique_users: number;
    invocations_per_day: Array<{ date: string; count: number }>;
  };
  success: {
    success_rate: number;
    positive_feedback: number;
    negative_feedback: number;
    unknown_feedback: number;
  };
  quality: {
    deployment_score: number;
    current_score: number | null;
    score_delta: number | null;
    drift_detected: boolean;
    last_evaluated_at: string | null;
  };
  alerts: SkillAlert[];
}
