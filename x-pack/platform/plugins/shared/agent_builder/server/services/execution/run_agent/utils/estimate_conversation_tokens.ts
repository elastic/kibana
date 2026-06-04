/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProcessedConversationRound } from './prepare_conversation';
import type { ToolSummarizationDeps } from './tool_summarization';
import { createSummarizationTransformer } from './tool_summarization';
import { roundToLangchain } from './to_langchain_messages';
import { estimateMessagesTokens } from './estimate_messages_tokens';

export { estimateMessagesTokens };

/**
 * Estimates per-round token counts as each round will actually be sent: built via
 * the same `roundToLangchain` conversion with tool-result summarization (Part 1)
 * applied. Filestore substitution (Part 2) is intentionally excluded because it is
 * gated on the very estimate being computed here.
 */
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
