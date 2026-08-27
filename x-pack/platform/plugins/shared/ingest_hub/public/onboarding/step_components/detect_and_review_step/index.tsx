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
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';

import { AWS_SERVICES_MAP } from '../../aws_service_matrix';
import { useOnboardingFlow } from '../../onboarding_flow_context';
import type { ServiceChipState } from '../../onboarding_flow_context';
import {
  SERVICE_SETTINGS_SESSION_KEY,
  type ServiceInstance,
  type ServiceSettingsPersistedState,
} from '../service_settings_step/use_service_settings';
import { useEcfDeployment, EcfDeploymentSection } from '../ecf_deployment_section';

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

interface DetectAndReviewStepProps {
  onContinue: () => void;
  onBack?: () => void;
}

export function DetectAndReviewStep({ onContinue, onBack }: DetectAndReviewStepProps) {
  const { services } = useKibana<CoreStart & { cloud?: CloudStart }>();
  const { detectAndReviewStep } = useOnboardingFlow();
  const { serviceStatuses } = detectAndReviewStep;

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

  const hasStarted = agentlessStatuses.length > 0;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div data-test-subj="onboardingStep-detect-and-review">
      {/* ── ECF section ─────────────────────────────────────────────────── */}
      {hasAnyEcf && <EcfDeploymentSection {...sectionProps} />}
      {hasAnyEcf && hasStarted && <EuiHorizontalRule />}

      {/* ── Agentless status chips ───────────────────────────────────────── */}
      {hasStarted && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup wrap gutterSize="s" data-test-subj="detectAndReviewStep-serviceChips">
            {agentlessStatuses.map(([instanceId, state]) => (
              <EuiFlexItem grow={false} key={instanceId}>
                <EuiBadge color={CHIP_COLORS[state]}>{getChipLabel(instanceId)}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      )}

      {/* ── Navigation ──────────────────────────────────────────────────── */}
      {(onBack || hasStarted || hasAnyEcf) && (
        <>
          <EuiSpacer size="l" />
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
              {(hasStarted || hasAnyEcf) && (
                <EuiButton
                  fill
                  onClick={onContinue}
                  data-test-subj="detectAndReviewStep-continueButton"
                >
                  <FormattedMessage
                    id="xpack.ingestHub.detectAndReviewStep.continueButton"
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
