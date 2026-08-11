/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  EuiCallOut,
  EuiFieldText,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiIconTip,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { CardHeader } from './card_header';
import { MANAGED_INTEGRATION_EXAMPLES, type AwsServiceEntry } from './aws_services_data';

const STATUS_BADGE_SIZE = 32;

// Colored circle behind the spinner/checkmark, matching the design reference
// (light blue while detecting, light green once data is received).
const ServiceStatusBadge: React.FunctionComponent<{ receiving: boolean }> = ({ receiving }) => (
  <div
    style={{
      width: STATUS_BADGE_SIZE,
      height: STATUS_BADGE_SIZE,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: receiving ? '#EAF3DE' : '#E6F1FA',
      flexShrink: 0,
    }}
  >
    {receiving ? (
      <EuiIcon type="check" color="success" size="m" />
    ) : (
      <EuiLoadingSpinner size="m" />
    )}
  </div>
);

const ServiceDetectionCard: React.FunctionComponent<{
  service: { name: string };
  receiving: boolean;
}> = ({ service, receiving }) => (
  <EuiPanel hasBorder paddingSize="m">
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>
        <ServiceStatusBadge receiving={receiving} />
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

// Step 4 (managed-integration path only): CloudFormation is launched back on
// step 3 (Authentication) — this step purely displays the resulting
// deploy/detect state and the live per-service animation.
export const StepDeploy: React.FunctionComponent<{
  services: AwsServiceEntry[];
  isLaunched: boolean;
  receivedCount: number;
  stackName: string;
  onStackNameChange: (value: string) => void;
  stackVersion: string;
  onStackVersionChange: (value: string) => void;
}> = ({
  services,
  isLaunched,
  receivedCount,
  stackName,
  onStackNameChange,
  stackVersion,
  onStackVersionChange,
}) => {
  const allReceived = services.length > 0 && receivedCount >= services.length;

  // Managed Integrations examples confirm quickly: first after 800ms, then
  // one every 700ms — local state since it's simulated demo data.
  const [managedReceived, setManagedReceived] = useState(0);
  const managedTimers = useRef<number[]>([]);
  useEffect(() => {
    if (!isLaunched) return;
    setManagedReceived(0);
    MANAGED_INTEGRATION_EXAMPLES.forEach((_, i) => {
      managedTimers.current.push(
        window.setTimeout(() => setManagedReceived((c) => c + 1), 800 + i * 700)
      );
    });
    return () => managedTimers.current.forEach((t) => window.clearTimeout(t));
  }, [isLaunched]);

  return (
    <>
      <EuiTitle size="m">
        <h2>Deploy</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>Watch the Elastic Cloud Forwarder deployment and data arrival for each service.</p>
      </EuiText>
      <EuiSpacer size="m" />

      {!isLaunched ? (
        <EuiCallOut title="CloudFormation not launched yet" color="warning" iconType="alert">
          <p>Return to Authentication and launch CloudFormation before continuing here.</p>
        </EuiCallOut>
      ) : (
        <>
        <EuiPanel hasBorder paddingSize="l" style={{ overflow: 'hidden' }}>
          <CardHeader
            iconType="rocket"
            title="Elastic Cloud Forwarder"
            servicesCount={services.length}
          />
          <EuiSpacer size="m" />
          <EuiText size="s">
            <p>
              The Elastic Cloud Forwarder has been created in your AWS account. Log collection is
              now active.
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            {`${receivedCount} of ${services.length} - data received`}
          </EuiText>
          <EuiSpacer size="s" />
          <EuiFlexGrid columns={4} gutterSize="m">
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
                <p>Copy the stack name and stack version from AWS Console and paste it below:</p>
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
                  value={stackName}
                  onChange={(e) => onStackNameChange(e.target.value)}
                  aria-label="Stack name"
                  data-test-subj="awsOnboardingStackName"
                />
              </EuiFormRow>
              <EuiFormRow
                label={
                  <span>
                    Stack version{' '}
                    <EuiIconTip
                      content="The version of the CloudFormation stack deployed in your account."
                      position="right"
                    />
                  </span>
                }
                style={{ maxWidth: '50%' }}
                fullWidth
              >
                <EuiFieldText
                  fullWidth
                  placeholder="e.g.: 1.0.0"
                  value={stackVersion}
                  onChange={(e) => onStackVersionChange(e.target.value)}
                  aria-label="Stack version"
                  data-test-subj="awsOnboardingStackVersion"
                />
              </EuiFormRow>
            </>
          )}
        </EuiPanel>

        <EuiSpacer size="m" />
        <EuiPanel hasBorder paddingSize="l" style={{ overflow: 'hidden' }}>
          <CardHeader
            iconType="package"
            title="Managed Integrations"
            servicesCount={MANAGED_INTEGRATION_EXAMPLES.length}
          />
          <EuiSpacer size="m" />
          <EuiText size="s">
            <p>Managed integration data streams connecting directly — no CloudFormation stack.</p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            {`${managedReceived} of ${MANAGED_INTEGRATION_EXAMPLES.length} - data received`}
          </EuiText>
          <EuiSpacer size="s" />
          <EuiFlexGrid columns={4} gutterSize="m">
            {MANAGED_INTEGRATION_EXAMPLES.map((name, i) => (
              <EuiFlexItem key={name}>
                <ServiceDetectionCard service={{ name }} receiving={i < managedReceived} />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </EuiPanel>
        </>
      )}
    </>
  );
};
