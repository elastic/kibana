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
import { StepAliases, StepLogistics, StepMappings, StepSettings, StepReview } from './steps';
import {
  validateLogistics,
  validateSettings,
  validateMappings,
  validateAliases,
  TemplateValidation,
} from '../../services/template_validation';
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

const defaultValidation = {
  isValid: true,
  errors: {},
};

const stepComponentMap: { [key: number]: React.FunctionComponent<StepProps> } = {
  1: StepLogistics,
  2: StepSettings,
  3: StepMappings,
  4: StepAliases,
  5: StepReview,
};

const stepValidationMap: { [key: number]: any } = {
  1: validateLogistics,
  2: validateSettings,
  3: validateMappings,
  4: validateAliases,
};

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
  const [validation, setValidation] = useState<{ [key: number]: TemplateValidation }>({
    1: defaultValidation,
    2: defaultValidation,
    3: defaultValidation,
    4: defaultValidation,
    5: defaultValidation,
  });

  const lastStep = Object.keys(stepComponentMap).length;

  const CurrentStepComponent = stepComponentMap[currentStep];

  const validateStep = stepValidationMap[currentStep];

  const stepErrors = validation[currentStep].errors;
  const isStepValid = validation[currentStep].isValid;

  const validationErrors = Object.keys(stepErrors).reduce((acc: any, key: string) => {
    return [...acc, ...stepErrors[key]];
  }, []);

  const updateTemplate = (updatedTemplate: Partial<Template>): void => {
    const newTemplate = { ...template, ...updatedTemplate };

    setTemplate(newTemplate);
  };

  const updateCurrentStep = (nextStep: number, nextMaxCompletedStep: number) => {
    // All steps needs validation, except for the last step
    const shouldValidate = currentStep !== lastStep;

    if (shouldValidate) {
      const stepValidation = validateStep(template);

      const { isValid: isCurrentStepValid } = stepValidation;

      const newValidation = {
        ...validation,
        ...{
          [currentStep]: stepValidation,
        },
      };

      setValidation(newValidation);

      // If step is invalid do not let user proceed
      if (!isCurrentStepValid) {
        return;
      }
    }

    setCurrentStep(nextStep);
    setMaxCompletedStep(nextMaxCompletedStep);
    clearSaveError();
  };

  const onBack = () => {
    const prevStep = currentStep - 1;
    updateCurrentStep(prevStep, prevStep - 1);
  };

  const onNext = () => {
    const nextStep = currentStep + 1;
    updateCurrentStep(nextStep, Math.max(currentStep, maxCompletedStep));
  };

  const saveButtonLabel = isEditing ? (
    <FormattedMessage
      id="xpack.idxMgmt.templateForm.saveButtonLabel"
      defaultMessage="Save template"
    />
  ) : (
    <FormattedMessage
      id="xpack.idxMgmt.templateForm.createButtonLabel"
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
                id="xpack.idxMgmt.templateForm.saveTemplateError"
                defaultMessage="Unable to create template"
              />
            }
            error={saveError}
            data-test-subj="saveTemplateError"
          />
          <EuiSpacer size="m" />
        </Fragment>
      ) : null}

      <EuiForm isInvalid={!isStepValid} error={validationErrors} data-test-subj="templateForm">
        <CurrentStepComponent
          template={template}
          updateTemplate={updateTemplate}
          errors={stepErrors}
          updateCurrentStep={updateCurrentStep}
          isEditing={isEditing}
        />
        <EuiSpacer size="l" />

        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup>
              {currentStep > 1 ? (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty iconType="arrowLeft" onClick={onBack} data-test-subj="backButton">
                    <FormattedMessage
                      id="xpack.idxMgmt.templateForm.backButtonLabel"
                      defaultMessage="Back"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
              ) : null}

              {currentStep < lastStep ? (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    iconType="arrowRight"
                    onClick={onNext}
                    iconSide="right"
                    data-test-subj="nextButton"
                  >
                    <FormattedMessage
                      id="xpack.idxMgmt.templateForm.nextButtonLabel"
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
                        id="xpack.idxMgmt.templateForm.savingButtonLabel"
                        defaultMessage="Saving..."
                      />
                    ) : (
                      saveButtonLabel
                    )}
                  </EuiButton>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>

      <EuiSpacer size="m" />
    </Fragment>
  );
};
