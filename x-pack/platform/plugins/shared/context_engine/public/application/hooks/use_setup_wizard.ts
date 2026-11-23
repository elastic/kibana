/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import type {
  SetupWizardDoneSteps,
  SetupWizardStepId,
  SetupWizardStoredValue,
} from '../utils/setup_wizard';
import {
  getSetupWizardDoneSteps,
  getSetupWizardView,
  readSetupWizardStoredValue,
  subscribeSetupWizardStorage,
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

export type UseSetupWizardResult =
  /** Still deciding: data is loading. */
  | { status: 'loading' }
  | { status: 'hidden' }
  | {
      status: 'shown';
      steps: readonly SetupWizardStepId[];
      currentStep: SetupWizardStepId;
      done: SetupWizardDoneSteps;
      /** Moves to a step. Local storage is the only place the step lives. */
      goToStep: (stepId: SetupWizardStepId) => void;
      /** Hides the wizard for this AI index for good. */
      close: () => void;
    };

const noop = () => () => {};

/**
 * Whether the Overview shows the setup wizard, and on which step. The step and "closed" live only in
 * local storage, read live. Whether setup still needs the wizard is decided once per visit to the
 * Overview, so finishing a step mid-flow doesn't make the wizard disappear under the user.
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
  const aiIndexId = aiIndex?.id;

  const stored = useSyncExternalStore<SetupWizardStoredValue | undefined>(
    aiIndexId ? subscribeSetupWizardStorage : noop,
    () => (aiIndexId ? readSetupWizardStoredValue({ basePath, aiIndexId }) : undefined)
  );

  const done = useMemo(
    () => (aiIndex ? getSetupWizardDoneSteps({ aiIndex, memoryCount }) : undefined),
    [aiIndex, memoryCount]
  );

  // Per visit: does setup still need the wizard? Data only; the step itself is read from storage.
  const [visit, setVisit] = useState<{
    aiIndexId: string;
    view: ReturnType<typeof getSetupWizardView>;
  }>();
  if (!isActive && visit !== undefined) {
    setVisit(undefined);
  } else if (isActive && aiIndex && done && visit?.aiIndexId !== aiIndex.id) {
    // A managed or closed AI index never shows the wizard, so it needn't wait for the memory count.
    if (aiIndex.managed || stored === 'closed' || isMemoryCountReady) {
      setVisit({
        aiIndexId: aiIndex.id,
        view: getSetupWizardView({ isManaged: aiIndex.managed, isMemoryEnabled, done, stored }),
      });
    }
  }

  const goToStep = useCallback(
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
  }, [aiIndexId, basePath]);

  const view = visit?.aiIndexId === aiIndexId ? visit?.view : undefined;
  if (view === undefined || !done) {
    return { status: 'loading' };
  }
  if (!view.show || stored === 'closed') {
    return { status: 'hidden' };
  }

  const currentStep =
    stored !== undefined && stored !== 'closed' && view.steps.includes(stored)
      ? stored
      : view.initialStep;

  return { status: 'shown', steps: view.steps, currentStep, done, goToStep, close };
};
