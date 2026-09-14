/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';

interface UseAiIndexOverviewSectionsParams {
  aiIndex: GetAiIndexResponse | undefined;
  isLoading: boolean;
}

export interface AiIndexOverviewSections {
  hideEditControls: boolean;
  showAutomationsPanel: boolean;
}

/** Progressive disclosure for Overview tab sections on the AI index detail page. */
export const useAiIndexOverviewSections = ({
  aiIndex,
  isLoading,
}: UseAiIndexOverviewSectionsParams): AiIndexOverviewSections => {
  const isManaged = aiIndex?.managed === true;
  const hasSources = (aiIndex?.sources.length ?? 0) > 0;
  const hasAutomations = (aiIndex?.automations.length ?? 0) > 0;

  return {
    hideEditControls: isLoading || isManaged,
    showAutomationsPanel: isManaged || isLoading || hasSources || hasAutomations,
  };
};
