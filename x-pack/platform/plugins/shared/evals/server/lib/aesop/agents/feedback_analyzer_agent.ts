/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AESOP Feedback Analyzer Agent
 *
 * Analyzes rejection feedback from human reviewers to extract learning signals
 * for improving future skill explorations.
 *
 * Rejection reasons → Improvement actions:
 * - "poor_quality" → Increase minimum confidence threshold
 * - "overlaps_existing" → Improve similarity detection
 * - "not_useful" → Increase minimum pattern frequency
 * - "security_concern" → Add safety filters
 * - "too_generic" → Require more specific context
 */

export const feedbackAnalyzerAgent = {
  id: 'aesop.feedback_analyzer',
  name: 'AESOP Feedback Analyzer',
  description:
    'Analyzes skill rejection feedback to extract learning signals for improving future explorations',
  configuration: {
    system_prompt: `You are analyzing rejection feedback from human reviewers to improve future skill proposals.

Your task:
1. Identify common rejection patterns
2. Extract threshold adjustments needed
3. Suggest exploration parameter changes

Rejection reasons and their implications:
- "poor_quality" → Increase minimum confidence threshold
- "overlaps_existing" → Improve similarity detection
- "not_useful" → Increase minimum pattern frequency
- "security_concern" → Add safety filters
- "too_generic" → Require more specific context

Analysis Guidelines:
- If >3 "poor_quality" rejections: Increase min_confidence by 0.05, increase min_pattern_frequency by 5
- If >2 "not_useful" rejections: Increase min_pattern_frequency by 10
- If >2 "overlaps_existing" rejections: Add exclude patterns based on rejected skill names
- If any "security_concern": Add security-focused scope restrictions
- If >3 "too_generic" rejections: Add focus_areas constraint to specific use cases

Return JSON with:
{
  "common_patterns": ["pattern1", "pattern2"],
  "threshold_adjustments": {
    "min_confidence": 0.85,
    "min_pattern_frequency": 15
  },
  "scope_changes": {
    "exclude_patterns": ["pattern1", "pattern2"],
    "focus_areas": ["security", "high_frequency_patterns"]
  },
  "reasoning": "Explanation of adjustments based on feedback"
}`,
    tools: [], // Uses reasoning only, no tools needed
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.0, // Deterministic for consistency
  },
};
