/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiStepsHorizontal,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiStepsHorizontalProps } from '@elastic/eui';
import { css } from '@emotion/react';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { MAX_AI_INDEX_DESCRIPTION_LENGTH } from '../../../../../common/constants';
import type { GetAiIndexResponse } from '../../../../../common/http_api/ai_indices';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../common/telemetry';
import { useKibana } from '../../../hooks/use_kibana';
import { useSaveAiIndexDescription } from '../../../hooks/use_save_ai_index_description';
import type { SetupWizardDoneSteps, SetupWizardStepId } from '../../../utils/setup_wizard';
import { validateTextInput } from '../../../utils/validate_text_input';
import { AiIndexDescriptionField } from '../../ai_index_description_field';
import { SETUP_WIZARD_STEP_TEXTS } from './setup_wizard_texts';

// Parts of the one bordered panel: no own border, shadow or rounded corners.
const innerPanelProps = {
  color: 'transparent',
  hasBorder: false,
  hasShadow: false,
  borderRadius: 'none',
} as const;

const ebtElement = CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageSetupWizard;
const ebtAction = CONTEXT_ENGINE_UI_EBT.action.setupWizard;

const finishedToast = i18n.translate('xpack.contextEngine.setupWizard.finishedToast', {
  defaultMessage: 'Setup finished. You can change any of it in Settings.',
});

const closedToast = i18n.translate('xpack.contextEngine.setupWizard.closedToast', {
  defaultMessage: 'Setup closed. Everything is in Settings when you need it.',
});

const placeholderText = i18n.translate('xpack.contextEngine.setupWizard.placeholder', {
  defaultMessage: 'This step is not ready yet. Skip it for now.',
});

type StepStatus = EuiStepsHorizontalProps['steps'][number]['status'];

/**
 * A step the user already went past without finishing it counts as skipped. "Went past" means it
 * comes before the furthest step reached, so steps before a saved step are skipped after a refresh.
 */
const getStepStatus = ({
  stepId,
  stepIndex,
  currentStep,
  furthestIndex,
  done,
}: {
  stepId: SetupWizardStepId;
  stepIndex: number;
  currentStep: SetupWizardStepId;
  furthestIndex: number;
  done: SetupWizardDoneSteps;
}): StepStatus => {
  if (stepId === currentStep) {
    return 'current';
  }
  if (done[stepId]) {
    return 'complete';
  }
  return stepIndex < furthestIndex ? 'warning' : 'incomplete';
};

interface SetupWizardProps {
  aiIndex: GetAiIndexResponse;
  steps: readonly SetupWizardStepId[];
  initialStep: SetupWizardStepId;
  done: SetupWizardDoneSteps;
  /** Without memory no agent can save a memory, so Connect agent can't wait for one. */
  isMemoryEnabled: boolean;
  /** Called when the user moves to a step, so the step survives a page refresh. */
  onStepChange: (stepId: SetupWizardStepId) => void;
  /** Called when the user finishes or exits setup. */
  onClose: () => void;
  onSaved: () => Promise<unknown>;
}

