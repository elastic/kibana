/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useOnboardingFlow } from '../onboarding_flow_context';
import {
  DeploymentMethodCard,
  type DeploymentMethod,
} from './authenticate_and_deploy_step/deployment_method_card';
import { ManagedIntegrationsSection } from './authenticate_and_deploy_step/managed_integrations_section';

interface AuthenticateAndDeployStepProps {
  onContinue: () => void;
  onBack?: () => void;
}

export function AuthenticateAndDeployStep({ onContinue, onBack }: AuthenticateAndDeployStepProps) {
  const { servicesStep, awsServicesMap } = useOnboardingFlow();
  const { selectedServiceIds } = servicesStep;

  const [deploymentMethod, setDeploymentMethod] =
    useState<DeploymentMethod>('managed_integrations');

  const miServiceIds = useMemo(
    () =>
      selectedServiceIds.filter((id) =>
        awsServicesMap?.get(id)?.deploymentMethods.some((dm) => dm.method === 'managed_integration')
      ),
    [selectedServiceIds, awsServicesMap]
  );

  const showIdentityFederation = useMemo(() => {
    if (miServiceIds.length === 0) return true;
    return miServiceIds.every(
      (id) => awsServicesMap?.get(id)?.identityFederationSupported !== false
    );
  }, [miServiceIds, awsServicesMap]);

  return (
    <div data-test-subj="onboardingStep-authenticate-and-deploy">
      <DeploymentMethodCard selectedMethod={deploymentMethod} onChange={setDeploymentMethod} />

      {miServiceIds.length > 0 && <EuiHorizontalRule margin="l" />}

      {miServiceIds.length > 0 && (
        <ManagedIntegrationsSection
          serviceCount={miServiceIds.length}
          showIdentityFederation={showIdentityFederation}
        />
      )}

      <EuiSpacer size="l" />

      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          {onBack && (
            <EuiButtonEmpty iconType="chevronSingleLeft" iconSide="left" onClick={onBack}>
              <FormattedMessage
                id="xpack.ingestHub.authenticateAndDeployStep.backButton"
                defaultMessage="Back"
              />
            </EuiButtonEmpty>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            onClick={onContinue}
            data-test-subj="authenticateAndDeployStep-nextButton"
          >
            <FormattedMessage
              id="xpack.ingestHub.authenticateAndDeployStep.nextButton"
              defaultMessage="Next"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
