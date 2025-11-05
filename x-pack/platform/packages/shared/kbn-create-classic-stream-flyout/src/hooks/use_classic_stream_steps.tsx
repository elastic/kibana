/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useMemo, useCallback } from 'react';
import type { EuiStepsHorizontalProps, EuiStepStatus } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

/**
 * Step IDs
 */
export enum ClassicStreamStep {
  SELECT_TEMPLATE = 'select_template',
  NAME_AND_CONFIRM = 'name_and_confirm',
}

/**
 * Define the order of the steps programmatically.
 * Updating this array will update the order of the steps in all places needed.
 */
const STEP_ORDER = [ClassicStreamStep.SELECT_TEMPLATE, ClassicStreamStep.NAME_AND_CONFIRM];

/**
 * Check if a step is before another step in the order
 */
const isStepBefore = (step: ClassicStreamStep, comparisonStep: ClassicStreamStep) => {
  return STEP_ORDER.indexOf(step) < STEP_ORDER.indexOf(comparisonStep);
};

/**
 * Calculate the status of a step based on current step and validation state
 */
const getStepStatus = ({
  step,
  currentStep,
  isIncomplete,
}: {
  step: ClassicStreamStep;
  currentStep: ClassicStreamStep;
  isIncomplete?: boolean;
}): EuiStepStatus => {
  // Current step is always marked as current
  if (currentStep === step) return 'current';

  // If incomplete, mark as incomplete
  if (isIncomplete) {
    return 'incomplete';
  }

  // Mark completed steps as complete, future steps as incomplete
  if (isStepBefore(step, currentStep)) {
    return 'complete';
  }

  return 'incomplete';
};

/**
 * Options for the hook
 */
export interface UseClassicStreamStepsOptions {
  initialStep?: ClassicStreamStep;
  onStepChange?: (step: ClassicStreamStep) => void;
}

/**
 * Validation state for each step
 */
export interface StepValidationState {
  isSelectTemplateValid: boolean;
  isNameAndConfirmValid: boolean;
}

/**
 * Return type for the hook
 */
export interface UseClassicStreamStepsResult {
  steps: EuiStepsHorizontalProps['steps'];
  currentStep: ClassicStreamStep;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  jumpToStep: (step: ClassicStreamStep) => void;
  hasNextStep: boolean;
  hasPreviousStep: boolean;
  isNextButtonEnabled: boolean;
  isCreateButtonEnabled: boolean;
  setStepValidation: (validation: Partial<StepValidationState>) => void;
  stepValidation: StepValidationState;
}

/**
 * Custom hook for managing Classic Stream creation steps
 *
 * This hook provides:
 * - Step navigation (next, previous, jump to step)
 * - Step validation state management
 * - Step status calculation (current, complete, incomplete)
 *
 * @example
 * const {
 *   steps,
 *   currentStep,
 *   goToNextStep,
 *   goToPreviousStep,
 *   hasNextStep,
 *   hasPreviousStep,
 *   isNextButtonEnabled,
 *   isCreateButtonEnabled,
 * } = useClassicStreamSteps();
 */
export const useClassicStreamSteps = (
  options: UseClassicStreamStepsOptions = {}
): UseClassicStreamStepsResult => {
  const { initialStep = STEP_ORDER[0], onStepChange } = options;

  const [currentStep, setCurrentStep] = useState<ClassicStreamStep>(initialStep);

  // Track validation state for each step
  // Default to true for now as placeholders - validation will be added later
  const [stepValidation, setStepValidationState] = useState<StepValidationState>({
    isSelectTemplateValid: true,
    isNameAndConfirmValid: true,
  });

  // Wrapper to update validation state
  const setStepValidation = useCallback((validation: Partial<StepValidationState>) => {
    setStepValidationState((prev) => ({ ...prev, ...validation }));
  }, []);

  // Calculate step statuses
  const selectTemplateStatus = useMemo(
    () =>
      getStepStatus({
        step: ClassicStreamStep.SELECT_TEMPLATE,
        currentStep,
      }),
    [currentStep]
  );

  const nameAndConfirmStatus = useMemo(
    () =>
      getStepStatus({
        step: ClassicStreamStep.NAME_AND_CONFIRM,
        currentStep,
      }),
    [currentStep]
  );

  // Determine current navigation position
  const currentStepIndex = useMemo(() => STEP_ORDER.indexOf(currentStep), [currentStep]);

  const hasNextStep = useMemo(() => currentStepIndex < STEP_ORDER.length - 1, [currentStepIndex]);

  const hasPreviousStep = useMemo(() => currentStepIndex > 0, [currentStepIndex]);

  // Navigation functions
  const jumpToStep = useCallback(
    (step: ClassicStreamStep) => {
      setCurrentStep(step);
      onStepChange?.(step);
    },
    [onStepChange]
  );

  const goToNextStep = useCallback(() => {
    if (hasNextStep) {
      const nextStep = STEP_ORDER[currentStepIndex + 1];
      setCurrentStep(nextStep);
      onStepChange?.(nextStep);
    }
  }, [currentStepIndex, hasNextStep, onStepChange]);

  const goToPreviousStep = useCallback(() => {
    if (hasPreviousStep) {
      const previousStep = STEP_ORDER[currentStepIndex - 1];
      setCurrentStep(previousStep);
      onStepChange?.(previousStep);
    }
  }, [currentStepIndex, hasPreviousStep, onStepChange]);

  // Determine if next button should be enabled
  const isNextButtonEnabled = useMemo(() => {
    switch (currentStep) {
      case ClassicStreamStep.SELECT_TEMPLATE:
        return stepValidation.isSelectTemplateValid;
      case ClassicStreamStep.NAME_AND_CONFIRM:
        return stepValidation.isNameAndConfirmValid;
      default:
        return false;
    }
  }, [currentStep, stepValidation]);

  // Determine if create button should be enabled (on final step)
  const isCreateButtonEnabled = useMemo(
    () => currentStep === STEP_ORDER[STEP_ORDER.length - 1] && stepValidation.isNameAndConfirmValid,
    [currentStep, stepValidation.isNameAndConfirmValid]
  );

  // Build steps configuration
  const steps: EuiStepsHorizontalProps['steps'] = useMemo(
    () => [
      {
        title: i18n.translate('xpack.createClassicStreamFlyout.steps.selectTemplate.title', {
          defaultMessage: 'Select template',
        }),
        status: selectTemplateStatus,
        onClick: () => jumpToStep(ClassicStreamStep.SELECT_TEMPLATE),
        'data-test-subj': 'createClassicStreamStep-selectTemplate',
      },
      {
        title: i18n.translate('xpack.createClassicStreamFlyout.steps.nameAndConfirm.title', {
          defaultMessage: 'Name and confirm',
        }),
        status: nameAndConfirmStatus,
        onClick: () => jumpToStep(ClassicStreamStep.NAME_AND_CONFIRM),
        'data-test-subj': 'createClassicStreamStep-nameAndConfirm',
      },
    ],
    [selectTemplateStatus, nameAndConfirmStatus, jumpToStep]
  );

  return {
    steps,
    currentStep,
    goToNextStep,
    goToPreviousStep,
    jumpToStep,
    hasNextStep,
    hasPreviousStep,
    isNextButtonEnabled,
    isCreateButtonEnabled,
    setStepValidation,
    stepValidation,
  };
};
