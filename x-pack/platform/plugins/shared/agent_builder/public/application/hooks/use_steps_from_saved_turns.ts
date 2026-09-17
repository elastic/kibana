/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import { buildSavedItems } from '../components/conversations/timeline/to_timeline_items';
import { useConversation } from './use_conversation';

/**
 * The steps of every saved agent turn, in timeline order. Lets a response resolve a tool result
 * produced by an earlier turn, for example a visualization built from an earlier query.
 */
export const useStepsFromSavedTurns = (): ConversationRoundStep[] => {
  const { conversation } = useConversation();
  const events = conversation?.events;

  return useMemo(
    () =>
      buildSavedItems(events ?? []).flatMap((item) =>
        item.kind === 'agentTurn' ? item.steps : []
      ),
    [events]
  );
};
