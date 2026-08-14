/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useMemo, useState } from 'react';
import { EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { CloudSetupForCloudConnector } from '@kbn/fleet-plugin/public';
import { LazyAwsConnectSetup } from '@kbn/fleet-plugin/public';
import { AWS_SERVICES_MAP } from '../aws_service_matrix';
import { useOnboardingFlow } from '../onboarding_flow_context';
import { useDeploy } from './authenticate_and_deploy_step/use_deploy';
import {
  DeploymentMethodCard,
  type DeploymentMethod,
} from './authenticate_and_deploy_step/deployment_method_card';

interface AuthenticateAndDeployStepProps {
  onContinue: () => void;
  onBack?: () => void;
}

export function AuthenticateAndDeployStep({ onContinue, onBack }: AuthenticateAndDeployStepProps) {
  const { services } = useKibana<CoreStart & { cloud?: CloudStart }>();
  const { authenticateAndDeployStep, setConnectorId, setStaticKeys, servicesStep } =
    useOnboardingFlow();
  const { selectedServiceIds } = servicesStep;

  const [deploymentMethod, setDeploymentMethod] =
    useState<DeploymentMethod>('managed_integrations');

  const { handleDeploy } = useDeploy({ onContinue });

  const showIdentityFederation = useMemo(() => {
    if (selectedServiceIds.length === 0) return true;
    return selectedServiceIds.every(
      (id) => AWS_SERVICES_MAP.get(id)?.identityFederationSupported === true
    );
  }, [selectedServiceIds]);

  return (
    <div data-test-subj="onboardingStep-authenticate-and-deploy">
      <DeploymentMethodCard selectedMethod={deploymentMethod} onChange={setDeploymentMethod} />
      <EuiSpacer size="l" />
      <Suspense
        fallback={
          <EuiLoadingSpinner data-test-subj="onboardingStep-authenticate-and-deploy-loading" />
        }
      >
        <LazyAwsConnectSetup
          cloud={services.cloud as CloudSetupForCloudConnector | undefined}
          initialConnectorId={authenticateAndDeployStep.connectorId}
          initialStaticKeys={authenticateAndDeployStep.staticKeys}
          showIdentityFederation={showIdentityFederation}
          onBack={onBack}
          onContinue={() => handleDeploy()}
          continueButtonLabel={
            <FormattedMessage
              id="xpack.ingestHub.authenticateAndDeployStep.nextButton"
              defaultMessage="Next"
            />
          }
          onConnectorIdChange={setConnectorId}
          onStaticKeysChange={setStaticKeys}
        />
      </Suspense>
    </div>
  );
}
