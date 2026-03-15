/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

/**
 * Zod schema for the LLM-generated portion of the compaction summary.
 * Only includes semantic fields that require natural language understanding.
 * Deterministic fields (tool_calls_summary, entities, agent_actions) are
 * extracted programmatically and merged afterward.
 */
export const llmCompactionSchema = z.object({
  discussion_summary: z
    .string()
    .describe(
      'A 2-6 sentence narrative summary of the conversation so far. Capture the main goal, progress made, and current state.'
    ),
  user_intent: z
    .string()
    .describe(
      "A clear statement of what the user is trying to achieve. Start with a verb, e.g., 'Investigate slow query performance on the orders index'."
    ),
  key_topics: z
    .array(z.string())
    .describe(
      "Primary subjects discussed, e.g., 'Elasticsearch indexing', 'API authentication', 'dashboard configuration'."
    ),
  outcomes_and_decisions: z
    .array(z.string())
    .describe(
      "Key conclusions, resolutions, or decisions made. Be specific and factual, e.g., 'The slow queries were caused by missing keyword mappings on the status field'."
    ),
  unanswered_questions: z
    .array(z.string())
    .describe(
      'Important questions the user asked that were not fully resolved. May be empty if everything was addressed.'
    ),
});

export type LlmCompactionOutput = z.infer<typeof llmCompactionSchema>;

/**
 * System prompt for the compaction summarization LLM call.
 * The LLM focuses on semantic understanding; tool call history and
 * entities are provided as reference context but should not be reproduced.
 */
export const COMPACTION_SYSTEM_PROMPT = `You are an expert AI assistant summarizing an ongoing conversation to enable seamless continuation.

Your summary will REPLACE the detailed conversation history -- the agent will ONLY see your summary plus the most recent conversation rounds. It is critical that you preserve everything needed to continue working effectively.

NOTE: Tool call history and entity details have already been extracted and will be provided separately. You do NOT need to reproduce them. Focus on the semantic understanding that cannot be extracted programmatically.

## What to preserve
- **User intent**: What the user is trying to achieve
- **Decisions and findings**: Key conclusions, resolved issues, data discovered
- **User constraints and preferences**: Any stated requirements or preferences
- **Current task state**: Where things stand, what has been done, what remains

## What to omit
- Tool call details (already captured separately)
- Verbose tool output data
- Conversational pleasantries and acknowledgments
- Redundant information that appears in multiple rounds
- Step-by-step reasoning that led to already-captured conclusions

## Output format
Produce a structured JSON object following the provided schema. Be concise but complete.`;
