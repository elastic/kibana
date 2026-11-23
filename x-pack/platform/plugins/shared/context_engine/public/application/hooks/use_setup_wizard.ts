/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import type {
  SetupWizardDoneSteps,
  SetupWizardStepId,
  SetupWizardView,
} from '../utils/setup_wizard';
import {
  getSetupWizardDoneSteps,
  getSetupWizardView,
  readSetupWizardStoredValue,
  writeSetupWizardStoredValue,
} from '../utils/setup_wizard';
import { useKibana } from './use_kibana';

interface UseSetupWizardParams {
  aiIndex: GetAiIndexResponse | undefined;
  /** How many memories the AI index has. */
  memoryCount: number;
  isMemoryEnabled: boolean;
  /** False while the memory count is still loading. */
  isMemoryCountReady: boolean;
  /** Whether the Overview tab is open. Each visit to it makes a fresh decision. */
  isActive: boolean;
}

interface UseSetupWizardResult {
  /** `undefined` until the decision is made. */
  view: SetupWizardView | undefined;
  done: SetupWizardDoneSteps | undefined;
  /** Remembers the step the user is on, so a refresh opens it again. */
  saveStep: (stepId: SetupWizardStepId) => void;
  /** Hides the wizard for this AI index for good. */
  close: () => void;
}

/**
 * Whether the Overview shows the setup wizard. The decision is made once per visit to the Overview,
 * so finishing a step mid-flow doesn't make the wizard disappear under the user. Leaving the tab
 * drops it, so coming back reads the saved step and the latest data again.
 */
export const useSetupWizard = ({
  aiIndex,
  memoryCount,
  isMemoryEnabled,
  isMemoryCountReady,
  isActive,
}: UseSetupWizardParams): UseSetupWizardResult => {
  const {
    services: { http },
  } = useKibana();
  const basePath = http.basePath.get();
  const [decision, setDecision] = useState<{ aiIndexId: string; view: SetupWizardView }>();
  const aiIndexId = aiIndex?.id;

  const done = useMemo(
    () => (aiIndex ? getSetupWizardDoneSteps({ aiIndex, memoryCount }) : undefined),
    [aiIndex, memoryCount]
  );

  // Decide (or forget) while rendering, so the page never flashes the normal Overview first.
  if (!isActive && decision !== undefined) {
    setDecision(undefined);
  } else if (isActive && aiIndex && done && decision?.aiIndexId !== aiIndex.id) {
    const stored = readSetupWizardStoredValue({ basePath, aiIndexId: aiIndex.id });
    // A managed or closed AI index never shows the wizard, so it needn't wait for the memory count.
    const isNeverShown = aiIndex.managed || stored === 'closed';
    if (isNeverShown || isMemoryCountReady) {
      setDecision({
        aiIndexId: aiIndex.id,
        view: getSetupWizardView({
          isManaged: aiIndex.managed,
          isMemoryEnabled,
          done,
          stored,
        }),
      });
    }
  }

  const saveStep = useCallback(
    (stepId: SetupWizardStepId) => {
      if (aiIndexId) {
        writeSetupWizardStoredValue({ basePath, aiIndexId }, stepId);
      }
    },
    [aiIndexId, basePath]
  );

  const close = useCallback(() => {
    if (aiIndexId) {
      writeSetupWizardStoredValue({ basePath, aiIndexId }, 'closed');
    }
    setDecision((current) => current && { ...current, view: { show: false } });
  }, [aiIndexId, basePath]);

  const view = decision?.aiIndexId === aiIndexId ? decision?.view : undefined;

  return { view, done, saveStep, close };
};
