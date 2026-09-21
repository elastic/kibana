/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import { useFeedbackLoopEnabled } from './use_feedback_loop_enabled';
import { useSignalGroups } from './use_signal_groups';

interface UseAiIndexOverviewSectionsParams {
  aiIndex: GetAiIndexResponse | undefined;
  isLoading: boolean;
}

export interface AiIndexOverviewSections {
  hideEditControls: boolean;
  showAutomationsPanel: boolean;
  showSignalsSection: boolean;
  showSignalsPanel: boolean;
}

/** Progressive disclosure for Overview tab sections on the AI index detail page. */
export const useAiIndexOverviewSections = ({
  aiIndex,
  isLoading,
}: UseAiIndexOverviewSectionsParams): AiIndexOverviewSections => {
  const isManaged = aiIndex?.managed === true;
  const hasSources = (aiIndex?.sources.length ?? 0) > 0;
  const hasAutomations = (aiIndex?.automations.length ?? 0) > 0;
  const feedbackLoopEnabled = useFeedbackLoopEnabled();
  const { groups: signalGroups } = useSignalGroups({ enabled: feedbackLoopEnabled });
  // Signal groups are space-global (`GET /signals/groups` has no ai_index filter). Until the API
  // supports per-index aggregation, unlocking Signals from groups applies across all AI indexes.
  const hasSignals = signalGroups.length > 0;

  return {
    hideEditControls: isLoading || isManaged,
    showAutomationsPanel: isManaged || isLoading || hasSources || hasAutomations,
    showSignalsSection: feedbackLoopEnabled,
    showSignalsPanel: isManaged || isLoading || hasAutomations || hasSignals,
  };
};
