/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
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
import { validateStreamName, type StreamNameValidator } from '../../utils';
import { useClassicStreamState, ClassicStreamStep } from '../../hooks';

const VALIDATION_DEBOUNCE_MS = 300;

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
  const { state, actions, isFirstStep, hasNextStep, hasPreviousStep, isNextButtonEnabled } =
    useClassicStreamState();

  const {
    currentStep,
    selectedTemplate,
    streamName,
    selectedIndexPattern,
    validationError,
    conflictingIndexPattern,
    hasAttemptedSubmit,
    isValidating,
  } = state;

  // Run validation and update state, returns true if validation passes
  const runValidation = useCallback(
    async (name: string): Promise<boolean> => {
      if (!selectedTemplate) return false;
      const result = await validateStreamName(name, selectedTemplate, onValidate);
      actions.completeValidation(result.errorType, result.conflictingIndexPattern);
      return result.errorType === null;
    },
    [selectedTemplate, onValidate, actions]
  );

  // Debounced validation - only runs after first submit attempt with an error
  // When validation passes, reset to "submit only" mode
  useDebounce(
    () => {
      if (hasAttemptedSubmit && validationError !== null) {
        actions.startValidation();
        runValidation(streamName);
      }
    },
    VALIDATION_DEBOUNCE_MS,
    [streamName, hasAttemptedSubmit, validationError, runValidation, actions]
  );

  const handleCreate = useCallback(async () => {
    if (!selectedTemplate) return;
    actions.startSubmit();
    actions.startValidation();

    const result = await validateStreamName(streamName, selectedTemplate, onValidate);
    actions.completeValidation(result.errorType, result.conflictingIndexPattern);

    if (result.errorType === null) {
      onCreate(streamName);
    }
  }, [streamName, selectedTemplate, onValidate, onCreate, actions]);

  const steps: EuiStepsHorizontalProps['steps'] = useMemo(
    () => [
      {
        title: i18n.translate('xpack.createClassicStreamFlyout.steps.selectTemplate.title', {
          defaultMessage: 'Select template',
        }),
        status: isFirstStep ? 'current' : 'complete',
        onClick: actions.goToPreviousStep,
        'data-test-subj': 'createClassicStreamStep-selectTemplate',
      },
      {
        title: i18n.translate('xpack.createClassicStreamFlyout.steps.nameAndConfirm.title', {
          defaultMessage: 'Name and confirm',
        }),
        status: isFirstStep ? 'incomplete' : 'current',
        disabled: !isNextButtonEnabled,
        onClick: actions.goToNextStep,
        'data-test-subj': 'createClassicStreamStep-nameAndConfirm',
      },
    ],
    [isFirstStep, isNextButtonEnabled, actions]
  );

  const renderCurrentStepContent = () => {
    switch (currentStep) {
      case ClassicStreamStep.SELECT_TEMPLATE:
        return (
          <SelectTemplateStep
            templates={templates}
            selectedTemplate={selectedTemplate}
            onTemplateSelect={actions.selectTemplate}
            onCreateTemplate={onCreateTemplate}
            hasErrorLoadingTemplates={hasErrorLoadingTemplates}
            onRetryLoadTemplates={onRetryLoadTemplates}
          />
        );

      case ClassicStreamStep.NAME_AND_CONFIRM: {
        if (!selectedTemplate) {
          return null;
        }
        return (
          <NameAndConfirmStep
            template={selectedTemplate}
            selectedIndexPattern={selectedIndexPattern}
            onIndexPatternChange={actions.changeIndexPattern}
            onStreamNameChange={actions.changeStreamName}
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
              <EuiButtonEmpty onClick={actions.goToPreviousStep} data-test-subj="backButton">
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
                onClick={actions.goToNextStep}
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
                isLoading={isValidating}
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
