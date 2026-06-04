/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage } from '@langchain/core/messages';
import { isAIMessage } from '@langchain/core/messages';
import { estimateTokens } from '@kbn/agent-builder-genai-utils/tools/utils/token_count';

/**
 * Estimates the token count of a list of langchain messages — the unit actually
 * sent to the model. This is the single primitive behind every context-size
 * decision (conversation compaction trigger, filestore-substitution gate, and
 * intra-round compaction), so those decisions can't drift from each other or
 * from the real prompt.
 *
 * Kept in its own leaf module (no conversation/round imports) so the prompt layer
 * can size in-flight messages without pulling in the round-conversion graph.
 */
export const estimateMessagesTokens = (messages: BaseMessage[]): number => {
  let total = 0;
  for (const message of messages) {
    // estimateTokens stringifies non-string content (e.g. structured message parts).
    total += estimateTokens(message.content);
    // Tool-call params/reasoning live on tool_calls, not in content, but are sent too.
    if (isAIMessage(message) && message.tool_calls?.length) {
      total += estimateTokens(JSON.stringify(message.tool_calls));
    }
  }
  return total;
};
