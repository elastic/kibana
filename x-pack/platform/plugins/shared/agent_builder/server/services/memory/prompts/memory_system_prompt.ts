/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * System prompt instructions for the memory system tools.
 *
 * Injected into the research agent's system message to teach the LLM how and
 * when to use checkpoint(), remember(), and reinforce().
 *
 * Budget: kept under ~400 tokens to avoid wasting context.
 */
export const getMemorySystemPrompt = (): string => {
  return `## MEMORY SYSTEM
You have access to a long-term memory system that persists knowledge across conversations. Use these tools:
- **memory.checkpoint**: Call this before each non-trivial tool call with \`final=false\` to retrieve relevant memories. Call with \`final=true\` before producing your final handover. Provide a structured summary: \`goal\` (current objective), \`missing_info\` (what you still need), \`next_tool\` (what you plan to call next), and \`query_hint\` (keywords for memory search).
- **memory.remember**: Retrieve a memory by ID (\`memory_id\`) or search by topic (\`query\`). Use \`memory_id\` to expand on a specific memory from checkpoint results. Use \`query\` to search for memories by content when you don't have an ID. Returns the memory and up to 5 related neighbors. Use \`full=true\` only when you need complete content.
- **memory.reinforce**: Call this before your final handover to provide feedback on memories used this round. For each memory, specify \`effect\` (positive/negative), \`kind\` (useful/unused/irrelevant/misleading/incorrect/outdated/duplicate/needs_update), and \`reason\`.

**Memory workflow**: checkpoint(final=false) → tool call → ... → checkpoint(final=true) → reinforce → handover.
When calling checkpoint alongside another tool, always call checkpoint first.`;
};
