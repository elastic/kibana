/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  EuiButton,
  EuiFieldText,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiIconTip,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import type { AwsServiceEntry } from './aws_services_data';

type DeployPhase = 'idle' | 'deploying' | 'complete';

const REGION_OPTIONS = [
  { value: 'us-east', text: 'US-East' },
  { value: 'us-west', text: 'US-West' },
  { value: 'eu-west-1', text: 'EU-West-1' },
  { value: 'ap-southeast-1', text: 'AP-Southeast-1' },
];

const ServiceDetectionCard: React.FunctionComponent<{
  service: AwsServiceEntry;
  receiving: boolean;
}> = ({ service, receiving }) => (
  <EuiPanel hasBorder paddingSize="m">
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>
        {receiving ? (
          <EuiIcon type="checkInCircleFilled" color="success" size="l" />
        ) : (
          <EuiLoadingSpinner size="l" />
        )}
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s">
          <strong>{service.name}</strong>
        </EuiText>
        <EuiText size="xs" color="subdued">
          {receiving ? 'Receiving data' : 'Detecting data...'}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

export const StepDeployDetect: React.FunctionComponent<{
  services: AwsServiceEntry[];
}> = ({ services }) => {
  const [identityName, setIdentityName] = useState('');
  const [region, setRegion] = useState('us-east');
  const [phase, setPhase] = useState<DeployPhase>('idle');
  const [receivedCount, setReceivedCount] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    return () => timers.current.forEach((t) => window.clearTimeout(t));
  }, []);

  // Simulated deployment lifecycle for the prototype: launch -> CREATE_COMPLETE
  // -> services flip to "Receiving data" one by one.
  const onLaunch = () => {
    setPhase('deploying');
    setReceivedCount(0);
    services.forEach((_, i) => {
      timers.current.push(
        window.setTimeout(() => setReceivedCount((c) => c + 1), 4000 + i * 1500)
      );
    });
    timers.current.push(
      window.setTimeout(() => setPhase('complete'), 4000 + services.length * 1500)
    );
  };

  const allReceived = receivedCount >= services.length;

  return (
    <>
      <EuiTitle size="m">
        <h2>Deploy &amp; Detect</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>Deploy your integrations and watch as Elastic begins detecting data from your AWS account.</p>
      </EuiText>
      <EuiSpacer size="m" />

      <EuiPanel hasBorder paddingSize="l">
        <EuiFlexGroup alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="rocket" size="m" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>Elastic Cloud Forwarder</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink>{`${services.length} service${services.length === 1 ? '' : 's'}`}</EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiText size="s">
          <p>
            Log collection via a single AWS CloudFormation stack — no agents required. Trigger
            source (S3 or CloudWatch) is configured per service in Service settings. Enter a
            Federated Identity Name below, then launch CloudFormation to deploy.
          </p>
        </EuiText>
        <EuiSpacer size="m" />

        <EuiFormRow
          label={
            <span>
              Federated Identity Name{' '}
              <EuiIconTip
                content="The IAM federated identity Elastic uses to deploy the forwarder stack."
                position="right"
              />
            </span>
          }
          style={{ maxWidth: '50%' }}
          fullWidth
        >
          <EuiFieldText
            fullWidth
            placeholder="e.g.: elastic-forwarder-prod"
            value={identityName}
            onChange={(e) => setIdentityName(e.target.value)}
            disabled={phase !== 'idle'}
            data-test-subj="awsOnboardingIdentityName"
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <span>
              Select region{' '}
              <EuiIconTip
                content="The AWS region where the CloudFormation stack is deployed."
                position="right"
              />
            </span>
          }
          style={{ maxWidth: '50%' }}
          fullWidth
        >
          <EuiSelect
            fullWidth
            options={REGION_OPTIONS}
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            disabled={phase !== 'idle'}
            aria-label="Select region"
          />
        </EuiFormRow>
        <EuiSpacer size="m" />

        {phase === 'idle' && (
          <EuiButton
            iconType="popout"
            iconSide="right"
            isDisabled={identityName.trim().length === 0}
            onClick={onLaunch}
            data-test-subj="awsOnboardingLaunchCloudFormation"
          >
            Launch CloudFormation
          </EuiButton>
        )}
        {phase === 'deploying' && !allReceived && (
          <EuiButton isLoading disabled>
            Cloudformation stack deploying...
          </EuiButton>
        )}
        {(phase === 'complete' || allReceived) && (
          <EuiLink data-test-subj="awsOnboardingReopenConsole">
            Reopen AWS Console <EuiIcon type="popout" size="s" />
          </EuiLink>
        )}

        {phase !== 'idle' && (
          <>
            <EuiHorizontalRule margin="l" />
            <EuiText size="s">
              <p>
                {allReceived ? (
                  <>
                    The Elastic Cloud Forwarder has been created in your AWS account. Log
                    collection is now active.
                  </>
                ) : (
                  <>
                    The Elastic Cloud Forwarder is being created in your AWS account. Once{' '}
                    <strong>CREATE_COMPLETE</strong>, log collection starts automatically.
                  </>
                )}
              </p>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              {`${receivedCount} of ${services.length} - data received`}
            </EuiText>
            <EuiSpacer size="s" />
            <EuiFlexGrid columns={3} gutterSize="m">
              {services.map((service, i) => (
                <EuiFlexItem key={service.id}>
                  <ServiceDetectionCard service={service} receiving={i < receivedCount} />
                </EuiFlexItem>
              ))}
            </EuiFlexGrid>

            {allReceived && (
              <>
                <EuiSpacer size="l" />
                <EuiText size="s">
                  <p>Copy the stack name from AWS Console and paste it below:</p>
                </EuiText>
                <EuiSpacer size="s" />
                <EuiFormRow
                  label={
                    <span>
                      Stack name{' '}
                      <EuiIconTip
                        content="Used to link this deployment to the CloudFormation stack in your account."
                        position="right"
                      />
                    </span>
                  }
                  style={{ maxWidth: '50%' }}
                  fullWidth
                >
                  <EuiFieldText
                    fullWidth
                    placeholder="e.g.: elastic-cloud-forwarder-xxxx"
                    aria-label="Stack name"
                  />
                </EuiFormRow>
              </>
            )}
          </>
        )}
      </EuiPanel>

      {allReceived && (
        <>
          <EuiSpacer size="l" />
          <EuiFlexGroup justifyContent="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton iconType="plusInCircle" color="primary">
                CTA - Next steps. To be discussed with the team
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};
