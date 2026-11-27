/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationStarter } from '@kbn/agent-builder-common';
import { MAX_CONVERSATION_STARTERS } from '@kbn/agent-builder-common';

/** Where the starters being shown came from, reported with the clicks. */
export type ConversationStartersSource = 'application' | 'solution' | 'default';

/**
 * Picks the starters to show. Labels are trimmed, starters without a label and repeated labels are
 * dropped, and at most MAX_CONVERSATION_STARTERS are returned.
 */
export const resolveConversationStarters = ({
  defaultStarters,
}: {
  defaultStarters?: readonly ConversationStarter[];
}): ConversationStarter[] => {
  const normalized = (defaultStarters ?? []).flatMap(({ label }): ConversationStarter[] => {
    const trimmedLabel = label.trim();
    return trimmedLabel ? [{ label: trimmedLabel }] : [];
  });
  const unique = normalized.filter(
    (starter, index) => normalized.findIndex(({ label }) => label === starter.label) === index
  );
  return unique.slice(0, MAX_CONVERSATION_STARTERS);
};
