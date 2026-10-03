/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';

/** Name shared by the research-phase terminal tool and the answer phase's forced tool. */
export const FINAL_ANSWER_TOOL_NAME = 'structured_answer';

export interface RawPromptOverride {
  /** Replaces every built-in system prompt (research and answer phases). */
  systemPrompt: string;
  /** Only tools whose name starts with this prefix are exposed, plus the final answer tool. */
  toolPrefix: string;
}

/**
 * Local eval experiment: replaces the built-in system prompts and tool list for one agent, when
 * `AGENT_BUILDER_RAW_PROMPT_FILE` and `AGENT_BUILDER_RAW_PROMPT_AGENT_ID` are both set.
 */
export const getRawPromptOverride = (
  agentId: string | undefined
): RawPromptOverride | undefined => {
  const {
    AGENT_BUILDER_RAW_PROMPT_FILE: promptFile,
    AGENT_BUILDER_RAW_PROMPT_AGENT_ID: targetAgentId,
    AGENT_BUILDER_RAW_PROMPT_TOOL_PREFIX: toolPrefix = 'nightshift_',
  } = process.env;
  if (!promptFile || !targetAgentId || agentId !== targetAgentId) {
    return undefined;
  }
  return { systemPrompt: readFileSync(promptFile, 'utf8'), toolPrefix };
};
