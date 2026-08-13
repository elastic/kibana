/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage, MessageContentComplex } from '@langchain/core/messages';
import { isAIMessage } from '@langchain/core/messages';
import { estimateTokens } from '@kbn/agent-builder-genai-utils/tools/utils/token_count';
import type { ProcessedConversationRound } from './prepare_conversation';
import type { ToolSummarizationDeps } from './tool_summarization';
import { createSummarizationTransformer } from './tool_summarization';
import { roundToLangchain } from './to_langchain_messages';

// Flat per-image cost. Vision models tile images and charge roughly one token
// per tile; a ~500×500 image is ~75 tokens across the providers we ship. Real
// cost is provider- and resolution-dependent, but running char-based estimation
// on a base64 payload would score a 1 MB PNG at ~350k tokens and unconditionally
// trigger intra-round compaction.
const IMAGE_TOKEN_ESTIMATE = 75;

const estimateMessageContentTokens = (content: BaseMessage['content']): number => {
  if (typeof content === 'string') {
    return estimateTokens(content);
  }
  let total = 0;
  for (const part of content as MessageContentComplex[]) {
    if (part.type === 'image_url') {
      total += IMAGE_TOKEN_ESTIMATE;
    } else {
      total += estimateTokens(part);
    }
  }
  return total;
};

export const estimateMessagesTokens = (messages: BaseMessage[]): number => {
  let total = 0;
  for (const message of messages) {
    total += estimateMessageContentTokens(message.content);
    // Tool-call params/reasoning live on tool_calls, not in content, but are sent too.
    if (isAIMessage(message) && message.tool_calls?.length) {
      total += estimateTokens(JSON.stringify(message.tool_calls));
    }
  }
  return total;
};

export const estimatePerRoundTokens = async (
  rounds: ProcessedConversationRound[],
  deps: ToolSummarizationDeps
): Promise<number[]> => {
  const resultTransformer = createSummarizationTransformer(deps);
  return Promise.all(
    rounds.map(async (round) =>
      estimateMessagesTokens(await roundToLangchain(round, { resultTransformer }))
    )
  );
};
