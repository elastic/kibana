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
import { AwsPermissionsViewer } from './aws_permissions_viewer';
import { useIamPermissions } from '../use_iam_permissions';

interface DeploySettingsStepProps {
  onNext: () => void;
  onBack?: () => void;
}

export function DeploySettingsStep({ onNext, onBack }: DeploySettingsStepProps) {
  const { services } = useKibana<CoreStart & { cloud?: CloudStart }>();
  const { connectStep, setConnectorId, setStaticKeys, servicesStep } = useOnboardingFlow();
  const { selectedServiceIds } = servicesStep;

  const showIdentityFederation = useMemo(() => {
    if (selectedServiceIds.length === 0) return true;
    return selectedServiceIds.every(
      (id) => AWS_SERVICES_MAP.get(id)?.identityFederationSupported === true
    );
  }, [selectedServiceIds]);

  // Fetch IAM permissions from the server endpoint.
  const { data: iamPermissions } = useIamPermissions(selectedServiceIds);

  // Display names for the per-service toggle in the permissions viewer dropdown.
  const viewerServices = useMemo(
    () =>
      selectedServiceIds
        .map((id) => {
          const entry = AWS_SERVICES_MAP.get(id);
          return entry ? { id, name: entry.name } : null;
        })
        .filter((s): s is { id: string; name: string } => s !== null),
    [selectedServiceIds]
  );

  // Render the viewer only once the endpoint has responded; until then show nothing.
  const staticKeysContent = useMemo(() => {
    if (!iamPermissions) return null;
    return (
      <AwsPermissionsViewer
        merged={iamPermissions.merged}
        byService={iamPermissions.byService}
        services={viewerServices}
      />
    );
  }, [iamPermissions, viewerServices]);

  return (
    <div data-test-subj="onboardingStep-deploy-settings">
      {onBack && (
        <>
          <EuiButtonEmpty iconType="arrowLeft" iconSide="left" onClick={onBack}>
            <FormattedMessage
              id="xpack.ingestHub.deploySettingsStep.backButton"
              defaultMessage="Back"
            />
          </EuiButtonEmpty>
          <EuiSpacer size="m" />
        </>
      )}
      <Suspense
        fallback={<EuiLoadingSpinner data-test-subj="onboardingStep-deploy-settings-loading" />}
      >
        <LazyAwsConnectSetup
          cloud={services.cloud as CloudSetupForCloudConnector | undefined}
          initialConnectorId={connectStep.connectorId}
          initialStaticKeys={connectStep.staticKeys}
          showIdentityFederation={showIdentityFederation}
          staticKeysContent={staticKeysContent}
          onNext={onNext}
          onConnectorIdChange={setConnectorId}
          onStaticKeysChange={setStaticKeys}
        />
      </Suspense>
    </div>
  );
}
