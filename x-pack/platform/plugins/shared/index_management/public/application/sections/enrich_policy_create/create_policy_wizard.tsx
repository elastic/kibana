/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSteps, EuiStepStatus, EuiCallOut, EuiSpacer } from '@elastic/eui';

import type { SerializedEnrichPolicy } from '@kbn/index-management-shared-types';
import { useAppContext } from '../../app_context';
import { ConfigurationStep, FieldSelectionStep, CreateStep } from './steps';
import { useCreatePolicyContext } from './create_policy_context';
import { createEnrichPolicy } from '../../services/api';
import type { Error } from '../../../shared_imports';

const CONFIGURATION = 1;
const FIELD_SELECTION = 2;
const CREATE = 3;

export const CreatePolicyWizard = () => {
  const {
    history,
    services: { notificationService },
  } = useAppContext();
  const { draft, completionState } = useCreatePolicyContext();
  const [currentStep, setCurrentStep] = useState(CONFIGURATION);
  const [isLoading, setIsLoading] = useState(false);
  const [createError, setCreateError] = useState<Error | null>(null);

  const getStepStatus = useCallback(
    (forStep: number): EuiStepStatus => {
      if (currentStep === forStep) {
        return 'current';
      }

      return 'incomplete';
    },
    [currentStep]
  );

  const onSubmit = useCallback(
    async (executePolicyAfterCreation?: boolean) => {
      setIsLoading(true);
      const { error, data } = await createEnrichPolicy(
        draft as SerializedEnrichPolicy,
        executePolicyAfterCreation
      );
      setIsLoading(false);

      if (data) {
        const toastMessage = executePolicyAfterCreation
          ? i18n.translate(
              'xpack.idxMgmt.enrichPoliciesCreate.createAndExecuteNotificationMessage',
              {
                defaultMessage: 'Created and executed policy: {policyName}',
                values: { policyName: draft.name },
              }
            )
          : i18n.translate('xpack.idxMgmt.enrichPoliciesCreate.createNotificationMessage', {
              defaultMessage: 'Created policy: {policyName}',
              values: { policyName: draft.name },
            });

        notificationService.showSuccessToast(toastMessage);
      }

      if (error) {
        setCreateError(error);
        return;
      }

      history.push('/enrich_policies');
    },
    [draft, history, setIsLoading, setCreateError, notificationService]
  );

  const changeCurrentStepTo = useCallback(
    (step: number) => {
      setCurrentStep(step);
      setCreateError(null);
    },
    [setCurrentStep, setCreateError]
  );

  const stepDefinitions = useMemo(
    () => [
      {
        step: CONFIGURATION,
        title: i18n.translate('xpack.idxMgmt.enrichPolicyCreate.configurationStepLabel', {
          defaultMessage: 'Configuration',
        }),
        status: completionState.configurationStep ? 'complete' : getStepStatus(CONFIGURATION),
        children: currentStep === CONFIGURATION && (
          <ConfigurationStep onNext={() => changeCurrentStepTo(FIELD_SELECTION)} />
        ),
      },
      {
        step: FIELD_SELECTION,
        title: i18n.translate('xpack.idxMgmt.enrichPolicyCreate.fieldSelectionStepLabel', {
          defaultMessage: 'Field selection',
        }),
        status: completionState.fieldsSelectionStep ? 'complete' : getStepStatus(FIELD_SELECTION),
        children: currentStep === FIELD_SELECTION && (
          <FieldSelectionStep
            onNext={() => changeCurrentStepTo(CREATE)}
            onBack={() => changeCurrentStepTo(CONFIGURATION)}
          />
        ),
      },
      {
        step: CREATE,
        title: i18n.translate('xpack.idxMgmt.enrichPolicyCreate.createStepLabel', {
          defaultMessage: 'Create',
        }),
        status: (currentStep === CREATE ? 'current' : 'incomplete') as EuiStepStatus,
        children: currentStep === CREATE && (
          <CreateStep
            onSubmit={onSubmit}
            isLoading={isLoading}
            onBack={() => changeCurrentStepTo(FIELD_SELECTION)}
          />
        ),
      },
    ],
    [currentStep, changeCurrentStepTo, completionState, getStepStatus, isLoading, onSubmit]
  );

  return (
    <>
      {createError && (
        <>
          <EuiCallOut
            title={i18n.translate('xpack.idxMgmt.enrichPolicyCreate.errorTitle', {
              defaultMessage: 'Unable to create your policy',
            })}
            color="danger"
            iconType="error"
            data-test-subj="errorWhenCreatingCallout"
          >
            <p className="eui-textBreakWord">{createError?.message || createError?.error}</p>
          </EuiCallOut>
          <EuiSpacer size="xl" />
        </>
      )}
      <EuiSteps steps={stepDefinitions} />
    </>
  );
};
