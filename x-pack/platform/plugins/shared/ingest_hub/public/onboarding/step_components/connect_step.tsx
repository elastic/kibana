/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { CloudSetupForCloudConnector } from '@kbn/fleet-plugin/public';
import { LazyAwsConnectSetup } from '@kbn/fleet-plugin/public';
import { useOnboardingFlow } from '../onboarding_flow_context';

interface ConnectStepProps {
  onNext: () => void;
}

export function ConnectStep({ onNext }: ConnectStepProps) {
  const { services } = useKibana<CoreStart & { cloud?: CloudStart }>();
  const { connectStep, setConnectorId, setStaticKeys, setTemporaryKeys } = useOnboardingFlow();

  return (
    <div data-test-subj="onboardingStep-connect">
      <Suspense fallback={<EuiLoadingSpinner data-test-subj="onboardingStep-connect-loading" />}>
        <LazyAwsConnectSetup
          cloud={services.cloud as CloudSetupForCloudConnector | undefined}
          initialConnectorId={connectStep.connectorId}
          initialStaticKeys={connectStep.staticKeys}
          initialTemporaryKeys={connectStep.temporaryKeys}
          onNext={onNext}
          onConnectorIdChange={setConnectorId}
          onStaticKeysChange={setStaticKeys}
          onTemporaryKeysChange={setTemporaryKeys}
        />
      </Suspense>
    </div>
  );
}
