/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import type { SetupWizardStep } from '../components/ai_index_detail/setup_wizard';
import {
  SETUP_WIZARD_CLOSED,
  readSetupWizardStoredValue,
  subscribeSetupWizardStorage,
  writeSetupWizardStoredValue,
} from '../utils/setup_wizard_storage';
import type { SetupWizardProgress, SetupWizardView } from '../utils/setup_wizard_view';
import { getDoneStepIds, getSetupWizardView } from '../utils/setup_wizard_view';
import { useCanWriteContextEngine } from './use_can_write_context_engine';
import { useKibana } from './use_kibana';

interface UseSetupWizardParams {
  /**
   * The AI index id from the URL. It is known before the AI index loads, so a closed wizard is
   * recognized right away.
   */
  aiIndexId: string;
  steps: readonly SetupWizardStep[];
  /** Missing until the AI index loads. */
  progress: SetupWizardProgress | undefined;
  isProgressLoading: boolean;
  /** True when a progress request failed, so the progress is unknown. */
  isProgressError: boolean;
  /** Whether the Overview tab is open. Each visit to it makes a fresh decision. */
  isActive: boolean;
}

export type UseSetupWizardResult =
  /** Still deciding: data is loading. */
  | { status: 'loading' }
  | { status: 'hidden' }
  | {
      status: 'shown';
      steps: readonly SetupWizardStep[];
      currentStepId: string;
      doneStepIds: ReadonlySet<string>;
      /** Moves to a step. Local storage is the only place the step lives. */
      goToStep: (stepId: string) => void;
      /** Hides the wizard for this AI index for good. */
      close: () => void;
    };

/**
 * Whether the Overview shows the setup wizard, and on which step. The step and "closed" live only in
 * local storage, read live. Whether setup still needs the wizard is decided once per visit to the
 * Overview, so finishing a step mid-flow doesn't make the wizard disappear under the user.
 */
export const useSetupWizard = ({
  aiIndexId: urlAiIndexId,
  steps,
  progress,
  isProgressLoading,
  isProgressError,
  isActive,
}: UseSetupWizardParams): UseSetupWizardResult => {
  const {
    services: { http },
  } = useKibana();
  const canWrite = useCanWriteContextEngine();
  const basePath = http.basePath.get();
  const aiIndexId = progress?.aiIndex.id ?? urlAiIndexId;

  const stored = useSyncExternalStore(subscribeSetupWizardStorage, () =>
    readSetupWizardStoredValue({ basePath, aiIndexId })
  );

  const doneStepIds = useMemo(
    () => (progress ? getDoneStepIds(steps, progress) : undefined),
    [steps, progress]
  );

  // Per visit: does setup still need the wizard? Data only; the step itself is read from storage.
  const [visit, setVisit] = useState<{
    aiIndexId: string;
    view: SetupWizardView<SetupWizardStep>;
  }>();
  if (!isActive && visit !== undefined) {
    setVisit(undefined);
  } else if (isActive && progress && visit?.aiIndexId !== progress.aiIndex.id) {
    if (isProgressError) {
      // Unknown progress is not "not done": show the normal Overview instead of guessing.
      setVisit({ aiIndexId: progress.aiIndex.id, view: { show: false } });
    } else if (progress.aiIndex.managed || stored === SETUP_WIZARD_CLOSED || !isProgressLoading) {
      // A managed or closed AI index never shows the wizard, so it needn't wait for its progress data.
      setVisit({
        aiIndexId: progress.aiIndex.id,
        view: getSetupWizardView({ steps, progress, stored }),
      });
    }
  }

  const goToStep = useCallback(
    (stepId: string) => {
      writeSetupWizardStoredValue({ basePath, aiIndexId }, stepId);
    },
    [aiIndexId, basePath]
  );

  const close = useCallback(() => {
    writeSetupWizardStoredValue({ basePath, aiIndexId }, SETUP_WIZARD_CLOSED);
  }, [aiIndexId, basePath]);

  if (!canWrite) {
    // Every step saves something, so a read-only user would only hit errors.
    return { status: 'hidden' };
  }

  if (!progress || !doneStepIds) {
    // A closed wizard never shows, so the page needn't wait for the AI index to know that.
    return stored === SETUP_WIZARD_CLOSED ? { status: 'hidden' } : { status: 'loading' };
  }

  const view = visit?.aiIndexId === aiIndexId ? visit.view : undefined;
  if (view === undefined) {
    return { status: 'loading' };
  }
  if (!view.show || stored === SETUP_WIZARD_CLOSED) {
    return { status: 'hidden' };
  }

  const isStoredStepShown = view.steps.some(({ id }) => id === stored);
  const currentStepId = stored !== undefined && isStoredStepShown ? stored : view.initialStepId;

  return { status: 'shown', steps: view.steps, currentStepId, doneStepIds, goToStep, close };
};
