/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useOnboardingFlow } from '../onboarding_flow_context';

interface DeployAndDetectStepProps {
  onContinue: () => void;
  onBack?: () => void;
}

export function DeployAndDetectStep({ onContinue, onBack }: DeployAndDetectStepProps) {
  const { deployStep, retryDeploy } = useOnboardingFlow();
  const { isDeploying, serviceStatuses, failedPackages } = deployStep;

  const hasStarted = Object.keys(serviceStatuses).length > 0;
  const allSucceeded = hasStarted && !isDeploying && failedPackages.length === 0;

  const succeededServiceIds = Object.entries(serviceStatuses)
    .filter(([, state]) => state !== 'error')
    .map(([id]) => id);

  return (
    <div data-test-subj="onboardingStep-deploy-and-detect">
      {onBack && (
        <>
          <EuiButtonEmpty iconType="arrowLeft" iconSide="left" onClick={onBack}>
            <FormattedMessage
              id="xpack.ingestHub.deployAndDetectStep.backButton"
              defaultMessage="Back"
            />
          </EuiButtonEmpty>
          <EuiSpacer size="m" />
        </>
      )}

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

      {!isDeploying && hasStarted && (
        <>
          {succeededServiceIds.map((serviceId) => (
            <EuiFlexGroup key={serviceId} alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="checkInCircleFilled" color="success" aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>{serviceId}</strong>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          ))}

          {failedPackages.length > 0 && (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut
                title={
                  <FormattedMessage
                    id="xpack.ingestHub.deployAndDetectStep.errorCallout.title"
                    defaultMessage="Deployment failed for {count, plural, one {# package} other {# packages}}"
                    values={{ count: failedPackages.length }}
                  />
                }
                color="danger"
                iconType="error"
                announceOnMount
                data-test-subj="deployAndDetectStep-errorCallout"
              >
                {failedPackages.map((pkg) => (
                  <EuiText key={pkg} size="s">
                    <strong>{pkg}</strong>
                  </EuiText>
                ))}
                <EuiSpacer size="s" />
                <EuiButton
                  size="s"
                  color="danger"
                  onClick={() => retryDeploy(failedPackages)}
                  data-test-subj="deployAndDetectStep-retryButton"
                >
                  <FormattedMessage
                    id="xpack.ingestHub.deployAndDetectStep.retryButton"
                    defaultMessage="Retry failed"
                  />
                </EuiButton>
              </EuiCallOut>
            </>
          )}
        </>
      )}

      {allSucceeded && (
        <>
          <EuiSpacer size="l" />
          <EuiButton fill onClick={onContinue} data-test-subj="deployAndDetectStep-continueButton">
            <FormattedMessage
              id="xpack.ingestHub.deployAndDetectStep.continueButton"
              defaultMessage="Continue"
            />
          </EuiButton>
        </>
      )}
    </div>
  );
}
