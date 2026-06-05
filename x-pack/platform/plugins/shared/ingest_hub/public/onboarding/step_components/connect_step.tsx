/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useMemo } from 'react';
import { EuiButtonEmpty, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { CloudSetupForCloudConnector } from '@kbn/fleet-plugin/public';
import { LazyAwsConnectSetup } from '@kbn/fleet-plugin/public';
import { AWS_SERVICES_MAP } from '../aws_service_matrix';
import { useOnboardingFlow } from '../onboarding_flow_context';

interface ConnectStepProps {
  onNext: () => void;
  onBack?: () => void;
}

export function ConnectStep({ onNext, onBack }: ConnectStepProps) {
  const { services } = useKibana<CoreStart & { cloud?: CloudStart }>();
  const { connectStep, setConnectorId, setStaticKeys, setTemporaryKeys, servicesStep } =
    useOnboardingFlow();
  const { selectedServiceIds } = servicesStep;

  const showIdentityFederation = useMemo(() => {
    if (selectedServiceIds.length === 0) return true;
    return selectedServiceIds.every(
      (id) => AWS_SERVICES_MAP.get(id)?.identityFederationSupported === true
    );
  }, [selectedServiceIds]);

  return (
    <div data-test-subj="onboardingStep-connect">
      {onBack && (
        <>
          <EuiButtonEmpty iconType="arrowLeft" iconSide="left" onClick={onBack}>
            <FormattedMessage id="xpack.ingestHub.connectStep.backButton" defaultMessage="Back" />
          </EuiButtonEmpty>
          <EuiSpacer size="m" />
        </>
      )}
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
