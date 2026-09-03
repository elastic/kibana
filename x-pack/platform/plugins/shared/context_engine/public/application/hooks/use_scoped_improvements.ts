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
 * Filtering in the client rather than asking the server for a slice: the Improvements panel has
 * already fetched the same list, and react-query hands back its cached response for identical
 * arguments, so a panel showing its own suggestions costs no extra request.
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
