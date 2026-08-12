/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import { AWS_SERVICES_MAP } from '../aws_service_matrix';
import { useOnboardingFlow } from '../onboarding_flow_context';
import type { ServiceChipState } from '../onboarding_flow_context';
import { SERVICE_SETTINGS_SESSION_KEY } from './service_settings_step/use_service_settings';
import type { ServiceInstance } from './service_settings_step/use_service_settings';

const CHIP_COLORS: Record<ServiceChipState, string> = {
  instantiating: 'default',
  detecting: 'primary',
  receiving: 'success',
  error: 'danger',
  timeout: 'warning',
};

interface DeployAndDetectStepProps {
  onContinue: () => void;
  onBack?: () => void;
}

export function DeployAndDetectStep({ onContinue, onBack }: DeployAndDetectStepProps) {
  const { deployAndDetectStep, retryDeploy } = useOnboardingFlow();
  const { isDeploying, serviceStatuses, failedInstances, deployErrors } = deployAndDetectStep;

  const [serviceSettings] = useSessionStorage<{ instances?: ServiceInstance[] }>(
    SERVICE_SETTINGS_SESSION_KEY,
    {}
  );
  const instancesById = React.useMemo(() => {
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

  const hasStarted = Object.keys(serviceStatuses).length > 0;
  const allSucceeded =
    hasStarted &&
    !isDeploying &&
    failedInstances.length === 0 &&
    Object.values(serviceStatuses).some((s) => s === 'receiving');

  return (
    <div data-test-subj="onboardingStep-deploy-and-detect">
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
            {Object.entries(serviceStatuses).map(([instanceId, state]) => (
              <EuiFlexItem grow={false} key={instanceId}>
                <EuiBadge color={CHIP_COLORS[state]}>{getChipLabel(instanceId)}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>

          {!isDeploying && failedInstances.length > 0 && (
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
                {failedInstances.map((instanceId) => (
                  <EuiText key={instanceId} size="s">
                    {deployErrors[instanceId] ?? getChipLabel(instanceId)}
                  </EuiText>
                ))}
                <EuiSpacer size="s" />
                <EuiButton
                  size="s"
                  color="danger"
                  onClick={() => retryDeploy(failedInstances)}
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

      {(onBack || allSucceeded) && (
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
              {allSucceeded && (
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
