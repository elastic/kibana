/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type { EuiStepsProps, EuiStepsHorizontalProps } from '@elastic/eui';
import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import type { PropsWithChildren } from 'react';
import React, { useState, useMemo, useCallback } from 'react';
import { useRuleFormState } from './use_rule_form_state';
import { RuleActions } from '../rule_actions';
import { RuleDefinition } from '../rule_definition';
import { RuleDetails } from '../rule_details';
import {
  RULE_FORM_PAGE_RULE_ACTIONS_TITLE,
  RULE_FORM_PAGE_RULE_DEFINITION_TITLE,
  RULE_FORM_PAGE_RULE_DETAILS_TITLE,
  RULE_FORM_PAGE_RULE_DEFINITION_TITLE_SHORT,
  RULE_FORM_PAGE_RULE_DETAILS_TITLE_SHORT,
} from '../translations';
import { hasActionsError, hasActionsParamsErrors, hasParamsErrors } from '../validation';
import { RuleFormStepId } from '../constants';

interface UseRuleFormStepsOptions {
  /* Used to track steps that have been interacted with and should mark errors with 'danger' instead of 'incomplete' */
  touchedSteps: Record<RuleFormStepId, boolean>;
  /* Used to track the current step in horizontal steps, not used for vertical steps */
  currentStep?: RuleFormStepId;
  shortTitles?: boolean;
}

/**
 * Define the order of the steps programmatically. Updating this array will update the order of the steps
 * in all places needed.
 */
const STEP_ORDER = [RuleFormStepId.DEFINITION, RuleFormStepId.ACTIONS, RuleFormStepId.DETAILS];

const isStepBefore = (step: RuleFormStepId, comparisonStep: RuleFormStepId) => {
  return STEP_ORDER.indexOf(step) < STEP_ORDER.indexOf(comparisonStep);
};

const getStepStatus = ({
  step,
  currentStep,
  hasErrors,
  touchedSteps,
  isIncomplete,
}: {
  step: RuleFormStepId;
  currentStep?: RuleFormStepId;
  hasErrors: boolean;
  touchedSteps: Record<RuleFormStepId, boolean>;
  isIncomplete?: boolean;
}) => {
  // Only apply the current status if currentStep is being tracked
  if (currentStep === step) return 'current';

  if (hasErrors) {
    // Only apply the danger status if the user has interacted with this step and then focused on something else
    // Otherwise just mark it as incomplete
    return touchedSteps[step] ? 'danger' : 'incomplete';
  }

  if (isIncomplete) {
    return 'incomplete';
  }

  // Only mark this step complete or incomplete if the currentStep flag is being used, otherwise set no status
  if (currentStep && isStepBefore(step, currentStep)) {
    return 'complete';
  } else if (currentStep) {
    return 'incomplete';
  }

  return undefined;
};

// Create a common hook for both horizontal and vertical steps
const useCommonRuleFormSteps = ({
  touchedSteps,
  currentStep,
  shortTitles,
}: UseRuleFormStepsOptions) => {
  const {
    plugins: { application },
    baseErrors = {},
    paramsErrors = {},
    actionsErrors = {},
    actionsParamsErrors = {},
    formData: { actions },
  } = useRuleFormState();

  const canReadConnectors = !!application.capabilities.actions?.show;

  const hasRuleDefinitionErrors = useMemo(() => {
    return !!(
      hasParamsErrors(paramsErrors) ||
      baseErrors.interval?.length ||
      baseErrors.alertDelay?.length
    );
  }, [paramsErrors, baseErrors]);

  const hasActionErrors = useMemo(() => {
    return hasActionsError(actionsErrors) || hasActionsParamsErrors(actionsParamsErrors);
  }, [actionsErrors, actionsParamsErrors]);

  const hasRuleDetailsError = useMemo(() => {
    return Boolean(baseErrors.name?.length || baseErrors.tags?.length);
  }, [baseErrors]);

  const ruleDefinitionStatus = useMemo(
    () =>
      getStepStatus({
        step: RuleFormStepId.DEFINITION,
        currentStep,
        hasErrors: hasRuleDefinitionErrors,
        touchedSteps,
      }),
    [hasRuleDefinitionErrors, currentStep, touchedSteps]
  );

  const actionsStatus = useMemo(
    () =>
      getStepStatus({
        step: RuleFormStepId.ACTIONS,
        currentStep,
        hasErrors: hasActionErrors,
        touchedSteps,
        isIncomplete: actions.length === 0,
      }),
    [hasActionErrors, currentStep, touchedSteps, actions]
  );

  const ruleDetailsStatus = useMemo(
    () =>
      getStepStatus({
        step: RuleFormStepId.DETAILS,
        currentStep,
        hasErrors: hasRuleDetailsError,
        touchedSteps,
      }),
    [hasRuleDetailsError, currentStep, touchedSteps]
  );

  const steps = useMemo(
    () => ({
      [RuleFormStepId.DEFINITION]: {
        title: shortTitles
          ? RULE_FORM_PAGE_RULE_DEFINITION_TITLE_SHORT
          : RULE_FORM_PAGE_RULE_DEFINITION_TITLE,
        status: ruleDefinitionStatus,
        children: <RuleDefinition />,
        'data-test-subj': 'ruleFormStep-definition',
      },
      [RuleFormStepId.ACTIONS]: canReadConnectors
        ? {
            title: RULE_FORM_PAGE_RULE_ACTIONS_TITLE,
            status: actionsStatus,
            children: <RuleActions />,
            'data-test-subj': 'ruleFormStep-actions',
          }
        : null,
      [RuleFormStepId.DETAILS]: {
        title: shortTitles
          ? RULE_FORM_PAGE_RULE_DETAILS_TITLE_SHORT
          : RULE_FORM_PAGE_RULE_DETAILS_TITLE,
        status: ruleDetailsStatus,
        children: <RuleDetails />,
        'data-test-subj': 'ruleFormStep-details',
      },
    }),
    [ruleDefinitionStatus, canReadConnectors, actionsStatus, ruleDetailsStatus, shortTitles]
  );

  const stepOrder: RuleFormStepId[] = useMemo(
    () => STEP_ORDER.filter((stepId) => steps[stepId]),
    [steps]
  );

  return { steps, stepOrder };
};

