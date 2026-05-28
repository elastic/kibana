/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useMemo } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { CloudSetupForCloudConnector } from '@kbn/fleet-plugin/public';
import { LazyAwsConnectSetup } from '@kbn/fleet-plugin/public';
import { AWS_SERVICES_MATRIX } from '../aws_service_matrix';
import { useOnboardingFlow } from '../onboarding_flow_context';

interface ConnectStepProps {
  onNext: () => void;
}

export function ConnectStep({ onNext }: ConnectStepProps) {
  const { services } = useKibana<CoreStart & { cloud?: CloudStart }>();
  const { connectStep, setConnectorId, setStaticKeys, setTemporaryKeys, servicesStep } =
    useOnboardingFlow();

  const showIdentityFederation = useMemo(() => {
    const { selectedServiceIds } = servicesStep;
    if (selectedServiceIds.length === 0) return true;
    return selectedServiceIds.every((id) => {
      const service = AWS_SERVICES_MATRIX.find((s) => s.id === id);
      return service?.identityFederationSupported === true;
    });
  }, [servicesStep]);

  return (
    <div data-test-subj="onboardingStep-connect">
      <Suspense fallback={<EuiLoadingSpinner data-test-subj="onboardingStep-connect-loading" />}>
        <LazyAwsConnectSetup
          cloud={services.cloud as CloudSetupForCloudConnector | undefined}
          initialConnectorId={connectStep.connectorId}
          initialStaticKeys={connectStep.staticKeys}
          initialTemporaryKeys={connectStep.temporaryKeys}
          showIdentityFederation={showIdentityFederation}
          onNext={onNext}
          onConnectorIdChange={setConnectorId}
          onStaticKeysChange={setStaticKeys}
          onTemporaryKeysChange={setTemporaryKeys}
        />
      </Suspense>
    </div>
  );
}
