/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';

import { useGetPackageInfoByKeyQuery } from '@kbn/fleet-plugin/public';
import type { EsAssetReference, KibanaAssetReference } from '@kbn/fleet-plugin/common';
import { useOnboardingFlow } from '../../onboarding_flow_context';
import {
  SERVICE_SETTINGS_SESSION_KEY,
  type ServiceSettingsPersistedState,
} from '../service_settings_step/use_service_settings';
import { useServiceDataDetection } from './use_service_data_detection';
import { DeploymentSummary } from './deployment_summary';
import { AgentSetupCallout } from './agent_setup_callout';
import { InstalledContent } from './installed_content';

const DEFAULT_SERVICE_SETTINGS: ServiceSettingsPersistedState = {
  globalRegion: '',
  serviceVars: {},
};

interface DetectAndReviewStepProps {
  onContinue: () => void;
  onBack?: () => void;
}

export function DetectAndReviewStep({ onContinue, onBack }: DetectAndReviewStepProps) {
  useKibana<CoreStart & { cloud?: CloudStart }>();

  const { servicesStep, awsServicesMap, deploymentMethod } = useOnboardingFlow();
  const { selectedServiceIds } = servicesStep;

  const [serviceSettings] = useSessionStorage<ServiceSettingsPersistedState>(
    SERVICE_SETTINGS_SESSION_KEY,
    DEFAULT_SERVICE_SETTINGS
  );

  // Build a display name map: instanceId → name from settings, falling back to matrix name.
  const serviceNames: Record<string, string> = useMemo(() => {
    const names: Record<string, string> = {};
    for (const id of selectedServiceIds) {
      const entry = awsServicesMap?.get(id);
      names[id] = entry?.name ?? id;
    }
    // Also include instances from session storage (for duplicates with custom names).
    for (const inst of serviceSettings?.instances ?? []) {
      names[inst.instanceId] = inst.name;
    }
    return names;
  }, [selectedServiceIds, awsServicesMap, serviceSettings]);

  const { statusByInstanceId, receivingCount, totalCount } = useServiceDataDetection();

  // Installed content — read from AWS package installation.
  const { data: awsPackageData } = useGetPackageInfoByKeyQuery('aws', undefined, { full: true });
  const installationInfo = awsPackageData?.item?.installationInfo;
  const installedKibana: KibanaAssetReference[] = installationInfo?.installed_kibana ?? [];
  const installedEs: EsAssetReference[] = installationInfo?.installed_es ?? [];

  const hasDeployedServices = selectedServiceIds.length > 0;

  return (
    <div data-test-subj="onboardingStep-detect-and-review">
      {/* ── Step header ─────────────────────────────────────────────────────── */}
      <EuiTitle size="s">
        <h2>
          <FormattedMessage
            id="xpack.ingestHub.detectAndReviewStep.title"
            defaultMessage="Detect & Review"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText color="subdued">
        <p>
          <FormattedMessage
            id="xpack.ingestHub.detectAndReviewStep.subtitle"
            defaultMessage="Review your deployment and the prebuilt content installed for your services — keep what you need, remove the rest."
          />
        </p>
      </EuiText>
      <EuiSpacer size="l" />

      {/* ── Agent setup callout (agent_based only) ───────────────────────── */}
      {deploymentMethod === 'agent_based' && (
        <>
          <AgentSetupCallout />
          <EuiSpacer size="l" />
        </>
      )}

      {/* ── Deployment summary ───────────────────────────────────────────── */}
      {hasDeployedServices && (
        <>
          <DeploymentSummary
            selectedServiceIds={selectedServiceIds}
            awsServicesMap={awsServicesMap}
            serviceNames={serviceNames}
            statusByInstanceId={statusByInstanceId}
            deploymentMethod={deploymentMethod}
            receivingCount={receivingCount}
            totalCount={totalCount}
          />
          <EuiHorizontalRule />
        </>
      )}

      {/* ── Installed content ────────────────────────────────────────────── */}
      {(installedKibana.length > 0 || installedEs.length > 0) && (
        <>
          <InstalledContent installedKibana={installedKibana} installedEs={installedEs} />
          <EuiSpacer size="l" />
        </>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          {onBack && (
            <EuiButtonEmpty iconType="chevronSingleLeft" iconSide="left" onClick={onBack}>
              <FormattedMessage
                id="xpack.ingestHub.detectAndReviewStep.backButton"
                defaultMessage="Back"
              />
            </EuiButtonEmpty>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            iconType="sortRight"
            iconSide="right"
            onClick={onContinue}
            data-test-subj="detectAndReviewStep-continueButton"
          >
            <FormattedMessage
              id="xpack.ingestHub.detectAndReviewStep.continueButton"
              defaultMessage="Take me to my data"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
