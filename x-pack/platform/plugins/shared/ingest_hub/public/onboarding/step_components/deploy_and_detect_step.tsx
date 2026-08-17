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
  EuiPanel,
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
import {
  getEcfServiceConfigs,
  buildEcfUnifiedCloudFormationUrl,
  buildEcfOtelCloudFormationUrl,
  buildEcfCrowdstrikeCloudFormationUrl,
} from '../ecf_cloudformation';

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
  const { deployAndDetectStep, retryDeploy } = useOnboardingFlow();
  const { isDeploying, serviceStatuses, failedInstances, deployErrors } = deployAndDetectStep;

  // Read service settings (global region + per-service vars + instances) from session storage.
  // This is the same storage key used by the Service Settings step.
  const [serviceSettings] = useSessionStorage<ServiceSettingsPersistedState>(
    SERVICE_SETTINGS_SESSION_KEY,
    DEFAULT_SERVICE_SETTINGS
  );
  const { globalRegion, serviceVars } = serviceSettings ?? DEFAULT_SERVICE_SETTINGS;

  // Instance lookup map — used to resolve display names for deployment status chips.
  const instancesById = useMemo(() => {
    const map = new Map<string, ServiceInstance>();
    for (const inst of serviceSettings?.instances ?? []) {
      map.set(inst.instanceId, inst);
    }
    return map;
  }, [serviceSettings?.instances]);

  const getChipLabel = (instanceId: string): string => {
    const inst = instancesById.get(instanceId);
    if (inst) return inst.name;
    return AWS_SERVICES_MAP.get(instanceId)?.name ?? instanceId;
  };

  const otlpEndpoint = services.cloud?.managedOtlp?.url;

  // ── ECF section ──────────────────────────────────────────────────────────

  // Derive unique service IDs from persisted instances for ECF filtering.
  // For non-duplicate instances, instanceId === serviceId, so serviceVars lookups work correctly.
  const selectedServiceIds = useMemo(
    () => [...new Set((serviceSettings?.instances ?? []).map((i) => i.serviceId))],
    [serviceSettings?.instances]
  );

  // All ECF service configs (services with an ecfLogType)
  const allEcfConfigs = useMemo(
    () => getEcfServiceConfigs(selectedServiceIds, serviceVars),
    [selectedServiceIds, serviceVars]
  );

  // Unified ECS template services (ECF services with no dedicated template)
  const ecfUnifiedConfigs = useMemo(
    () =>
      allEcfConfigs.filter((c) => AWS_SERVICES_MAP.get(c.serviceId)?.ecfDedicatedTemplate == null),
    [allEcfConfigs]
  );

  // OTel template services
  const ecfOtelConfigs = useMemo(
    () =>
      allEcfConfigs.filter(
        (c) => AWS_SERVICES_MAP.get(c.serviceId)?.ecfDedicatedTemplate === 'otel'
      ),
    [allEcfConfigs]
  );

  // CrowdStrike FDR services (dedicated template)
  const ecfCrowdstrikeServices = useMemo(
    () =>
      selectedServiceIds.filter(
        (id) => AWS_SERVICES_MAP.get(id)?.ecfDedicatedTemplate === 'crowdstrike_fdr'
      ),
    [selectedServiceIds]
  );

  const hasEcfUnified = ecfUnifiedConfigs.length > 0;
  const hasEcfOtel = ecfOtelConfigs.length > 0;
  const hasEcfCrowdstrike = ecfCrowdstrikeServices.length > 0;
  const hasAnyEcf = hasEcfUnified || hasEcfOtel || hasEcfCrowdstrike;

  // ── Agentless section ────────────────────────────────────────────────────

  // ECF services are deployed via CloudFormation — filter them out of the agentless status chips
  // so they don't appear redundantly alongside the ECF panels above.
  const ecfServiceIds = useMemo(
    () => new Set([...allEcfConfigs.map((c) => c.serviceId), ...ecfCrowdstrikeServices]),
    [allEcfConfigs, ecfCrowdstrikeServices]
  );

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
      AWS_SERVICES_MAP.get(id)?.deliveryMethods.some((dm) => dm.method === 'agentless') ?? false
  );

  const unifiedLaunchUrl = useMemo(
    () =>
      hasEcfUnified
        ? buildEcfUnifiedCloudFormationUrl({
            ecfConfigs: ecfUnifiedConfigs,
            region: globalRegion,
            otlpEndpoint,
          })
        : undefined,
    [hasEcfUnified, ecfUnifiedConfigs, globalRegion, otlpEndpoint]
  );

  const otelLaunchUrl = useMemo(
    () =>
      hasEcfOtel
        ? buildEcfOtelCloudFormationUrl({
            ecfConfigs: ecfOtelConfigs,
            region: globalRegion,
            otlpEndpoint,
          })
        : undefined,
    [hasEcfOtel, ecfOtelConfigs, globalRegion, otlpEndpoint]
  );

  const crowdstrikeLaunchUrl = useMemo(
    () =>
      hasEcfCrowdstrike
        ? buildEcfCrowdstrikeCloudFormationUrl({ region: globalRegion, otlpEndpoint })
        : undefined,
    [hasEcfCrowdstrike, globalRegion, otlpEndpoint]
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div data-test-subj="onboardingStep-deploy-and-detect">
      {/* ── ECF section ─────────────────────────────────────────────────── */}
      {hasAnyEcf && (
        <>
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.ingestHub.deployAndDetectStep.ecf.title"
                defaultMessage="Elastic Cloud Forwarder"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="m" />

          {/* Unified template card */}
          {hasEcfUnified && (
            <EuiPanel
              hasBorder
              paddingSize="m"
              data-test-subj="deployAndDetectStep-ecfUnifiedPanel"
            >
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m">
                <EuiFlexItem>
                  <EuiTitle size="xs">
                    <h3>
                      <FormattedMessage
                        id="xpack.ingestHub.deployAndDetectStep.ecf.unifiedStack.title"
                        defaultMessage="Multi-service stack"
                      />
                    </h3>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s" color="subdued">
                    <FormattedMessage
                      id="xpack.ingestHub.deployAndDetectStep.ecf.unifiedStack.serviceCount"
                      defaultMessage="{count, plural, one {# service} other {# services}}"
                      values={{ count: ecfUnifiedConfigs.length }}
                    />
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                <p>
                  <FormattedMessage
                    id="xpack.ingestHub.deployAndDetectStep.ecf.unifiedStack.description"
                    defaultMessage="Log collection via a single AWS CloudFormation stack — no agents required. Trigger source (S3 or CloudWatch) is configured per service in Service settings."
                  />
                </p>
              </EuiText>
              <EuiSpacer size="m" />
              <EuiButton
                href={unifiedLaunchUrl}
                target="_blank"
                iconType="external"
                iconSide="right"
                fill
                data-test-subj="deployAndDetectStep-ecfUnifiedLaunchButton"
              >
                <FormattedMessage
                  id="xpack.ingestHub.deployAndDetectStep.ecf.unifiedStack.launchButton"
                  defaultMessage="Launch CloudFormation"
                />
              </EuiButton>
              <EuiHorizontalRule margin="m" />
              <EuiFlexGroup wrap gutterSize="s">
                {ecfUnifiedConfigs.map(({ serviceId }) => (
                  <EuiFlexItem grow={false} key={serviceId}>
                    <EuiBadge color="hollow">
                      {AWS_SERVICES_MAP.get(serviceId)?.name ?? serviceId}
                    </EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiPanel>
          )}

          {/* OTel template card */}
          {hasEcfOtel && (
            <>
              {hasEcfUnified && <EuiSpacer size="s" />}
              <EuiPanel hasBorder paddingSize="m" data-test-subj="deployAndDetectStep-ecfOtelPanel">
                <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m">
                  <EuiFlexItem>
                    <EuiTitle size="xs">
                      <h3>
                        <FormattedMessage
                          id="xpack.ingestHub.deployAndDetectStep.ecf.otelStack.title"
                          defaultMessage="OpenTelemetry stack"
                        />
                      </h3>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s" color="subdued">
                      <FormattedMessage
                        id="xpack.ingestHub.deployAndDetectStep.ecf.otelStack.serviceCount"
                        defaultMessage="{count, plural, one {# service} other {# services}}"
                        values={{ count: ecfOtelConfigs.length }}
                      />
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <EuiText size="s" color="subdued">
                  <p>
                    <FormattedMessage
                      id="xpack.ingestHub.deployAndDetectStep.ecf.otelStack.description"
                      defaultMessage="Log collection in OpenTelemetry format via a single AWS CloudFormation stack — no agents required. Trigger source (S3 or CloudWatch) is configured per service in Service settings."
                    />
                  </p>
                </EuiText>
                <EuiSpacer size="m" />
                <EuiButton
                  href={otelLaunchUrl}
                  target="_blank"
                  iconType="external"
                  iconSide="right"
                  fill
                  data-test-subj="deployAndDetectStep-ecfOtelLaunchButton"
                >
                  <FormattedMessage
                    id="xpack.ingestHub.deployAndDetectStep.ecf.otelStack.launchButton"
                    defaultMessage="Launch CloudFormation"
                  />
                </EuiButton>
                <EuiHorizontalRule margin="m" />
                <EuiFlexGroup wrap gutterSize="s">
                  {ecfOtelConfigs.map(({ serviceId }) => (
                    <EuiFlexItem grow={false} key={serviceId}>
                      <EuiBadge color="hollow">
                        {AWS_SERVICES_MAP.get(serviceId)?.name ?? serviceId}
                      </EuiBadge>
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </EuiPanel>
            </>
          )}

          {/* CrowdStrike FDR dedicated template card */}
          {hasEcfCrowdstrike && (
            <>
              {(hasEcfUnified || hasEcfOtel) && <EuiSpacer size="s" />}
              <EuiPanel
                hasBorder
                paddingSize="m"
                data-test-subj="deployAndDetectStep-ecfCrowdstrikePanel"
              >
                <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m">
                  <EuiFlexItem>
                    <EuiTitle size="xs">
                      <h3>
                        <FormattedMessage
                          id="xpack.ingestHub.deployAndDetectStep.ecf.crowdstrikeStack.title"
                          defaultMessage="CrowdStrike FDR stack"
                        />
                      </h3>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s" color="subdued">
                      <FormattedMessage
                        id="xpack.ingestHub.deployAndDetectStep.ecf.crowdstrikeStack.serviceCount"
                        defaultMessage="{count, plural, one {# service} other {# services}}"
                        values={{ count: ecfCrowdstrikeServices.length }}
                      />
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <EuiText size="s" color="subdued">
                  <p>
                    <FormattedMessage
                      id="xpack.ingestHub.deployAndDetectStep.ecf.crowdstrikeStack.description"
                      defaultMessage="Log collection via a dedicated AWS CloudFormation stack for CrowdStrike Falcon Data Replicator — no agents required."
                    />
                  </p>
                </EuiText>
                <EuiSpacer size="m" />
                <EuiButton
                  href={crowdstrikeLaunchUrl}
                  target="_blank"
                  iconType="external"
                  iconSide="right"
                  fill
                  data-test-subj="deployAndDetectStep-ecfCrowdstrikeLaunchButton"
                >
                  <FormattedMessage
                    id="xpack.ingestHub.deployAndDetectStep.ecf.crowdstrikeStack.launchButton"
                    defaultMessage="Launch CloudFormation"
                  />
                </EuiButton>
                <EuiHorizontalRule margin="m" />
                <EuiFlexGroup wrap gutterSize="s">
                  {ecfCrowdstrikeServices.map((serviceId) => (
                    <EuiFlexItem grow={false} key={serviceId}>
                      <EuiBadge color="hollow">
                        {AWS_SERVICES_MAP.get(serviceId)?.name ?? serviceId}
                      </EuiBadge>
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </EuiPanel>
            </>
          )}

          {hasAgentlessServices && <EuiHorizontalRule />}
        </>
      )}

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
          {isDeploying && <EuiSpacer size="m" />}
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
      {(onBack || allAgentlessSucceeded) && (
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
              {allAgentlessSucceeded && (
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
