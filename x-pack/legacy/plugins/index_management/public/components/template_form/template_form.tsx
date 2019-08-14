/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiSpacer,
} from '@elastic/eui';
import { Template } from '../../../common/types';
import { TemplateSteps } from './template_steps';
import { TemplateValidation, validateTemplate } from '../../services/validation';
import { StepAliases, StepLogistics, StepMappings, StepSettings, StepReview } from './steps';
import { StepProps } from './types';
import { SectionError } from '..';

interface Props {
  onSave: (template: Template) => void;
  clearSaveError: () => void;
  isSaving: boolean;
  saveError: any;
  template: Template;
  isEditing?: boolean;
}

export const TemplateForm: React.FunctionComponent<Props> = ({
  template: initialTemplate,
  onSave,
  isSaving,
  saveError,
  clearSaveError,
  isEditing,
}) => {
  // hooks
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [maxCompletedStep, setMaxCompletedStep] = useState<number>(0);
  const [template, setTemplate] = useState<Template>(initialTemplate);
  const [validation, setValidation] = useState<TemplateValidation>({
    isValid: true,
    errors: {},
  });

  const stepComponentMap: { [key: number]: React.FunctionComponent<StepProps> } = {
    1: StepLogistics,
    2: StepSettings,
    3: StepMappings,
    4: StepAliases,
    5: StepReview,
  };

  const lastStep = Object.keys(stepComponentMap).length;

  const CurrentStepComponent = stepComponentMap[currentStep];

  const { errors, isValid } = validation;

  const validationErrors = Object.keys(errors).reduce((acc: any, key: string) => {
    return [...acc, ...errors[key]];
  }, []);

  const updateTemplate = (updatedTemplate: Partial<Template>): void => {
    const newTemplate = { ...template, ...updatedTemplate };

    setTemplate(newTemplate);
  };

  const updateCurrentStep = (step: number) => {
    const prevStep = step - 1;

    if (maxCompletedStep < prevStep) {
      return;
    }
    setCurrentStep(step);
    setMaxCompletedStep(prevStep);
    clearSaveError();
  };

  const onBack = () => {
    const prevStep = currentStep - 1;

    setCurrentStep(prevStep);
    setMaxCompletedStep(prevStep - 1);
    clearSaveError();
  };

  const onNext = () => {
    const nextStep = currentStep + 1;
    const newValidation = validateTemplate(template);

    setValidation(newValidation);

    if (newValidation.isValid) {
      setMaxCompletedStep(Math.max(currentStep, maxCompletedStep));
      setCurrentStep(nextStep);
    }
  };

  const saveButtonLabel = isEditing ? (
    <FormattedMessage
      id="xpack.idxMgmt.templatesForm.saveButtonLabel"
      defaultMessage="Save template"
    />
  ) : (
    <FormattedMessage
      id="xpack.idxMgmt.templatesForm.createButtonLabel"
      defaultMessage="Create template"
    />
  );

  return (
    <Fragment>
      <TemplateSteps
        currentStep={currentStep}
        maxCompletedStep={maxCompletedStep}
        updateCurrentStep={updateCurrentStep}
      />

      <EuiSpacer size="l" />

      {saveError ? (
        <Fragment>
          <SectionError
            title={
              <FormattedMessage
                id="xpack.idxMgmt.templatesForm.saveTemplateError"
                defaultMessage="Unable to create template"
              />
            }
            error={saveError}
            data-test-subj="saveTemplateError"
          />
          <EuiSpacer size="m" />
        </Fragment>
      ) : null}

      <EuiForm isInvalid={!isValid} error={validationErrors} data-test-subj="templatesForm">
        <CurrentStepComponent
          template={template}
          updateTemplate={updateTemplate}
          errors={errors}
          updateCurrentStep={updateCurrentStep}
          isEditing={isEditing}
        />
        <EuiSpacer size="l" />

        <EuiFlexGroup>
          {currentStep > 1 ? (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="arrowLeft" onClick={onBack} data-test-subj="backButton">
                <FormattedMessage
                  id="xpack.idxMgmt.templatesForm.backButtonLabel"
                  defaultMessage="Back"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          ) : null}

          {currentStep < lastStep ? (
            <EuiFlexItem grow={false}>
              <EuiButton fill iconType="arrowRight" onClick={onNext} data-test-subj="nextButton">
                <FormattedMessage
                  id="xpack.idxMgmt.templatesForm.nextButtonLabel"
                  defaultMessage="Next"
                />
              </EuiButton>
            </EuiFlexItem>
          ) : null}

          {currentStep === lastStep ? (
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                color="secondary"
                iconType="check"
                onClick={onSave.bind(null, template)}
                data-test-subj="submitButton"
                isLoading={isSaving}
              >
                {isSaving ? (
                  <FormattedMessage
                    id="xpack.idxMgmt.templatesForm.savingButtonLabel"
                    defaultMessage="Saving..."
                  />
                ) : (
                  saveButtonLabel
                )}
              </EuiButton>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiForm>

      <EuiSpacer size="m" />
    </Fragment>
  );
};
