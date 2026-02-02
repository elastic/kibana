/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

/**
 * Schema for improvement suggestion categories indicating the area of the system that can be improved.
 */
export const improvementSuggestionCategorySchema = z.enum([
  'prompt',
  'tool_selection',
  'response_quality',
  'context_retrieval',
  'reasoning',
  'accuracy',
  'efficiency',
  'other',
]);

/**
 * Schema for impact level indicating the potential benefit of implementing the suggestion.
 */
export const improvementSuggestionImpactSchema = z.enum(['high', 'medium', 'low']);

/**
 * Schema for confidence level indicating how certain the analysis is about this suggestion.
 */
export const improvementSuggestionConfidenceSchema = z.enum(['high', 'medium', 'low']);

/**
 * Schema for evidence supporting an improvement suggestion, linking back to specific evaluation results.
 */
export const improvementSuggestionEvidenceSchema = z.object({
  evaluatorName: z.string().describe('Name of the evaluator that identified the issue.'),
  exampleIndices: z.array(z.number()).describe('Indices of examples that exhibited the issue.'),
  score: z.number().optional().describe('Relevant score or metric value.'),
  explanation: z.string().optional().describe('Explanation from the evaluator about the issue.'),
  details: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Additional context or details about the evidence.'),
});

/**
 * Schema for a single improvement suggestion derived from evaluation results.
 */
export const improvementSuggestionSchema = z.object({
  id: z.string().describe('Unique identifier for the suggestion.'),
  title: z.string().describe('Short descriptive title of the suggestion.'),
  description: z.string().describe('Detailed description of the issue and proposed improvement.'),
  category: improvementSuggestionCategorySchema.describe('Category of the improvement.'),
  impact: improvementSuggestionImpactSchema.describe(
    'Estimated impact if the suggestion is implemented.'
  ),
  confidence: improvementSuggestionConfidenceSchema.describe(
    'Confidence level in this suggestion.'
  ),
  evidence: z
    .array(improvementSuggestionEvidenceSchema)
    .describe('Evidence from evaluations supporting this suggestion.'),
  actionItems: z
    .array(z.string())
    .optional()
    .describe('Concrete action items to implement the improvement.'),
  priorityScore: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Optional priority score for ranking suggestions (0-1 scale).'),
  tags: z.array(z.string()).optional().describe('Tags for filtering and categorization.'),
});

/**
 * Schema for summary statistics for a collection of improvement suggestions.
 */
export const improvementSuggestionSummarySchema = z.object({
  totalSuggestions: z.number().describe('Total number of suggestions.'),
  byImpact: z
    .object({
      high: z.number(),
      medium: z.number(),
      low: z.number(),
    })
    .describe('Breakdown by impact level.'),
  byCategory: z
    .object({
      prompt: z.number(),
      tool_selection: z.number(),
      response_quality: z.number(),
      context_retrieval: z.number(),
      reasoning: z.number(),
      accuracy: z.number(),
      efficiency: z.number(),
      other: z.number(),
    })
    .describe('Breakdown by category.'),
  topPriority: z
    .array(improvementSuggestionSchema)
    .describe('Top priority suggestions (sorted by priorityScore).'),
});

/**
 * Schema for the result of analyzing evaluation results to generate improvement suggestions.
 */
export const improvementSuggestionAnalysisResultSchema = z.object({
  suggestions: z.array(improvementSuggestionSchema).describe('List of improvement suggestions.'),
  summary: improvementSuggestionSummarySchema.describe('Summary statistics.'),
  metadata: z
    .object({
      runId: z.string().describe('ID of the evaluation run that was analyzed.'),
      datasetName: z.string().describe('Dataset name that was analyzed.'),
      model: z.string().optional().describe('Model used in the evaluation.'),
      analyzedAt: z.string().describe('Timestamp when the analysis was performed.'),
      analyzerModel: z
        .string()
        .optional()
        .describe('Model used to generate the suggestions (if LLM-based).'),
    })
    .describe('Metadata about the analysis.'),
});

/**
 * Schema for LLM response when generating improvement suggestions.
 * This is a simplified schema for direct LLM output that can be transformed
 * into the full ImprovementSuggestionAnalysisResult.
 */
export const llmImprovementSuggestionsResponseSchema = z.object({
  suggestions: z
    .array(
      z.object({
        title: z.string().describe('Short descriptive title of the suggestion.'),
        description: z
          .string()
          .describe('Detailed description of the issue and proposed improvement.'),
        category: improvementSuggestionCategorySchema.describe('Category of the improvement.'),
        impact: improvementSuggestionImpactSchema.describe(
          'Estimated impact if the suggestion is implemented.'
        ),
        confidence: improvementSuggestionConfidenceSchema.describe(
          'Confidence level in this suggestion.'
        ),
        evidenceReferences: z
          .array(
            z.object({
              evaluatorName: z.string().describe('Name of the evaluator.'),
              exampleIndices: z.array(z.number()).describe('Indices of relevant examples.'),
              explanation: z.string().optional().describe('Brief explanation of the evidence.'),
            })
          )
          .describe('References to evaluation evidence supporting this suggestion.'),
        actionItems: z
          .array(z.string())
          .optional()
          .describe('Concrete action items to implement the improvement.'),
        tags: z.array(z.string()).optional().describe('Tags for filtering and categorization.'),
      })
    )
    .describe('List of improvement suggestions generated by the LLM.'),
  overallAssessment: z
    .string()
    .optional()
    .describe('Overall assessment of the evaluation results and key areas for improvement.'),
});

/**
 * Type inference helpers
 */
export type ImprovementSuggestionCategorySchema = z.infer<
  typeof improvementSuggestionCategorySchema
>;
export type ImprovementSuggestionImpactSchema = z.infer<typeof improvementSuggestionImpactSchema>;
export type ImprovementSuggestionConfidenceSchema = z.infer<
  typeof improvementSuggestionConfidenceSchema
>;
export type ImprovementSuggestionEvidenceSchema = z.infer<
  typeof improvementSuggestionEvidenceSchema
>;
export type ImprovementSuggestionSchema = z.infer<typeof improvementSuggestionSchema>;
export type ImprovementSuggestionSummarySchema = z.infer<typeof improvementSuggestionSummarySchema>;
export type ImprovementSuggestionAnalysisResultSchema = z.infer<
  typeof improvementSuggestionAnalysisResultSchema
>;
export type LlmImprovementSuggestionsResponseSchema = z.infer<
  typeof llmImprovementSuggestionsResponseSchema
>;
