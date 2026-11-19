/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationStarter } from '@kbn/agent-builder-common';
import { MAX_CONVERSATION_STARTERS } from '@kbn/agent-builder-common';

const normalizeStarters = (
  starters: readonly ConversationStarter[] | undefined
): ConversationStarter[] => {
  const normalized = (starters ?? []).flatMap(({ label, prompt }): ConversationStarter[] => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      return [];
    }
    const trimmedPrompt = prompt?.trim();
    return [
      trimmedPrompt ? { label: trimmedLabel, prompt: trimmedPrompt } : { label: trimmedLabel },
    ];
  });
  const unique = normalized.filter(
    (starter, index) => normalized.findIndex(({ label }) => label === starter.label) === index
  );
  return unique.slice(0, MAX_CONVERSATION_STARTERS);
};

/**
 * Picks the starters to show. Starters passed in by the consumer replace the agent's defaults;
 * the defaults are only used when the consumer passes none. Labels and prompts are trimmed, starters
 * without a label and repeated labels are dropped, and at most MAX_CONVERSATION_STARTERS are returned.
 */
export const resolveConversationStarters = ({
  consumerStarters,
  agentStarters,
}: {
  consumerStarters?: readonly ConversationStarter[];
  agentStarters?: readonly ConversationStarter[];
}): ConversationStarter[] => {
  const fromConsumer = normalizeStarters(consumerStarters);
  return fromConsumer.length > 0 ? fromConsumer : normalizeStarters(agentStarters);
};
