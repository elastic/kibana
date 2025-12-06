/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useEffect, useReducer } from 'react';
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
  EuiHorizontalRule,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { TemplateDeserialized } from '@kbn/index-management-plugin/common/types';
import { css } from '@emotion/react';
import { SelectTemplateStep, NameAndConfirmStep } from './steps';
import { type StreamNameValidator } from '../../utils';
import { useStreamValidation } from './hooks/use_stream_validation';
import { formReducer, initialFormState } from './reducers/form_reducer';

enum ClassicStreamStep {
  SELECT_TEMPLATE = 'select_template',
  NAME_AND_CONFIRM = 'name_and_confirm',
}

const flyoutBodyStyles = css({
  '.euiFlyoutBody__overflow': {
    display: 'flex',
    flexDirection: 'column',
  },
  '.euiFlyoutBody__overflowContent': {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    padding: 0,
  },
});

interface CreateClassicStreamFlyoutProps {
  /** Callback when the flyout is closed */
  onClose: () => void;
  /**
   * Callback when the stream is created.
   * Receives the stream name which can be used to create the classic stream.
   */
  onCreate: (streamName: string) => void;
  /** Callback to navigate to create template flow */
  onCreateTemplate: () => void;
  /** Available index templates to select from */
  templates: TemplateDeserialized[];
  /** Whether there was an error loading templates */
  hasErrorLoadingTemplates?: boolean;
  /** Callback to retry loading templates */
  onRetryLoadTemplates: () => void;
  /**
   * Async callback to validate the stream name.
   * Called after local empty field validation passes.
   * Should check for duplicate names and higher priority template conflicts.
   */
  onValidate?: StreamNameValidator;
}

export const CreateClassicStreamFlyout = ({
  onClose,
  onCreate,
  onCreateTemplate,
  templates,
  hasErrorLoadingTemplates = false,
  onRetryLoadTemplates,
  onValidate,
}: CreateClassicStreamFlyoutProps) => {
  const [currentStep, setCurrentStep] = useState<ClassicStreamStep>(
    ClassicStreamStep.SELECT_TEMPLATE
  );

  const [formState, dispatch] = useReducer(formReducer, initialFormState);
  const {
    selectedTemplate,
    selectedIndexPattern,
    validationError,
    conflictingIndexPattern,
    isValidating,
    isSubmitting,
  } = formState;

  const { handleStreamNameChange, handleCreate, resetValidation } = useStreamValidation({
    formState,
    dispatch,
    onCreate,
    onValidate,
  });

  const selectedTemplateData = templates.find((t) => t.name === selectedTemplate);

  // Reset validation when template or index pattern changes
  useEffect(() => {
    resetValidation();
  }, [resetValidation, selectedTemplate, selectedIndexPattern]);

  const isFirstStep = currentStep === ClassicStreamStep.SELECT_TEMPLATE;
  const hasNextStep = isFirstStep;
  const hasPreviousStep = !isFirstStep;
  const isNextButtonEnabled = formState.selectedTemplate !== null;

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
        disabled: !isNextButtonEnabled,
        onClick: goToNextStep,
        'data-test-subj': 'createClassicStreamStep-nameAndConfirm',
      },
    ],
    [isFirstStep, isNextButtonEnabled]
  );

  const renderCurrentStepContent = () => {
    switch (currentStep) {
      case ClassicStreamStep.SELECT_TEMPLATE:
        return (
          <SelectTemplateStep
            templates={templates}
            selectedTemplate={selectedTemplate}
            onTemplateSelect={(template) =>
              dispatch({ type: 'SET_SELECTED_TEMPLATE', payload: template })
            }
            onCreateTemplate={onCreateTemplate}
            hasErrorLoadingTemplates={hasErrorLoadingTemplates}
            onRetryLoadTemplates={onRetryLoadTemplates}
          />
        );

      case ClassicStreamStep.NAME_AND_CONFIRM: {
        if (!selectedTemplateData) {
          return null;
        }
        return (
          <NameAndConfirmStep
            template={selectedTemplateData}
            selectedIndexPattern={selectedIndexPattern}
            onIndexPatternChange={(pattern) =>
              dispatch({ type: 'SET_SELECTED_INDEX_PATTERN', payload: pattern })
            }
            onStreamNameChange={handleStreamNameChange}
            validationError={validationError}
            conflictingIndexPattern={conflictingIndexPattern}
          />
        );
      }

      default:
        return null;
    }
  };

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby="create-classic-stream-flyout-title"
      data-test-subj="create-classic-stream-flyout"
      size="640px"
    >
      <EuiFlyoutHeader hasBorder data-test-subj="create-classic-stream-flyout-header">
        <EuiTitle size="s">
          <h3 id="create-classic-stream-flyout-title">
            <FormattedMessage
              id="xpack.createClassicStreamFlyout.title"
              defaultMessage="Create classic stream"
            />
          </h3>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody css={flyoutBodyStyles}>
        <EuiStepsHorizontal size="xs" steps={steps} />
        <EuiHorizontalRule margin="none" />
        <EuiSpacer size="s" />
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
              <EuiButton
                onClick={handleCreate}
                fill
                isLoading={isValidating || isSubmitting}
                data-test-subj="createButton"
              >
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
