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

export interface ResolvedConversationStarters {
  starters: ConversationStarter[];
  source: ConversationStartersSource;
}

/** Trims the labels and drops starters without a label and repeated labels, keeping the first. */
const normalizeStarters = (
  starters: readonly ConversationStarter[] | undefined
): ConversationStarter[] => {
  const normalized = (starters ?? []).flatMap(({ label }): ConversationStarter[] => {
    const trimmedLabel = label.trim();
    return trimmedLabel ? [{ label: trimmedLabel }] : [];
  });
  return normalized.filter(
    (starter, index) => normalized.findIndex(({ label }) => label === starter.label) === index
  );
};

/**
 * Picks the starters to show, and says where they came from: the first of the starters of the app,
 * those of the solution and the default ones that is left with a starter after cleaning it. It
 * replaces the others, with no backfill. Labels are trimmed, starters without a label and repeated
 * labels are dropped, and at most MAX_CONVERSATION_STARTERS are returned.
 */
export const resolveConversationStarters = ({
  appStarters,
  solutionStarters,
  defaultStarters,
}: {
  appStarters?: readonly ConversationStarter[];
  solutionStarters?: readonly ConversationStarter[];
  defaultStarters?: readonly ConversationStarter[];
}): ResolvedConversationStarters => {
  const candidates: ReadonlyArray<{
    source: ConversationStartersSource;
    starters: readonly ConversationStarter[] | undefined;
  }> = [
    { source: 'application', starters: appStarters },
    { source: 'solution', starters: solutionStarters },
    { source: 'default', starters: defaultStarters },
  ];

  for (const { source, starters } of candidates) {
    const normalized = normalizeStarters(starters);
    if (normalized.length > 0) {
      return { starters: normalized.slice(0, MAX_CONVERSATION_STARTERS), source };
    }
  }
  return { starters: [], source: 'default' };
};
