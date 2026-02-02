/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useReducer, useCallback } from 'react';
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
  EuiLoadingSpinner,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { TemplateListItem as IndexTemplate } from '@kbn/index-management-shared-types';
import { SelectTemplateStep, NameAndConfirmStep } from './steps';
import {
  type StreamNameValidator,
  buildStreamName,
  countWildcards,
  type IlmPolicyFetcher,
  type SimulatedTemplateFetcher,
} from '../../utils';
import { useStreamValidation } from './hooks/use_stream_validation';
import { formReducer, initialFormState } from './reducers/form_reducer';

export enum ClassicStreamStep {
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
  onCreate: (streamName: string) => Promise<void>;
  /** Callback to navigate to create template flow */
  onCreateTemplate: () => void;
  /** Available index templates to select from */
  templates: IndexTemplate[];
  /** Whether templates are currently being loaded */
  isLoadingTemplates?: boolean;
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
  /**
   * Async callback to fetch ILM policy details by name.
   * If provided, ILM policy details will be displayed in the template details section.
   */
  getIlmPolicy?: IlmPolicyFetcher;
  /**
   * Async callback to fetch simulated template data by template name.
   * If provided, the resolved template data will be used in the template details section.
   */
  getSimulatedTemplate?: SimulatedTemplateFetcher;
}

export const CreateClassicStreamFlyout = ({
  onClose,
  onCreate,
  onCreateTemplate,
  templates,
  isLoadingTemplates = false,
  hasErrorLoadingTemplates = false,
  onRetryLoadTemplates,
  onValidate,
  getIlmPolicy,
  getSimulatedTemplate,
}: CreateClassicStreamFlyoutProps) => {
  const [currentStep, setCurrentStep] = useState<ClassicStreamStep>(
    ClassicStreamStep.SELECT_TEMPLATE
  );

  const [formState, dispatch] = useReducer(formReducer, initialFormState);
  const { selectedTemplate, selectedIndexPattern, streamNameParts, validation, isSubmitting } =
    formState;

  // Derive props from validation state
  const validationError = validation.validationError;
  const conflictingIndexPattern = validation.conflictingIndexPattern;
  const isValidating = validation.isValidating;

  const selectedTemplateData = templates.find((t) => t.name === selectedTemplate);

  const { handleStreamNameChange, handleCreate, resetValidation, setStreamName } =
    useStreamValidation({
      formState,
      dispatch,
      onCreate,
      selectedTemplate: selectedTemplateData,
      onValidate,
    });

  const updateIndexPattern = useCallback(
    (pattern: string) => {
      dispatch({ type: 'SET_SELECTED_INDEX_PATTERN', payload: pattern });
      const wildcardCount = countWildcards(pattern);
      const emptyParts = Array(wildcardCount).fill('');
      dispatch({ type: 'SET_STREAM_NAME_PARTS', payload: emptyParts });
      const newStreamName = buildStreamName(pattern, emptyParts);
      setStreamName(newStreamName);
    },
    [dispatch, setStreamName]
  );

  const handleTemplateSelect = useCallback(
    (templateName: string | null) => {
      resetValidation();
      dispatch({ type: 'SET_SELECTED_TEMPLATE', payload: templateName });

      if (templateName) {
        const template = templates.find((t) => t.name === templateName);
        const firstPattern = template?.indexPatterns?.[0] || '';
        if (firstPattern) {
          updateIndexPattern(firstPattern);
        }
      }
    },
    [resetValidation, templates, updateIndexPattern]
  );

  const handleIndexPatternChange = useCallback(
    (pattern: string) => {
      resetValidation();
      updateIndexPattern(pattern);
    },
    [resetValidation, updateIndexPattern]
  );

  const handleStreamNamePartsChange = useCallback(
    (parts: string[]) => {
      dispatch({ type: 'SET_STREAM_NAME_PARTS', payload: parts });
      if (selectedIndexPattern) {
        const newStreamName = buildStreamName(selectedIndexPattern, parts);
        handleStreamNameChange(newStreamName);
      }
    },
    [selectedIndexPattern, handleStreamNameChange]
  );

  const isFirstStep = currentStep === ClassicStreamStep.SELECT_TEMPLATE;
  const hasPreviousStep = !isFirstStep;
  const isTemplateSelected = formState.selectedTemplate !== null;

  const goToNextStep = () => setCurrentStep(ClassicStreamStep.NAME_AND_CONFIRM);
  const goToPreviousStep = useCallback(() => {
    // Clear template selection so user can click to re-select and auto-advance
    dispatch({ type: 'SET_SELECTED_TEMPLATE', payload: null });
    resetValidation();
    setCurrentStep(ClassicStreamStep.SELECT_TEMPLATE);
  }, [resetValidation]);

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
        disabled: !isTemplateSelected,
        onClick: goToNextStep,
        'data-test-subj': 'createClassicStreamStep-nameAndConfirm',
      },
    ],
    [isFirstStep, isTemplateSelected, goToPreviousStep]
  );

  const renderCurrentStepContent = () => {
    switch (currentStep) {
      case ClassicStreamStep.SELECT_TEMPLATE:
        if (isLoadingTemplates) {
          return (
            <EuiFlexGroup justifyContent="center" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="xl" />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        }
        return (
          <SelectTemplateStep
            templates={templates}
            selectedTemplate={selectedTemplate}
            onTemplateSelect={handleTemplateSelect}
            onTemplateConfirm={goToNextStep}
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
            streamNameParts={streamNameParts}
            onIndexPatternChange={handleIndexPatternChange}
            onStreamNamePartsChange={handleStreamNamePartsChange}
            validationError={validationError}
            conflictingIndexPattern={conflictingIndexPattern}
            getIlmPolicy={getIlmPolicy}
            getSimulatedTemplate={getSimulatedTemplate}
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
          {!isFirstStep && (
            <EuiFlexItem grow={false}>
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
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
