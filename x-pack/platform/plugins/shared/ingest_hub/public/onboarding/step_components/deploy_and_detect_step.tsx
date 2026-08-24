/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';

import { AWS_SERVICES_MAP } from '../aws_service_matrix';
import { useOnboardingFlow } from '../onboarding_flow_context';
import type { ServiceChipState } from '../onboarding_flow_context';
import {
  SERVICE_SETTINGS_SESSION_KEY,
  type ServiceInstance,
  type ServiceSettingsPersistedState,
} from './service_settings_step/use_service_settings';
import { useEcfDeployment, EcfDeploymentSection } from './ecf_deployment_section';

const CHIP_COLORS: Record<ServiceChipState, string> = {
  instantiating: 'default',
  detecting: 'primary',
  receiving: 'success',
  error: 'danger',
  timeout: 'warning',
};

const DEFAULT_SERVICE_SETTINGS: ServiceSettingsPersistedState = {
  globalRegion: '',
  serviceVars: {},
};

interface DeployAndDetectStepProps {
  onContinue: () => void;
  onBack?: () => void;
}

export function DeployAndDetectStep({ onContinue, onBack }: DeployAndDetectStepProps) {
  const { services } = useKibana<CoreStart & { cloud?: CloudStart }>();
  const { deployAndDetectStep, retryDeploy, awsServicesMap } = useOnboardingFlow();
  const { isDeploying, serviceStatuses, failedInstances, deployErrors } = deployAndDetectStep;

  // Read service settings (global region + per-instance vars + instances) from session storage.
  const [serviceSettings] = useSessionStorage<ServiceSettingsPersistedState>(
    SERVICE_SETTINGS_SESSION_KEY,
    DEFAULT_SERVICE_SETTINGS
  );
  const { globalRegion, serviceVars } = serviceSettings ?? DEFAULT_SERVICE_SETTINGS;

  const instances: ServiceInstance[] = useMemo(
    () => serviceSettings?.instances ?? [],
    [serviceSettings?.instances]
  );

  // Instance lookup map — used to resolve display names for deployment status chips.
  const instancesById = useMemo(() => {
    const map = new Map<string, ServiceInstance>();
    for (const inst of instances) {
      map.set(inst.instanceId, inst);
    }
    return map;
  }, [instances]);

  const getChipLabel = (instanceId: string): string => {
    const inst = instancesById.get(instanceId);
    if (inst) return inst.name;
    return AWS_SERVICES_MAP.get(instanceId)?.name ?? instanceId;
  };

  const otlpEndpoint = services.cloud?.managedOtlp?.url;

  // ── ECF section ──────────────────────────────────────────────────────────

  const { hasAnyEcf, ecfServiceIds, sectionProps } = useEcfDeployment({
    instances,
    serviceVars,
    globalRegion,
    otlpEndpoint,
  });

  // ── Agentless section ────────────────────────────────────────────────────

  // Unique service IDs — used to check whether any agentless services are present.
  const selectedServiceIds = useMemo(
    () => [...new Set(instances.map((i) => i.serviceId))],
    [instances]
  );

  // ECF services are deployed via CloudFormation — filter them out of the agentless status chips
  // so they don't appear redundantly alongside the ECF panels above.
  const agentlessStatuses = useMemo(
    () =>
      Object.entries(serviceStatuses).filter(([instanceId]) => {
        const serviceId = instancesById.get(instanceId)?.serviceId ?? instanceId;
        return !ecfServiceIds.has(serviceId);
      }),
    [serviceStatuses, instancesById, ecfServiceIds]
  );

  const agentlessFailedInstances = useMemo(
    () =>
      failedInstances.filter((instanceId) => {
        const serviceId = instancesById.get(instanceId)?.serviceId ?? instanceId;
        return !ecfServiceIds.has(serviceId);
      }),
    [failedInstances, instancesById, ecfServiceIds]
  );

  const hasStarted = agentlessStatuses.length > 0;
  const allAgentlessSucceeded =
    hasStarted &&
    !isDeploying &&
    agentlessFailedInstances.length === 0 &&
    agentlessStatuses.some(([, state]) => state === 'receiving');

  // Whether the agentless section has any content to show
  const hasAgentlessServices = selectedServiceIds.some(
    (id) =>
      awsServicesMap
        ?.get(id)
        ?.deploymentMethods.some((dm) => dm.method === 'managed_integration') ?? false
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div data-test-subj="onboardingStep-deploy-and-detect">
      {/* ── ECF section ─────────────────────────────────────────────────── */}
      {hasAnyEcf && <EcfDeploymentSection {...sectionProps} />}
      {hasAnyEcf && hasAgentlessServices && <EuiHorizontalRule />}

      {/* ── Agentless section ────────────────────────────────────────────── */}
      {isDeploying && (
        <EuiFlexGroup
          alignItems="center"
          gutterSize="m"
          data-test-subj="deployAndDetectStep-loading"
        >
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h2>
                <FormattedMessage
                  id="xpack.ingestHub.deployAndDetectStep.deployingTitle"
                  defaultMessage="Deploying services…"
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      {hasStarted && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup wrap gutterSize="s" data-test-subj="deployAndDetectStep-serviceChips">
            {agentlessStatuses.map(([instanceId, state]) => (
              <EuiFlexItem grow={false} key={instanceId}>
                <EuiBadge color={CHIP_COLORS[state]}>{getChipLabel(instanceId)}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>

          {!isDeploying && agentlessFailedInstances.length > 0 && (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut
                title={
                  <FormattedMessage
                    id="xpack.ingestHub.deployAndDetectStep.errorCallout.title"
                    defaultMessage="Deployment failed"
                  />
                }
                color="danger"
                iconType="error"
                announceOnMount
                data-test-subj="deployAndDetectStep-errorCallout"
              >
                {agentlessFailedInstances.map((instanceId) => (
                  <EuiText key={instanceId} size="s">
                    {deployErrors[instanceId] ?? getChipLabel(instanceId)}
                  </EuiText>
                ))}
                <EuiSpacer size="s" />
                <EuiButton
                  size="s"
                  color="danger"
                  onClick={() => retryDeploy(agentlessFailedInstances)}
                  data-test-subj="deployAndDetectStep-retryButton"
                >
                  <FormattedMessage
                    id="xpack.ingestHub.deployAndDetectStep.retryButton"
                    defaultMessage="Retry failed services"
                  />
                </EuiButton>
              </EuiCallOut>
            </>
          )}
        </>
      )}

      {/* ── Navigation ──────────────────────────────────────────────────── */}
      {/* ECF-only users have no agentless statuses, so allAgentlessSucceeded is always false for
          them. Allow continue whenever ECF services are present (user launched the CF stack) or
          all agentless services have succeeded. */}
      {(onBack || allAgentlessSucceeded || hasAnyEcf) && (
        <>
          <EuiSpacer size="l" />
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              {onBack && (
                <EuiButtonEmpty iconType="chevronSingleLeft" iconSide="left" onClick={onBack}>
                  <FormattedMessage
                    id="xpack.ingestHub.deployAndDetectStep.backButton"
                    defaultMessage="Back"
                  />
                </EuiButtonEmpty>
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {(allAgentlessSucceeded || hasAnyEcf) && (
                <EuiButton
                  fill
                  onClick={onContinue}
                  data-test-subj="deployAndDetectStep-continueButton"
                >
                  <FormattedMessage
                    id="xpack.ingestHub.deployAndDetectStep.continueButton"
                    defaultMessage="AWS Overview"
                  />
                </EuiButton>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </div>
  );
}
