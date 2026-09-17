/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { ImprovementAction } from '../../../common/http_api/improvement_actions';
import type { Improvement } from '../../../common/http_api/improvements';
import { useFeedbackLoopEnabled } from './use_feedback_loop_enabled';
import { useImprovements } from './use_improvements';

/**
 * The open improvements that would change one part of an AI index.
 *
 * Filtering in the client rather than asking the server for a slice: every panel asks for the same
 * unfiltered list, and react-query hands back one cached response for identical arguments, so the
 * panels between them cost a single request no matter how many of them show suggestions.
 */
export const useScopedImprovements = ({
  aiIndexId,
  actions,
}: {
  aiIndexId: string | undefined;
  actions: readonly ImprovementAction[];
}): Improvement[] => {
  const feedbackLoopEnabled = useFeedbackLoopEnabled();
  const { improvements } = useImprovements({ aiIndexId, enabled: feedbackLoopEnabled });

  return useMemo(
    () => improvements.filter(({ action }) => (actions as readonly string[]).includes(action)),
    [improvements, actions]
  );
};

/**
 * Past decisions (applied and rejected) for one panel's actions.
 *
 * Fetched eagerly when `enabled` is true (tied to the feedback loop feature flag, not to the
 * accordion being opened). The result is cached by react-query so reopening the accordion does
 * not re-fetch.
 */
export const useScopedImprovementsHistory = ({
  aiIndexId,
  actions,
  enabled,
}: {
  aiIndexId: string | undefined;
  actions: readonly ImprovementAction[];
  enabled: boolean;
}): { history: Improvement[]; isLoading: boolean } => {
  const feedbackLoopEnabled = useFeedbackLoopEnabled();
  const { improvements, isLoading } = useImprovements({
    aiIndexId,
    status: ['applied', 'rejected'],
    size: 25,
    enabled: feedbackLoopEnabled && enabled,
  });

  const history = useMemo(
    () => improvements.filter(({ action }) => (actions as readonly string[]).includes(action)),
    [improvements, actions]
  );

  return { history, isLoading };
};
