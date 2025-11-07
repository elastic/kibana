/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiStepsHorizontal,
  type EuiStepsHorizontalProps,
  EuiTitle,
  EuiButton,
  EuiFlyoutFooter,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { SelectTemplateStep } from './select_template_step';

enum ClassicStreamStep {
  SELECT_TEMPLATE = 'select_template',
  NAME_AND_CONFIRM = 'name_and_confirm',
}

/**
 * Simplified template interface for the flyout.
 * Contains the essential fields needed for template selection.
 */
export interface IndexTemplate {
  name: string;
  ilmPolicy?: {
    name: string;
  };
  indexPatterns?: string[];
  /** Whether to show the ILM badge. If false, only the policy name is displayed. */
  showIlmBadge?: boolean;
}

interface CreateClassicStreamFlyoutProps {
  onClose: () => void;
  onCreate: () => void;
  onCreateTemplate?: () => void;
  templates: IndexTemplate[];
  selectedTemplate: string | null;
  onTemplateSelect: (templateName: string | null) => void;
  isLoadingTemplates?: boolean;
  hasErrorLoadingTemplates?: boolean;
  onRetryLoadTemplates?: () => void;
}

export const CreateClassicStreamFlyout = ({
  onClose,
  onCreate,
  onCreateTemplate,
  templates,
  selectedTemplate,
  onTemplateSelect,
  isLoadingTemplates = false,
  hasErrorLoadingTemplates = false,
  onRetryLoadTemplates,
}: CreateClassicStreamFlyoutProps) => {
  const [currentStep, setCurrentStep] = useState<ClassicStreamStep>(
    ClassicStreamStep.SELECT_TEMPLATE
  );

  const isFirstStep = currentStep === ClassicStreamStep.SELECT_TEMPLATE;
  const hasNextStep = isFirstStep;
  const hasPreviousStep = !isFirstStep;
  const isNextButtonEnabled = selectedTemplate !== null;

  const goToNextStep = () => setCurrentStep(ClassicStreamStep.NAME_AND_CONFIRM);
  const goToPreviousStep = () => setCurrentStep(ClassicStreamStep.SELECT_TEMPLATE);

  const steps: EuiStepsHorizontalProps['steps'] = useMemo(
    () => [
      {
        title: i18n.translate('xpack.createClassicStreamFlyout.steps.selectTemplate.title', {
          defaultMessage: 'Select template',
        }),
        status: isFirstStep ? 'current' : 'complete',
        onClick: goToPreviousStep,
        'data-test-subj': 'createClassicStreamStep-selectTemplate',
      },
      {
        title: i18n.translate('xpack.createClassicStreamFlyout.steps.nameAndConfirm.title', {
          defaultMessage: 'Name and confirm',
        }),
        status: isFirstStep ? 'incomplete' : 'current',
        onClick: goToNextStep,
        'data-test-subj': 'createClassicStreamStep-nameAndConfirm',
      },
    ],
    [isFirstStep]
  );

  // Render the content for the current step
  const renderCurrentStepContent = () => {
    switch (currentStep) {
      case ClassicStreamStep.SELECT_TEMPLATE:
        return (
          <SelectTemplateStep
            templates={templates}
            selectedTemplate={selectedTemplate}
            onTemplateSelect={onTemplateSelect}
            onCreateTemplate={onCreateTemplate}
            isLoadingTemplates={isLoadingTemplates}
            hasErrorLoadingTemplates={hasErrorLoadingTemplates}
            onRetryLoadTemplates={onRetryLoadTemplates}
          />
        );

      case ClassicStreamStep.NAME_AND_CONFIRM:
        return <div data-test-subj="nameAndConfirmStep" />;

      default:
        return null;
    }
  };

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby="create-classic-stream-flyout-title"
      data-test-subj="create-classic-stream-flyout"
    >
      <EuiFlyoutHeader hasBorder data-test-subj="create-classic-stream-flyout-header">
        <EuiTitle size="s">
          <h3 id="create-classic-stream-flyout-title">
            <FormattedMessage
              id="xpack.createClassicStreamFlyout.title"
              defaultMessage="Create Classic Stream"
            />
          </h3>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody
        css={{
          '.euiFlyoutBody__overflow': {
            display: 'flex',
            flexDirection: 'column',
          },
          '.euiFlyoutBody__overflowContent': {
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
          },
        }}
      >
        <EuiStepsHorizontal size="xs" steps={steps} />
        {renderCurrentStepContent()}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            {hasPreviousStep ? (
              <EuiButtonEmpty onClick={goToPreviousStep} data-test-subj="backButton">
                <FormattedMessage
                  id="xpack.createClassicStreamFlyout.footer.back"
                  defaultMessage="Back"
                />
              </EuiButtonEmpty>
            ) : (
              <EuiButtonEmpty onClick={onClose} data-test-subj="cancelButton">
                <FormattedMessage
                  id="xpack.createClassicStreamFlyout.footer.cancel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {hasNextStep ? (
              <EuiButton
                onClick={goToNextStep}
                fill
                disabled={!isNextButtonEnabled}
                data-test-subj="nextButton"
              >
                <FormattedMessage
                  id="xpack.createClassicStreamFlyout.footer.next"
                  defaultMessage="Next"
                />
              </EuiButton>
            ) : (
              <EuiButton onClick={onCreate} fill data-test-subj="createButton">
                <FormattedMessage
                  id="xpack.createClassicStreamFlyout.footer.create"
                  defaultMessage="Create"
                />
              </EuiButton>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
