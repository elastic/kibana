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
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { AWS_SERVICES_MAP } from '../aws_service_matrix';
import { useOnboardingFlow } from '../onboarding_flow_context';
import type { ServiceChipState } from '../onboarding_flow_context';
import {
  SERVICE_SETTINGS_SESSION_KEY,
  type ServiceInstance,
  type ServiceSettingsPersistedState,
} from './service_settings_step/use_service_settings';

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
  const { deployAndDetectStep } = useOnboardingFlow();
  const { serviceStatuses } = deployAndDetectStep;

  // Read instances from session storage for display-name resolution.
  const [serviceSettings] = useSessionStorage<ServiceSettingsPersistedState>(
    SERVICE_SETTINGS_SESSION_KEY,
    DEFAULT_SERVICE_SETTINGS
  );

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

  const hasStarted = Object.keys(serviceStatuses).length > 0;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div data-test-subj="onboardingStep-deploy-and-detect">
      {/* ── Agentless service status chips ──────────────────────────────────── */}
      {hasStarted && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup wrap gutterSize="s" data-test-subj="deployAndDetectStep-serviceChips">
            {Object.entries(serviceStatuses).map(([instanceId, state]) => (
              <EuiFlexItem grow={false} key={instanceId}>
                <EuiBadge color={CHIP_COLORS[state]}>{getChipLabel(instanceId)}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      )}

      {/* ── Navigation ──────────────────────────────────────────────────────── */}
      {(onBack || hasStarted) && (
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
              {hasStarted && (
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
