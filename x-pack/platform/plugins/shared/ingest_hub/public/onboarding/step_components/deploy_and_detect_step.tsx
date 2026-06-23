/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
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
  const { isDeploying, packageStatuses } = deployStep;

  const hasStarted = Object.keys(packageStatuses).length > 0;

  const failedPackages = useMemo(
    () =>
      Object.entries(packageStatuses)
        .filter(([, s]) => s.status === 'error')
        .map(([pkg]) => pkg),
    [packageStatuses]
  );

  const succeededPackages = useMemo(
    () =>
      Object.entries(packageStatuses)
        .filter(([, s]) => s.status === 'success')
        .map(([pkg]) => pkg),
    [packageStatuses]
  );

  const allSucceeded = hasStarted && !isDeploying && failedPackages.length === 0;

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
          {succeededPackages.map((pkg) => (
            <EuiFlexGroup key={pkg} alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="checkInCircleFilled" color="success" aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>{pkg}</strong>
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
                {failedPackages.map((pkg) => {
                  const errorMessage = packageStatuses[pkg]?.errorMessage;
                  return (
                    <EuiText key={pkg} size="s">
                      <strong>{pkg}</strong>
                      {errorMessage && `: ${errorMessage}`}
                    </EuiText>
                  );
                })}
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
