/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_CONVERSATION_STARTERS } from '@kbn/agent-builder-common';

const normalizeStarters = (starters: readonly string[] | undefined): string[] => {
  const normalized = (starters ?? []).map((starter) => starter.trim()).filter(Boolean);
  return [...new Set(normalized)].slice(0, MAX_CONVERSATION_STARTERS);
};

/**
 * Picks the starters to show. Starters passed in by the consumer replace the agent's defaults;
 * the defaults are only used when the consumer passes none. Values are trimmed, empty and
 * duplicate values are dropped, and at most MAX_CONVERSATION_STARTERS are returned.
 */
export const resolveConversationStarters = ({
  consumerStarters,
  agentStarters,
}: {
  consumerStarters?: readonly string[];
  agentStarters?: readonly string[];
}): string[] => {
  const fromConsumer = normalizeStarters(consumerStarters);
  return fromConsumer.length > 0 ? fromConsumer : normalizeStarters(agentStarters);
};
