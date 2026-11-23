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
import { SourcesPanel } from '../sources/sources_panel';
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

const getStepStatus = ({
  stepId,
  currentStep,
  done,
}: {
  stepId: SetupWizardStepId;
  currentStep: SetupWizardStepId;
  done: SetupWizardDoneSteps;
}): StepStatus => {
  if (stepId === currentStep) {
    return 'current';
  }
  return done[stepId] ? 'complete' : 'incomplete';
};

/**
 * A step before the current one that is not done is skipped. It follows from the current step
 * alone, so nothing else is stored. Skipping is fine, so a skipped step looks like any step that is
 * not done (no warning icon); only its label for screen readers says it was skipped.
 */
const isStepSkipped = ({
  stepId,
  stepIndex,
  currentIndex,
  done,
}: {
  stepId: SetupWizardStepId;
  stepIndex: number;
  currentIndex: number;
  done: SetupWizardDoneSteps;
}): boolean => stepIndex < currentIndex && !done[stepId];

const getSkippedStepLabel = (stepNumber: number, title: string): string =>
  i18n.translate('xpack.contextEngine.setupWizard.skippedStepAriaLabel', {
    defaultMessage: 'Step {stepNumber}: {title}, skipped',
    values: { stepNumber, title },
  });

interface SetupWizardProps {
  aiIndex: GetAiIndexResponse;
  steps: readonly SetupWizardStepId[];
  /** The step to show. The wizard keeps no step of its own: it lives in local storage. */
  currentStep: SetupWizardStepId;
  done: SetupWizardDoneSteps;
  /** Without memory no agent can save a memory, so Connect agent can't wait for one. */
  isMemoryEnabled: boolean;
  /** Called when the user moves to a step. */
  onStepChange: (stepId: SetupWizardStepId) => void;
  /** Called when the user finishes or exits setup. */
  onClose: () => void;
  onSaved: () => Promise<unknown>;
}

/** First-run setup of an AI index, shown on its Overview tab until setup is done or closed. */
export const SetupWizard = ({
  aiIndex,
  steps,
  currentStep,
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
  const [description, setDescription] = useState(aiIndex.description ?? '');
  // Covers the save and the refetch after it, so Finish setup can't be clicked twice.
  const [isFinishing, setIsFinishing] = useState(false);
  // While a source saves, the wizard waits: a description saved now would send the old sources.
  const [isSavingSources, setIsSavingSources] = useState(false);

  const currentIndex = steps.indexOf(currentStep);
  // Skip and Continue jump over steps that are already done. With none left, they finish setup.
  const nextOpenStep = steps.slice(currentIndex + 1).find((stepId) => !done[stepId]);
  const isLastStep = nextOpenStep === undefined;
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
  const isBusy = isSaving || isFinishing || isSavingSources;

  const getCanContinue = (): boolean => {
    if (currentStep === 'describe') {
      return trimmedDescription.length > 0 && descriptionValidation.valid;
    }
    if (currentStep === 'connect' && !isMemoryEnabled) {
      return true;
    }
    return done[currentStep];
  };

  const close = (toast: string) => {
    onClose();
    notifications.toasts.addSuccess(toast);
  };

  const goToNextOpenStep = () => {
    if (nextOpenStep === undefined) {
      close(finishedToast);
      return;
    }
    onStepChange(nextOpenStep);
  };

  const continueOrFinish = async () => {
    if (currentStep !== 'describe') {
      goToNextOpenStep();
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
    status: getStepStatus({ stepId, currentStep, done }),
    ...(isStepSkipped({ stepId, stepIndex, currentIndex, done }) && {
      'aria-label': getSkippedStepLabel(stepIndex + 1, SETUP_WIZARD_STEP_TEXTS[stepId].stepTitle),
    }),
    onClick: () => onStepChange(stepId),
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
          ) : currentStep === 'sources' ? (
            // The Sources tab's editor: each change saves right away, then the AI index reloads,
            // so the step is done (and Continue works) once the first source is in.
            <SourcesPanel
              isLoading={false}
              aiIndex={aiIndex}
              onSaved={onSaved}
              isManaged={false}
              showDescription={false}
              onSavingChange={setIsSavingSources}
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
                onClick={goToNextOpenStep}
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
