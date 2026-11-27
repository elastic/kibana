/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import type { SetupWizardProgress } from '../utils/setup_wizard_view';
import { useAiIndexDreaming } from './use_ai_index_dreaming';
import { useMemoryCount } from './use_memory_count';

// The wizard waits for this data before it shows, so a failed request shouldn't retry for long.
const PROGRESS_RETRY = 1;

export interface UseSetupWizardProgressResult {
  /** Missing until the AI index loads. */
  progress: SetupWizardProgress | undefined;
  isLoading: boolean;
  /** True when a request failed, so the progress is unknown. */
  isError: boolean;
}

/** Loads all data the setup wizard steps read to decide whether they are shown and done. */
export const useSetupWizardProgress = ({
  aiIndex,
  isMemoryEnabled,
  isSetupWizardEnabled,
}: {
  aiIndex: GetAiIndexResponse | undefined;
  isMemoryEnabled: boolean;
  isSetupWizardEnabled: boolean;
}): UseSetupWizardProgressResult => {
  // A managed AI index never shows the wizard, and without memory no step reads this data.
  const enabled =
    isSetupWizardEnabled && aiIndex !== undefined && !aiIndex.managed && isMemoryEnabled;
  const memory = useMemoryCount(aiIndex?.id, { enabled, retry: PROGRESS_RETRY });
  const dreaming = useAiIndexDreaming(aiIndex?.id ?? '', { enabled, retry: PROGRESS_RETRY });

  const progress = useMemo(
    () =>
      aiIndex
        ? {
            aiIndex,
            dreaming: dreaming.dreaming,
            memoryCount: memory.memoryCount,
            isMemoryEnabled,
          }
        : undefined,
    [aiIndex, dreaming.dreaming, memory.memoryCount, isMemoryEnabled]
  );

  return {
    progress,
    isLoading: memory.isLoading || dreaming.isLoading,
    isError: memory.isError || dreaming.isError,
  };
};