/** First-run setup of an AI index, shown on its Overview tab until setup is done or closed. */
export const SetupWizard = ({
  aiIndex,
  steps,
  initialStep,
  done,
  isMemoryEnabled,
  onStepChange,
  onClose,
  onSaved,
}: SetupWizardProps) => {
  const {
    services: { docLinks, notifications },
  } = useKibana();
  const { euiTheme } = useEuiTheme();
  const { saveDescription, isSaving } = useSaveAiIndexDescription();
  const [currentStep, setCurrentStep] = useState<SetupWizardStepId>(initialStep);
  const [furthestIndex, setFurthestIndex] = useState(() => steps.indexOf(initialStep));
  const [description, setDescription] = useState(aiIndex.description ?? '');
  // Covers the save and the refetch after it, so Finish setup can't be clicked twice.
  const [isFinishing, setIsFinishing] = useState(false);

  const currentIndex = steps.indexOf(currentStep);
  const isLastStep = currentIndex === steps.length - 1;
  const texts = SETUP_WIZARD_STEP_TEXTS[currentStep];
  const { overview, sources, memory, aiIndices } = docLinks.links.contextEngine;
  const docsLinks: Readonly<Record<SetupWizardStepId, string>> = {
    dreaming: memory,
    connect: overview,
    sources,
    describe: aiIndices,
  };

  const trimmedDescription = description.trim();
  const descriptionValidation = validateTextInput({
    value: trimmedDescription,
    maxLength: MAX_AI_INDEX_DESCRIPTION_LENGTH,
  });
  const isBusy = isSaving || isFinishing;

  const getCanContinue = (): boolean => {
    if (currentStep === 'describe') {
      return trimmedDescription.length > 0 && descriptionValidation.valid;
    }
    if (currentStep === 'connect' && !isMemoryEnabled) {
      return true;
    }
    return done[currentStep];
  };

  const goToStep = (stepId: SetupWizardStepId) => {
    setCurrentStep(stepId);
    setFurthestIndex((current) => Math.max(current, steps.indexOf(stepId)));
    onStepChange(stepId);
  };

  const close = (toast: string) => {
    onClose();
    notifications.toasts.addSuccess(toast);
  };

  const goToNextStep = () => {
    const nextStep = steps[currentIndex + 1];
    if (nextStep) {
      goToStep(nextStep);
    }
  };

  const skip = () => {
    if (isLastStep) {
      close(finishedToast);
      return;
    }
    goToNextStep();
  };

  const continueOrFinish = async () => {
    if (currentStep !== 'describe') {
      goToNextStep();
      return;
    }
    setIsFinishing(true);
    if (await saveDescription(aiIndex, trimmedDescription)) {
      await onSaved();
      close(finishedToast);
      return;
    }
    setIsFinishing(false);
  };

  const stepsBar: EuiStepsHorizontalProps['steps'] = steps.map((stepId, stepIndex) => ({
    title: SETUP_WIZARD_STEP_TEXTS[stepId].stepTitle,
    status: getStepStatus({ stepId, stepIndex, currentStep, furthestIndex, done }),
    onClick: () => goToStep(stepId),
    disabled: isBusy,
    'data-test-subj': `contextSetupWizardStep-${stepId}`,
    ...getEbtProps({ element: ebtElement, action: ebtAction.GO_TO_STEP }),
  }));

  return (
    <div
      css={css({ maxWidth: euiTheme.breakpoint.l, marginInline: 'auto', width: '100%' })}
      data-test-subj="contextSetupWizard"
    >
      <EuiStepsHorizontal steps={stepsBar} size="s" />
      <EuiSpacer size="l" />
      <EuiPanel
        hasBorder
        paddingSize="none"
        data-test-subj={`contextSetupWizardPanel-${currentStep}`}
      >
        <EuiPanel {...innerPanelProps} paddingSize="l" aria-live="polite">
          <EuiTitle size="s">
            <h2>{texts.title}</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>
              {texts.description}{' '}
              <EuiLink href={docsLinks[currentStep]} target="_blank" external>
                {texts.docsLinkLabel}
              </EuiLink>
            </p>
          </EuiText>
          <EuiSpacer size="l" />
          {currentStep === 'describe' ? (
            <AiIndexDescriptionField
              value={description}
              onChange={setDescription}
              error={descriptionValidation.error}
              warning={descriptionValidation.warning}
              data-test-subj="contextSetupWizardDescription"
            />
          ) : (
            <EuiText size="s" data-test-subj="contextSetupWizardPlaceholder">
              <p>{placeholderText}</p>
            </EuiText>
          )}
        </EuiPanel>
        <EuiHorizontalRule margin="none" />
        <EuiPanel {...innerPanelProps} paddingSize="m">
          <EuiFlexGroup alignItems="center" responsive={false} gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={() => close(closedToast)}
                isDisabled={isBusy}
                data-test-subj="contextSetupWizardExit"
                {...getEbtProps({ element: ebtElement, action: ebtAction.EXIT })}
              >
                {i18n.translate('xpack.contextEngine.setupWizard.exit', {
                  defaultMessage: 'Exit setup',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem />
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={skip}
                isDisabled={isBusy}
                data-test-subj="contextSetupWizardSkip"
                {...getEbtProps({ element: ebtElement, action: ebtAction.SKIP })}
              >
                {isLastStep
                  ? i18n.translate('xpack.contextEngine.setupWizard.skipAndFinish', {
                      defaultMessage: 'Skip and finish',
                    })
                  : i18n.translate('xpack.contextEngine.setupWizard.skip', {
                      defaultMessage: 'Skip',
                    })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={continueOrFinish}
                isDisabled={!getCanContinue()}
                isLoading={isBusy}
                data-test-subj="contextSetupWizardContinue"
                {...getEbtProps({
                  element: ebtElement,
                  action: isLastStep ? ebtAction.FINISH : ebtAction.CONTINUE,
                })}
              >
                {isLastStep
                  ? i18n.translate('xpack.contextEngine.setupWizard.finish', {
                      defaultMessage: 'Finish setup',
                    })
                  : i18n.translate('xpack.contextEngine.setupWizard.continue', {
                      defaultMessage: 'Continue',
                    })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiPanel>
    </div>
  );
};
