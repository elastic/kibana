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
You have access to a long-term memory system that persists knowledge across conversations.

**Automatic retrieval**: When you call any tool, the system automatically searches memory using your \`_reasoning\` parameter. Relevant memories will appear as \`[Retrieved Memories]\` in the tool result. Always provide a detailed \`_reasoning\` to get the best memory matches.

**Available memory tools** (use only when needed):
- **memory.remember**: Retrieve a specific memory by ID (\`memory_id\`) or search by topic (\`query\`). Returns the memory and up to 5 related neighbors. Use \`full=true\` for complete content.
- **memory.reinforce**: Provide feedback on memories before your final handover. For each memory, specify \`effect\` (positive/negative), \`kind\` (useful/unused/irrelevant/misleading/incorrect/outdated/duplicate/needs_update), and \`reason\`.

Call **memory.reinforce** before your final handover to improve future memory quality.`;
};
