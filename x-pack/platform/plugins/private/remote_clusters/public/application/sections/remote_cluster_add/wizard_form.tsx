/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiStepsHorizontal, EuiStepStatus, EuiSpacer, EuiPageSection } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { RemoteClusterSetupTrust, RemoteClusterForm } from '../components';
import { ClusterPayload } from '../../../../common/lib/cluster_serialization';
import { RemoteClusterReview } from '../components/remote_cluster_config_steps/remote_cluster_review';

const SETUP_TRUST = 1;
const CONFIGURE_CONNECTION = 2;
const REVIEW = 3;

const FORM_MAX_WIDTH = 850;

interface Props {
  saveRemoteClusterConfig: (config: ClusterPayload) => void;
  onCancel: () => void;
  addClusterError: { message: string } | undefined;
  isSaving: boolean;
}

export const RemoteClusterWizard = ({
  saveRemoteClusterConfig,
  onCancel,
  isSaving,
  addClusterError,
}: Props) => {
  const [formState, setFormState] = useState<ClusterPayload>();
  const [formHasErrors, setFormHasErrors] = useState(false);
  const [currentStep, setCurrentStep] = useState(SETUP_TRUST);
  const [securityModel, setSecurityModel] = useState('');

  const stepDefinitions = useMemo(
    () => [
      {
        step: SETUP_TRUST,
        title: i18n.translate('xpack.remoteClusters.clusterWizard.selectConnectionTypeLabel', {
          defaultMessage: 'Select connection type',
        }),
        status: (currentStep === SETUP_TRUST ? 'current' : 'complete') as EuiStepStatus,
        onClick: () => setCurrentStep(SETUP_TRUST),
      },
      {
        step: CONFIGURE_CONNECTION,
        title: i18n.translate('xpack.remoteClusters.clusterWizard.addConnectionInfoLabel', {
          defaultMessage: 'Add connection information',
        }),
        disabled: !securityModel,
        status: (currentStep === CONFIGURE_CONNECTION ? 'current' : 'complete') as EuiStepStatus,
        onClick: () => setCurrentStep(CONFIGURE_CONNECTION),
      },
      {
        step: REVIEW,
        title: i18n.translate('xpack.remoteClusters.clusterWizard.confirmSetup', {
          defaultMessage: 'Confirm setup',
        }),
        disabled: !formState || formHasErrors,
        status: (currentStep === REVIEW ? 'current' : 'incomplete') as EuiStepStatus,
        onClick: () => setCurrentStep(REVIEW),
      },
    ],
    [currentStep, formHasErrors, formState, securityModel]
  );

  const completeTrustStep = (model: string) => {
    setSecurityModel(model);
    setCurrentStep(CONFIGURE_CONNECTION);
  };
  const onSecurityUpdate = (model: string) => {
    if (securityModel !== '') {
      setSecurityModel(model);
    }
  };

  // Upon finalizing configuring the connection, we need to temporarily store the
  // cluster configuration so that we can persist it when the user completes the
  // trust step.
  const completeConfigStep = (clusterConfig: ClusterPayload) => {
    setFormState(clusterConfig);
    setCurrentStep(REVIEW);
  };

  const onConfigUpdate = (clusterConfig: ClusterPayload, hasErrors: boolean) => {
    if (formState !== undefined) {
      setFormState(clusterConfig);
      setFormHasErrors(hasErrors);
    }
  };

  const completeReviewStep = () => {
    saveRemoteClusterConfig(formState as ClusterPayload);
  };

  return (
    <EuiPageSection restrictWidth={FORM_MAX_WIDTH}>
      <EuiStepsHorizontal steps={stepDefinitions} />
      <EuiSpacer size="xl" />

      {/*
        Instead of unmounting the Form, we toggle its visibility not to lose the form
        state when moving to the next step.
      */}
      {currentStep === SETUP_TRUST && (
        <RemoteClusterSetupTrust
          next={completeTrustStep}
          currentSecurityModel={securityModel}
          onSecurityChange={onSecurityUpdate}
        />
      )}

      <div style={{ display: currentStep === CONFIGURE_CONNECTION ? 'block' : 'none' }}>
        <RemoteClusterForm
          confirmFormAction={completeConfigStep}
          onBack={() => setCurrentStep(SETUP_TRUST)}
          onConfigChange={onConfigUpdate}
          confirmFormText={
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.nextButtonLabel"
              defaultMessage="Next"
            />
          }
          backFormText={
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.backButtonLabel"
              defaultMessage="Back"
            />
          }
        />
      </div>
      <div style={{ display: currentStep === REVIEW ? 'block' : 'none' }}>
        {formState && (
          <RemoteClusterReview
            onBack={() => setCurrentStep(CONFIGURE_CONNECTION)}
            isSaving={isSaving}
            saveError={addClusterError}
            onSubmit={completeReviewStep}
            cluster={formState}
            securityModel={securityModel}
          />
        )}
      </div>
    </EuiPageSection>
  );
};
