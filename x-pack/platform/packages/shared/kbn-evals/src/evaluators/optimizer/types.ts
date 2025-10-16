/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SystemPromptAnalysis {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface ToolUsageAnalysis {
  tool_selection_quality: string;
  usage_effectiveness: string;
  missed_opportunities: string[];
}

export interface OptimizerAnalysis {
  system_prompt_analysis: SystemPromptAnalysis;
  tool_usage_analysis: ToolUsageAnalysis;
  overall_feedback: string;
  satisfaction_score: number;
}
