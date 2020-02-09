/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiSpacer,
} from '@elastic/eui';
import { SlmPolicyPayload } from '../../../../common/types';
import { TIME_UNITS } from '../../../../common/constants';
import { PolicyValidation, validatePolicy } from '../../services/validation';
import { useAppDependencies } from '../../index';
import {
  PolicyStepLogistics,
  PolicyStepSettings,
  PolicyStepRetention,
  PolicyStepReview,
} from './steps';
import { PolicyNavigation } from './navigation';

interface Props {
  policy: SlmPolicyPayload;
  indices: string[];
  currentUrl: string;
  isEditing?: boolean;
  isSaving: boolean;
  saveError?: React.ReactNode;
  clearSaveError: () => void;
  onCancel: () => void;
  onSave: (policy: SlmPolicyPayload) => void;
}

export const PolicyForm: React.FunctionComponent<Props> = ({
  policy: originalPolicy,
  indices,
  currentUrl,
  isEditing,
  isSaving,
  saveError,
  clearSaveError,
  onCancel,
  onSave,
}) => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();

  // Step state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [maxCompletedStep, setMaxCompletedStep] = useState<number>(0);
  const stepMap: { [key: number]: any } = {
    1: PolicyStepLogistics,
    2: PolicyStepSettings,
    3: PolicyStepRetention,
    4: PolicyStepReview,
  };
  const CurrentStepForm = stepMap[currentStep];

  // Policy state
  const [policy, setPolicy] = useState<SlmPolicyPayload>({
    ...originalPolicy,
    config: {
      ...(originalPolicy.config || {}),
    },
    retention: {
      ...(originalPolicy.retention || {
        expireAfterUnit: TIME_UNITS.DAY,
      }),
    },
  });

  // Policy validation state
  const [validation, setValidation] = useState<PolicyValidation>({
    isValid: true,
    errors: {},
  });

  const updatePolicy = (
    updatedFields: Partial<SlmPolicyPayload>,
    validationHelperData = {}
  ): void => {
    const newPolicy = { ...policy, ...updatedFields };
    const newValidation = validatePolicy(newPolicy, validationHelperData);
    setPolicy(newPolicy);
    setValidation(newValidation);
  };

  const updateCurrentStep = (step: number) => {
    if (maxCompletedStep < step - 1) {
      return;
    }
    setCurrentStep(step);
    setMaxCompletedStep(step - 1);
    clearSaveError();
  };

  const onBack = () => {
    const previousStep = currentStep - 1;
    setCurrentStep(previousStep);
    setMaxCompletedStep(previousStep - 1);
    clearSaveError();
  };

  const onNext = () => {
    if (!validation.isValid) {
      return;
    }
    const nextStep = currentStep + 1;
    setMaxCompletedStep(Math.max(currentStep, maxCompletedStep));
    setCurrentStep(nextStep);
  };

  const savePolicy = () => {
    if (validation.isValid) {
      onSave(policy);
    }
  };

  const lastStep = Object.keys(stepMap).length;

  return (
    <Fragment>
      <PolicyNavigation
        currentStep={currentStep}
        maxCompletedStep={maxCompletedStep}
        updateCurrentStep={updateCurrentStep}
      />
      <EuiSpacer size="l" />
      <EuiForm>
        <CurrentStepForm
          policy={policy}
          indices={indices}
          updatePolicy={updatePolicy}
          isEditing={isEditing}
          currentUrl={currentUrl}
          errors={validation.errors}
          updateCurrentStep={updateCurrentStep}
        />
        <EuiSpacer size="l" />

        {saveError ? (
          <Fragment>
            {saveError}
            <EuiSpacer size="m" />
          </Fragment>
        ) : null}

        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup>
              {currentStep > 1 ? (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    iconType="arrowLeft"
                    onClick={() => onBack()}
                    disabled={!validation.isValid}
                  >
                    <FormattedMessage
                      id="xpack.snapshotRestore.policyForm.backButtonLabel"
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
                    onClick={() => onNext()}
                    iconSide="right"
                    disabled={!validation.isValid}
                    data-test-subj="nextButton"
                  >
                    <FormattedMessage
                      id="xpack.snapshotRestore.policyForm.nextButtonLabel"
                      defaultMessage="Next"
                    />
                  </EuiButton>
                </EuiFlexItem>
              ) : null}
              {currentStep === lastStep ? (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill={isEditing && policy.isManagedPolicy ? false : true}
                    color={isEditing && policy.isManagedPolicy ? 'warning' : 'secondary'}
                    iconType="check"
                    onClick={() => savePolicy()}
                    isLoading={isSaving}
                    data-test-subj="submitButton"
                  >
                    {isSaving ? (
                      <FormattedMessage
                        id="xpack.snapshotRestore.policyForm.savingButtonLabel"
                        defaultMessage="Saving…"
                      />
                    ) : isEditing ? (
                      <FormattedMessage
                        id="xpack.snapshotRestore.policyForm.saveButtonLabel"
                        defaultMessage="Save policy"
                      />
                    ) : (
                      <FormattedMessage
                        id="xpack.snapshotRestore.policyForm.createButtonLabel"
                        defaultMessage="Create policy"
                      />
                    )}
                  </EuiButton>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={() => onCancel()}>
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
      <EuiSpacer size="m" />
    </Fragment>
  );
};