const ReportOnBlur: React.FC<PropsWithChildren<{ stepId: RuleFormStepId; onBlur: () => void }>> = ({
  onBlur,
  stepId,
  children,
}) => (
  <div data-test-subj={`ruleFormStep-${stepId}-reportOnBlur`} onBlur={onBlur}>
    {children}
  </div>
);

interface RuleFormVerticalSteps {
  steps: EuiStepsProps['steps'];
}

export const useRuleFormSteps: () => RuleFormVerticalSteps = () => {
  // Track steps that the user has interacted with and then focused away from
  const [touchedSteps, setTouchedSteps] = useState<Record<RuleFormStepId, boolean>>(
    STEP_ORDER.reduce(
      (result, stepId) => ({ ...result, [stepId]: false }),
      {} as Record<RuleFormStepId, boolean>
    )
  );

  const { steps, stepOrder } = useCommonRuleFormSteps({ touchedSteps });

  const mappedSteps = useMemo(() => {
    return stepOrder
      .map((stepId, index) => {
        const step = steps[stepId];
        return step
          ? {
              ...step,
              children: (
                <ReportOnBlur
                  onBlur={() =>
                    !touchedSteps[stepId] &&
                    setTouchedSteps((prevTouchedSteps) => ({
                      ...prevTouchedSteps,
                      [stepId]: true,
                    }))
                  }
                  stepId={stepId}
                >
                  {step.children}
                  {index > 0 && (
                    <>
                      <EuiSpacer />
                      <EuiHorizontalRule margin="none" />
                    </>
                  )}
                </ReportOnBlur>
              ),
            }
          : null;
      })
      .filter(Boolean) as EuiStepsProps['steps'];
  }, [steps, stepOrder, touchedSteps]);

  return { steps: mappedSteps };
};

interface RuleFormHorizontalSteps {
  steps: EuiStepsHorizontalProps['steps'];
  currentStepComponent: React.ReactNode;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  hasNextStep: boolean;
  hasPreviousStep: boolean;
}
export const useRuleFormHorizontalSteps: (
  initialStep?: RuleFormStepId
) => RuleFormHorizontalSteps = (initialStep = STEP_ORDER[0]) => {
  const [currentStep, setCurrentStep] = useState<RuleFormStepId>(initialStep);
  const [touchedSteps, setTouchedSteps] = useState<Record<RuleFormStepId, boolean>>(
    STEP_ORDER.reduce(
      (result, stepId) => ({ ...result, [stepId]: false }),
      {} as Record<RuleFormStepId, boolean>
    )
  );

  const { steps, stepOrder } = useCommonRuleFormSteps({
    touchedSteps,
    currentStep,
    shortTitles: true,
  });

  // Determine current navigation position
  const currentStepIndex = useMemo(() => stepOrder.indexOf(currentStep), [currentStep, stepOrder]);
  const hasNextStep = useMemo(
    () => currentStep && currentStepIndex < stepOrder.length - 1,
    [currentStepIndex, currentStep, stepOrder]
  );
  const hasPreviousStep = useMemo(
    () => currentStep && currentStepIndex > 0,
    [currentStepIndex, currentStep]
  );

  // Navigation functions
  const goToNextStep = useCallback(() => {
    if (currentStep && hasNextStep) {
      const currentIndex = stepOrder.indexOf(currentStep);
      const nextStep = stepOrder[currentIndex + 1];

      setTouchedSteps((prevTouchedSteps) => ({
        ...prevTouchedSteps,
        [currentStep]: true,
      }));
      setCurrentStep(nextStep);
    }
  }, [currentStep, stepOrder, hasNextStep]);
  const goToPreviousStep = useCallback(() => {
    if (currentStep && hasPreviousStep) {
      const currentIndex = stepOrder.indexOf(currentStep);
      const previousStep = stepOrder[currentIndex - 1];
      setCurrentStep(previousStep);
    }
  }, [currentStep, stepOrder, hasPreviousStep]);
  const jumpToStep = useCallback(
    (stepId: RuleFormStepId) => () => {
      setTouchedSteps((prevTouchedSteps) => ({
        ...prevTouchedSteps,
        [currentStep]: true,
      }));
      setCurrentStep(stepId);
    },
    [currentStep]
  );

  // Add onClick handlers to each step, remove children component as horizontal steps don't render children
  const mappedSteps = useMemo(() => {
    return stepOrder
      .map((stepId) => {
        const step = steps[stepId];
        return step
          ? {
              ...omit(step, 'children'),
              onClick: jumpToStep(stepId),
            }
          : null;
      })
      .filter(Boolean) as EuiStepsHorizontalProps['steps'];
  }, [steps, stepOrder, jumpToStep]);

  return {
    steps: mappedSteps,
    // Horizontal steps only render one step at a time, so pass the current step's children
    currentStepComponent: steps[currentStep]?.children,
    goToNextStep,
    goToPreviousStep,
    hasNextStep,
    hasPreviousStep,
  };
};
