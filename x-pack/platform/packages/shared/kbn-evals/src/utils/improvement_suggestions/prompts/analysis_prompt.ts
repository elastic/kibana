/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';

/**
 * System prompt for the evaluation analysis LLM.
 * Defines the role and capabilities of the analyst.
 */
export const ANALYSIS_SYSTEM_PROMPT = dedent`
You are an expert AI evaluation analyst specializing in analyzing evaluation results
from AI/LLM systems. Your role is to identify patterns, issues, and opportunities
for improvement based on evaluation data.

## Your Expertise

- Analyzing evaluation metrics and scores across different evaluators
- Identifying systematic patterns in failures or low-performing examples
- Understanding the relationship between different evaluation dimensions (accuracy, reasoning, tool selection, etc.)
- Providing actionable recommendations for improving AI system performance
- Prioritizing improvements based on impact and confidence

## Guidelines

1. Be specific and evidence-based: Always reference specific evaluators, examples, and scores
2. Focus on actionable insights: Recommendations should be concrete and implementable
3. Consider the full picture: Look at patterns across multiple evaluators and examples
4. Prioritize effectively: High-impact, high-confidence suggestions should be emphasized
5. Be thorough but concise: Cover all important issues without unnecessary verbosity

## Categories for Suggestions

- **prompt**: Issues related to system prompts, instructions, or context provided to the AI
- **tool_selection**: Problems with choosing or using the right tools/functions
- **response_quality**: Issues with the quality, clarity, or format of responses
- **context_retrieval**: Problems with retrieving or using relevant context
- **reasoning**: Issues with logical reasoning, analysis, or problem-solving
- **accuracy**: Factual errors or incorrect information
- **efficiency**: Performance, speed, or resource usage concerns
- **other**: Issues that don't fit other categories
`;

/**
 * Input interface for the analysis prompt template.
 */
export interface AnalysisPromptInput {
  /** Name of the dataset being analyzed */
  datasetName: string;
  /** ID of the evaluation run */
  runId: string;
  /** Optional model identifier used in the evaluation */
  model?: string;
  /** Total number of examples in the evaluation */
  totalExamples: number;
  /** JSON string of evaluation results per evaluator */
  evaluatorResults: string;
  /** JSON string of per-example scores and details */
  exampleDetails: string;
  /** Optional additional context or focus areas */
  additionalContext?: string;
}

/**
 * Generates the user prompt for evaluation analysis.
 * @param input - The analysis prompt input data
 * @returns The formatted user prompt string
 */
export function generateAnalysisUserPrompt(input: AnalysisPromptInput): string {
  const modelInfo = input.model ? `Model: ${input.model}` : '';
  const contextSection = input.additionalContext
    ? `\n## Additional Context\n${input.additionalContext}`
    : '';

  return dedent`
    Analyze the following evaluation results and provide improvement suggestions.

    ## Evaluation Overview

    Dataset: ${input.datasetName}
    Run ID: ${input.runId}
    ${modelInfo}
    Total Examples: ${input.totalExamples}

    ## Evaluator Results (Aggregated)

    ${input.evaluatorResults}

    ## Per-Example Details

    ${input.exampleDetails}
    ${contextSection}

    ## Your Task

    Based on these evaluation results, identify improvement opportunities and provide
    actionable suggestions. For each suggestion:

    1. Provide a clear, descriptive title
    2. Explain the issue and proposed improvement in detail
    3. Categorize the suggestion appropriately
    4. Assess the potential impact (high/medium/low)
    5. Rate your confidence in this suggestion (high/medium/low)
    6. Reference specific evaluators and example indices as evidence
    7. List concrete action items when possible

    Focus on the most impactful improvements first. Look for patterns across
    multiple examples and evaluators. Be specific about which examples exhibited
    the issues you identify.

    Respond with a JSON object containing:
    - "suggestions": Array of improvement suggestions
    - "overallAssessment": A brief overall assessment of the evaluation results
  `;
}

/**
 * Clean up a template string prompt by removing extra newlines and whitespace.
 */
export const cleanPrompt = (prompt: string): string => {
  return dedent(prompt).replace(/(\r?\n\s*){2,}/g, '\n\n');
};

/**
 * Builds the complete analysis prompt with system and user messages.
 * @param input - The analysis prompt input data
 * @returns Object containing system and user prompts
 */
export function buildAnalysisPrompt(input: AnalysisPromptInput): {
  systemPrompt: string;
  userPrompt: string;
} {
  return {
    systemPrompt: cleanPrompt(ANALYSIS_SYSTEM_PROMPT),
    userPrompt: cleanPrompt(generateAnalysisUserPrompt(input)),
  };
}
