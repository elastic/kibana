/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiStepsHorizontal } from '@elastic/eui';
import type { EuiStepsHorizontalProps, UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useRef, useState } from 'react';
import type { GetAiIndexResponse } from '../../../../../common/http_api/ai_indices';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../common/telemetry';
import { useKibana } from '../../../hooks/use_kibana';
import type { SetupWizardStep } from './types';

const finishedToast = i18n.translate('xpack.contextEngine.setupWizard.finishedToast', {
  defaultMessage: 'Setup finished. You can change any of it in Settings.',
});

const closedToast = i18n.translate('xpack.contextEngine.setupWizard.closedToast', {
  defaultMessage: 'Setup closed. Everything is in Settings when you need it.',
});

const getSkippedStepLabel = (stepNumber: number, title: string): string =>
  i18n.translate('xpack.contextEngine.setupWizard.skippedStepAriaLabel', {
    defaultMessage: 'Step {stepNumber}: {title}, skipped',
    values: { stepNumber, title },
  });

const wizardStyle = ({ euiTheme }: UseEuiTheme) =>
  css({ maxWidth: euiTheme.breakpoint.l, marginInline: 'auto', width: '100%' });

type StepStatus = EuiStepsHorizontalProps['steps'][number]['status'];

const getStepStatus = ({
  isCurrent,
  isDone,
}: {
  isCurrent: boolean;
  isDone: boolean;
}): StepStatus => {
  if (isCurrent) {
    return 'current';
  }
  return isDone ? 'complete' : 'incomplete';
};

interface SetupWizardProps {
  aiIndex: GetAiIndexResponse;
  steps: readonly SetupWizardStep[];
  /** The step to show. The wizard keeps no step of its own: it lives in local storage. */
  currentStepId: string;
  doneStepIds: ReadonlySet<string>;
  onStepChange: (stepId: string) => void;
  onClose: () => void;
  onSaved: () => Promise<unknown>;
}

/** First-run setup of an AI index, shown on its Overview tab until setup is done or closed. */
export const SetupWizard = ({
  aiIndex,
  steps,
  currentStepId,
  doneStepIds,
  onStepChange,
  onClose,
  onSaved,
}: SetupWizardProps) => {
  const {
    services: { notifications },
  } = useKibana();
  // Covers a step's save and the reload after it, so Continue can't be clicked twice.
  const [isContinuing, setIsContinuing] = useState(false);
  // A step that saves on its own (Sources) holds the wizard: navigating now would lose the save.
  const [isStepBusy, setIsStepBusy] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shownStepId = useRef(currentStepId);

  // A step change moves focus to the new heading, so it doesn't stay on a button that is gone or
  // disabled. The first render keeps the page's focus.
  useEffect(() => {
    if (shownStepId.current === currentStepId) {
      return;
    }
    shownStepId.current = currentStepId;
    headingRef.current?.focus();
  }, [currentStepId]);

  const currentIndex = Math.max(
    0,
    steps.findIndex(({ id }) => id === currentStepId)
  );
  const currentStep = steps[currentIndex];
  const previousStep: SetupWizardStep | undefined = steps[currentIndex - 1];
  // Skip and Continue jump over steps that are already done. With none left, they finish setup.
  const nextOpenStep = steps.slice(currentIndex + 1).find(({ id }) => !doneStepIds.has(id));
  const isBusy = isContinuing || isStepBusy;

  const close = (toast: string) => {
    onClose();
    notifications.toasts.addSuccess(toast);
  };

  const goToNextOpenStep = () => {
    if (nextOpenStep === undefined) {
      close(finishedToast);
      return;
    }
    onStepChange(nextOpenStep.id);
  };

  const goToStep = (stepId: string) => {
    if (isBusy) {
      return;
    }
    onStepChange(stepId);
  };

  const continueWith = async (save?: () => Promise<boolean>) => {
    if (save === undefined) {
      goToNextOpenStep();
      return;
    }
    setIsContinuing(true);
    if (!(await save())) {
      setIsContinuing(false);
      return;
    }
    await onSaved();
    setIsContinuing(false);
    goToNextOpenStep();
  };

  /**
   * A step before the current one that is not done is skipped. It follows from the current step
   * alone, so nothing else is stored. Skipping is fine, so a skipped step looks like any step that
   * is not done (no warning icon); only its label for screen readers says it was skipped.
   */
  const stepsBar: EuiStepsHorizontalProps['steps'] = steps.map(({ id, texts }, stepIndex) => {
    const isDone = doneStepIds.has(id);
    return {
      title: texts.stepTitle,
      status: getStepStatus({ isCurrent: id === currentStep.id, isDone }),
      ...(stepIndex < currentIndex &&
        !isDone && { 'aria-label': getSkippedStepLabel(stepIndex + 1, texts.stepTitle) }),
      onClick: () => goToStep(id),
      'data-test-subj': `contextSetupWizardStep-${id}`,
      ...getEbtProps({
        element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageSetupWizard,
        action: CONTEXT_ENGINE_UI_EBT.action.setupWizard.GO_TO_STEP,
        detail: id,
      }),
    };
  });

  const { Content } = currentStep;

  return (
    <div css={wizardStyle} data-test-subj="contextSetupWizard">
      <EuiStepsHorizontal steps={stepsBar} size="s" />
      <EuiSpacer size="l" />
      <Content
        // A new step starts with its own fresh draft.
        key={currentStep.id}
        aiIndex={aiIndex}
        onSaved={onSaved}
        onBusyChange={setIsStepBusy}
        layout={{
          step: currentStep,
          headingRef,
          isDone: doneStepIds.has(currentStep.id),
          isFirstStep: previousStep === undefined,
          isLastStep: nextOpenStep === undefined,
          isBusy,
          onBack: () => {
            if (previousStep !== undefined) {
              goToStep(previousStep.id);
            }
          },
          onSkip: goToNextOpenStep,
          onExit: () => close(closedToast),
          onContinue: continueWith,
        }}
      />
    </div>
  );
};
