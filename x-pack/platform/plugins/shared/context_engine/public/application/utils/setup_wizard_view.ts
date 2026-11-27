/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexDreamingConfig } from '../../../common/dreaming';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import { SETUP_WIZARD_CLOSED } from './setup_wizard_storage';

/** All data the steps read to decide whether they are shown and done. */
export interface SetupWizardProgress {
  readonly aiIndex: GetAiIndexResponse;
  /** The AI index response leaves the dreaming config out, so it comes from its own route. */
  readonly dreaming: AiIndexDreamingConfig | undefined;
  readonly memoryCount: number;
  readonly isMemoryEnabled: boolean;
}

/** The part of a step that decides whether the wizard shows and where it opens. */
export interface SetupWizardStepRules {
  /** Also the stored step, the EBT detail and the test subject suffix, so it must be unique. */
  readonly id: string;
  /** Read from the AI index's own data. The wizard saves no progress itself. */
  readonly isDone: (progress: SetupWizardProgress) => boolean;
  /** Left out: always shown. */
  readonly isAvailable?: (progress: SetupWizardProgress) => boolean;
  /** An optional step doesn't block finishing setup, and Continue works before it is done. */
  readonly isOptional?: boolean;
}

export type SetupWizardView<Step extends SetupWizardStepRules> =
  | { show: false }
  | { show: true; steps: readonly Step[]; initialStepId: string };

/**
 * Whether an AI index's Overview shows the setup wizard, and on which step it opens: the stored
 * step, else the first step that is not done. It hides once every required step is done.
 */
export const getSetupWizardView = <Step extends SetupWizardStepRules>({
  steps,
  progress,
  stored,
}: {
  steps: readonly Step[];
  progress: SetupWizardProgress;
  stored: string | undefined;
}): SetupWizardView<Step> => {
  if (progress.aiIndex.managed || stored === SETUP_WIZARD_CLOSED) {
    return { show: false };
  }

  const availableSteps = steps.filter((step) => step.isAvailable?.(progress) ?? true);
  const notDoneSteps = availableSteps.filter((step) => !step.isDone(progress));
  const firstNotDone: Step | undefined = notDoneSteps[0];

  if (firstNotDone === undefined || notDoneSteps.every((step) => step.isOptional)) {
    return { show: false };
  }

  const storedStep = availableSteps.find((step) => step.id === stored);

  return { show: true, steps: availableSteps, initialStepId: (storedStep ?? firstNotDone).id };
};

export const getDoneStepIds = (
  steps: readonly SetupWizardStepRules[],
  progress: SetupWizardProgress
): ReadonlySet<string> =>
  new Set(steps.filter((step) => step.isDone(progress)).map(({ id }) => id));
