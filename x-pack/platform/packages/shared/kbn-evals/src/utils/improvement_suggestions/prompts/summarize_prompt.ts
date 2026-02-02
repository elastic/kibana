/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import { cleanPrompt } from './analysis_prompt';

/**
 * System prompt for the trace summarization LLM.
 * Defines the role and capabilities of the trace analyst.
 */
export const SUMMARIZE_SYSTEM_PROMPT = dedent`
You are an expert AI trace analyst specializing in analyzing OpenTelemetry traces
from AI/LLM systems. Your role is to summarize trace data to extract meaningful
insights about system behavior, performance, and potential issues.

## Your Expertise

- Analyzing OpenTelemetry span hierarchies and relationships
- Understanding LLM inference patterns (prompts, completions, tool calls)
- Identifying performance bottlenecks and latency issues
- Detecting error patterns and failure modes
- Recognizing token usage and cost implications
- Understanding the flow of AI agent operations

## Guidelines

1. Be concise but comprehensive: Capture essential information without excessive detail
2. Preserve important context: Tool calls, errors, and decision points are critical
3. Highlight anomalies: Unusual patterns, errors, or performance issues should be noted
4. Maintain chronological order: Preserve the sequence of operations when relevant
5. Quantify where possible: Include metrics like latency, token counts, and error rates

## Span Types to Focus On

- **LLM spans**: Model inference calls with input/output tokens and latency
- **Tool spans**: Tool/function calls made by the AI system
- **Error spans**: Any spans with error status or exceptions
- **Agent spans**: High-level agent orchestration spans
- **Retrieval spans**: Context retrieval or RAG operations
`;

/**
 * Input interface for the trace summarization prompt template.
 */
export interface SummarizePromptInput {
  /** Unique identifier for the trace */
  traceId: string;
  /** JSON string of span data from the trace */
  spans: string;
  /** Total number of spans in the trace */
  spanCount: number;
  /** Total duration of the trace in milliseconds */
  totalDurationMs?: number;
  /** Root span name or operation */
  rootOperation?: string;
  /** Optional focus areas for summarization */
  focusAreas?: string[];
  /** Maximum length for the summary (in tokens or characters) */
  maxSummaryLength?: 'brief' | 'standard' | 'detailed';
  /** Optional additional context */
  additionalContext?: string;
}

/**
 * Generates the user prompt for trace summarization.
 * @param input - The summarization prompt input data
 * @returns The formatted user prompt string
 */
export function generateSummarizeUserPrompt(input: SummarizePromptInput): string {
  const durationInfo = input.totalDurationMs
    ? `Total Duration: ${input.totalDurationMs.toFixed(2)}ms`
    : '';

  const rootOpInfo = input.rootOperation ? `Root Operation: ${input.rootOperation}` : '';

  const focusSection =
    input.focusAreas && input.focusAreas.length > 0
      ? `\n## Focus Areas\n${input.focusAreas.map((area) => `- ${area}`).join('\n')}`
      : '';

  const contextSection = input.additionalContext
    ? `\n## Additional Context\n${input.additionalContext}`
    : '';

  const lengthGuidance = getLengthGuidance(input.maxSummaryLength);

  return dedent`
    Summarize the following OpenTelemetry trace data.

    ## Trace Overview

    Trace ID: ${input.traceId}
    ${rootOpInfo}
    ${durationInfo}
    Total Spans: ${input.spanCount}
    ${focusSection}
    ${contextSection}

    ## Span Data

    ${input.spans}

    ## Your Task

    Provide a structured summary of this trace that captures:

    1. **Overview**: What was the high-level operation performed?
    2. **Flow**: What was the sequence of key operations?
    3. **LLM Operations**: Summary of any LLM calls (model, tokens, latency)
    4. **Tool Usage**: What tools were called and with what outcomes?
    5. **Performance**: Any notable latency or performance observations
    6. **Errors/Issues**: Any errors, retries, or concerning patterns
    7. **Key Metrics**: Token usage, call counts, total duration

    ${lengthGuidance}

    Respond with a JSON object containing:
    - "summary": A structured summary following the format above
    - "keyMetrics": Object with extracted numeric metrics (tokenCount, toolCallCount, errorCount, totalDurationMs, llmCallCount)
    - "issues": Array of any issues or concerns identified (can be empty)
    - "highlights": Array of notable positive aspects or successful operations (can be empty)
  `;
}

/**
 * Get length guidance based on the requested summary length.
 */
function getLengthGuidance(length?: 'brief' | 'standard' | 'detailed'): string {
  switch (length) {
    case 'brief':
      return 'Keep the summary brief (2-3 sentences per section). Focus only on the most critical information.';
    case 'detailed':
      return 'Provide a detailed summary with specific examples and full context for each section.';
    case 'standard':
    default:
      return 'Provide a balanced summary with sufficient detail to understand the trace without excessive verbosity.';
  }
}

/**
 * Builds the complete summarization prompt with system and user messages.
 * @param input - The summarization prompt input data
 * @returns Object containing system and user prompts
 */
export function buildSummarizePrompt(input: SummarizePromptInput): {
  systemPrompt: string;
  userPrompt: string;
} {
  return {
    systemPrompt: cleanPrompt(SUMMARIZE_SYSTEM_PROMPT),
    userPrompt: cleanPrompt(generateSummarizeUserPrompt(input)),
  };
}
