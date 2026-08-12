/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCallOut,
  EuiCheckbox,
  EuiCodeBlock,
  EuiFieldPassword,
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
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiRadioGroup,
  EuiSelect,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';

import { MANAGED_INTEGRATION_EXAMPLES, type AwsServiceEntry } from './aws_services_data';

// Light lavender-white tint used for card header bands, matched to the
// design reference (Step 14.svg / Deploy & Detect mockups).
const HEADER_TINT = '#F6F9FC';

export type DeploymentMethod = 'agent' | 'managed';

export const DEPLOYMENT_METHOD_META: Record<
  DeploymentMethod,
  { label: string; description: string }
> = {
  agent: {
    label: 'Agent-based.',
    description: 'For environments that require an Elastic Agent.',
  },
  managed: {
    label: 'Elastic Managed Integration.',
    description: 'Simpler setup, no agent required.',
  },
};

// Shaded header band (icon + title + "N services"), bled to the panel's
// edges via negative margins so the parent EuiPanel can keep its normal
// paddingSize="l" — parent must set `style={{ overflow: 'hidden' }}` so the
// square-cornered tint clips to the panel's rounded corners.
const PanelHeader: React.FunctionComponent<{
  iconType: string;
  title: string;
  servicesCount: number;
}> = ({ iconType, title, servicesCount }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      style={{
        margin: `-${euiTheme.size.l} -${euiTheme.size.l} 0`,
        padding: euiTheme.size.l,
        background: HEADER_TINT,
        borderBottom: euiTheme.border.thin,
      }}
    >
      <EuiFlexGroup alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={iconType} size="m" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{title}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink>{`${servicesCount} service${servicesCount === 1 ? '' : 's'}`}</EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

// Every field on this step is constrained to half the card's content width.
const HALF_WIDTH: React.CSSProperties = { maxWidth: '50%' };

const REGION_OPTIONS = [
  { value: 'us-east', text: 'US-East' },
  { value: 'us-west', text: 'US-West' },
  { value: 'eu-west-1', text: 'EU-West-1' },
  { value: 'ap-southeast-1', text: 'AP-Southeast-1' },
];

const STATUS_BADGE_SIZE = 32;

// Colored circle behind the spinner/checkmark (light blue while detecting,
// light green once data is received).
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
      <EuiFlexItem style={{ minWidth: 0 }}>
        <EuiText size="s" className="eui-textTruncate">
          <strong>{service.name}</strong>
        </EuiText>
        <EuiText size="xs" color="subdued">
          {receiving ? 'Receiving data' : 'Detecting data...'}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

// Elastic Cloud Forwarder widget — owns the FULL CloudFormation lifecycle:
// launch → per-service detection animation → stack name/version capture.
// Deploy state is lifted to the parent flow so Detect & Review can read it.
const CloudFormationWidget: React.FunctionComponent<{
  services: AwsServiceEntry[];
  region: string;
  onRegionChange: (value: string) => void;
  isLaunched: boolean;
  onLaunch: () => void;
  receivedCount: number;
  stackName: string;
  onStackNameChange: (value: string) => void;
  stackVersion: string;
  onStackVersionChange: (value: string) => void;
}> = ({
  services,
  region,
  onRegionChange,
  isLaunched,
  onLaunch,
  receivedCount,
  stackName,
  onStackNameChange,
  stackVersion,
  onStackVersionChange,
}) => {
  const allReceived = services.length > 0 && receivedCount >= services.length;

  return (
    <EuiPanel hasBorder paddingSize="l" style={{ overflow: 'hidden' }}>
      <PanelHeader iconType="rocket" title="Elastic Cloud Forwarder" servicesCount={services.length} />
      <EuiSpacer size="m" />
      <EuiText size="s">
        <p>
          Log collection via a single AWS CloudFormation stack — no agents required. Trigger
          source (S3 or CloudWatch) is configured per service in Service settings. Launch
          CloudFormation to deploy.
        </p>
      </EuiText>
      <EuiSpacer size="m" />

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
        style={HALF_WIDTH}
        fullWidth
      >
        <EuiSelect
          fullWidth
          options={REGION_OPTIONS}
          value={region}
          onChange={(e) => onRegionChange(e.target.value)}
          disabled={isLaunched}
          aria-label="Select region"
        />
      </EuiFormRow>
      <EuiSpacer size="m" />

      {!isLaunched ? (
        <EuiButton
          iconType="popout"
          iconSide="right"
          onClick={onLaunch}
          data-test-subj="awsOnboardingStep3LaunchCloudFormation"
        >
          Launch CloudFormation
        </EuiButton>
      ) : !allReceived ? (
        <EuiButton isLoading disabled data-test-subj="awsOnboardingStep3CloudFormationDeploying">
          Cloudformation stack deploying...
        </EuiButton>
      ) : (
        <EuiText size="s">
          <p>
            The Elastic Cloud Forwarder has been created in your AWS account. Log collection is
            now active.
          </p>
        </EuiText>
      )}

      {isLaunched && (
        <>
          <EuiSpacer size="m" />
          <EuiText size="s" color="subdued">
            {`${receivedCount} of ${services.length} - data received`}
          </EuiText>
          <EuiSpacer size="s" />
          <EuiFlexGrid columns={4} gutterSize="m">
            {services.map((service, i) => (
              <EuiFlexItem key={service.id} style={{ minWidth: 0 }}>
                <ServiceDetectionCard service={service} receiving={i < receivedCount} />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </>
      )}

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
            style={HALF_WIDTH}
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
            style={HALF_WIDTH}
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
  );
};

type ManagedAccessMethod = 'access_keys' | 'identity_federation';

// Managed Integrations widget — the single credentials card for the managed
// path (the separate "Setup access" card was removed as a duplicate).
// Defaults to Identity Federation; the Federated Identity Name is lifted to
// the parent flow so Detect & Review's summary can read it. Like the Cloud
// Forwarder card, it owns its own deploy CTA + arrival animation so the
// Detect & Review summary arrives already settled.
const ManagedIntegrationsWidget: React.FunctionComponent<{
  servicesCount: number;
  onValidityChange: (isValid: boolean) => void;
  identityName: string;
  onIdentityNameChange: (value: string) => void;
  isDeployed: boolean;
  onDeploy: () => void;
  receivedCount: number;
}> = ({
  servicesCount,
  onValidityChange,
  identityName,
  onIdentityNameChange,
  isDeployed,
  onDeploy,
  receivedCount,
}) => {
  const [method, setMethod] = useState<ManagedAccessMethod>('identity_federation');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [isAccessKeyIdTouched, setIsAccessKeyIdTouched] = useState(false);
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [isIdentityNameTouched, setIsIdentityNameTouched] = useState(false);
  const [roleArn, setRoleArn] = useState('');

  const isAccessKeyIdInvalid = isAccessKeyIdTouched && accessKeyId.trim().length === 0;
  const isIdentityNameInvalid = isIdentityNameTouched && identityName.trim().length === 0;

  const isValid =
    method === 'access_keys'
      ? accessKeyId.trim().length > 0 && secretAccessKey.trim().length > 0
      : identityName.trim().length > 0;

  useEffect(() => {
    onValidityChange(isValid);
  }, [isValid, onValidityChange]);

  const allReceived = receivedCount >= MANAGED_INTEGRATION_EXAMPLES.length;

  return (
    <EuiPanel
      hasBorder
      paddingSize="l"
      style={{ overflow: 'hidden' }}
      data-test-subj="awsOnboardingManagedIntegrationsPanel"
    >
      <PanelHeader iconType="package" title="Managed Integrations" servicesCount={servicesCount} />
      <EuiSpacer size="m" />
      <EuiText size="s">
        <p>
          Utilize AWS Access Keys or Federated Identity to set up and deploy your AWS account.
          Refer to our{' '}
          <EuiLink href="#" target="_blank" external>
            Getting Started
          </EuiLink>{' '}
          guide for details.
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiRadioGroup
        options={[
          { id: 'identity_federation', label: 'Identity Federation' },
          { id: 'access_keys', label: 'Access Keys' },
        ]}
        idSelected={method}
        onChange={(id) => setMethod(id as ManagedAccessMethod)}
        name="awsOnboardingManagedIntegrationsMethod"
        legend={{ children: 'Preferred method' }}
        data-test-subj="awsOnboardingManagedIntegrationsMethodRadioGroup"
      />
      <EuiSpacer size="m" />

      {method === 'access_keys' ? (
        <>
          <EuiFormRow
            label="Access key ID"
            isInvalid={isAccessKeyIdInvalid}
            error="Required"
            style={HALF_WIDTH}
            fullWidth
          >
            <EuiFieldText
              fullWidth
              value={accessKeyId}
              onChange={(e) => setAccessKeyId(e.target.value)}
              onBlur={() => setIsAccessKeyIdTouched(true)}
              isInvalid={isAccessKeyIdInvalid}
              aria-label="Access key ID"
              data-test-subj="awsOnboardingManagedAccessKeyId"
            />
          </EuiFormRow>
          <EuiFormRow label="Secret access key" style={HALF_WIDTH} fullWidth>
            <EuiFieldPassword
              type="dual"
              fullWidth
              value={secretAccessKey}
              onChange={(e) => setSecretAccessKey(e.target.value)}
              aria-label="Secret access key"
              data-test-subj="awsOnboardingManagedSecretAccessKey"
            />
          </EuiFormRow>
        </>
      ) : (
        <>
          <EuiFormRow
            label="Federated Identity Name"
            isInvalid={isIdentityNameInvalid}
            error="Federated Identity Name is required"
            style={HALF_WIDTH}
            fullWidth
          >
            <EuiFieldText
              fullWidth
              value={identityName}
              onChange={(e) => onIdentityNameChange(e.target.value)}
              onBlur={() => setIsIdentityNameTouched(true)}
              isInvalid={isIdentityNameInvalid}
              aria-label="Federated Identity Name"
              data-test-subj="awsOnboardingManagedFederatedIdentityName"
            />
          </EuiFormRow>
          <EuiSpacer size="s" />
          <EuiAccordion id="awsOnboardingStepsToAssumeRole" buttonContent="Steps to assume role">
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              <ol>
                <li>
                  Log in as an <strong>admin</strong> in the AWS account you want to onboard
                </li>
                <li>
                  (Optional) Change the <strong>AWS region</strong> in the upper right corner to
                  the region you want to deploy your stack to
                </li>
                <li>
                  Tick the checkbox under <strong>capabilities</strong> in the opened
                  CloudFormation stack review form:{' '}
                  <strong>
                    I acknowledge that AWS CloudFormation might create IAM resources.
                  </strong>
                </li>
                <li>
                  Click <strong>Create stack</strong>.
                </li>
                <li>
                  Once stack status is <strong>CREATE_COMPLETE</strong> then click the Outputs tab
                </li>
                <li>
                  Copy <strong>Role ARN</strong> and <strong>External ID</strong> then paste the
                  role credentials below
                </li>
              </ol>
            </EuiText>
          </EuiAccordion>
          <EuiSpacer size="m" />
          <EuiFormRow label="Role ARN" style={HALF_WIDTH} fullWidth>
            <EuiFieldText
              fullWidth
              value={roleArn}
              onChange={(e) => setRoleArn(e.target.value)}
              aria-label="Role ARN"
              data-test-subj="awsOnboardingManagedRoleArn"
            />
          </EuiFormRow>
        </>
      )}

      <EuiSpacer size="m" />
      {!isDeployed ? (
        <EuiButton
          isDisabled={!isValid}
          onClick={onDeploy}
          data-test-subj="awsOnboardingDeployManagedIntegrations"
        >
          Deploy integrations
        </EuiButton>
      ) : !allReceived ? (
        <EuiButton
          isLoading
          disabled
          data-test-subj="awsOnboardingManagedIntegrationsDeploying"
        >
          Deploying integrations...
        </EuiButton>
      ) : (
        <EuiText size="s">
          <p>Managed integration data streams are connected. Data collection is now active.</p>
        </EuiText>
      )}

      {isDeployed && (
        <>
          <EuiSpacer size="m" />
          <EuiText size="s" color="subdued">
            {`${receivedCount} of ${MANAGED_INTEGRATION_EXAMPLES.length} - data received`}
          </EuiText>
          <EuiSpacer size="s" />
          <EuiFlexGrid columns={4} gutterSize="m">
            {MANAGED_INTEGRATION_EXAMPLES.map((name, i) => (
              <EuiFlexItem key={name} style={{ minWidth: 0 }}>
                <ServiceDetectionCard service={{ name }} receiving={i < receivedCount} />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </>
      )}
    </EuiPanel>
  );
};

type HostMode = 'new_hosts' | 'existing_hosts';

// Agent path — "Where to add this integration?" card, mirroring Fleet's
// package-policy step (New hosts / Existing hosts converted from tabs to a
// radio choice, per the flow's one-or-the-other convention).
const AgentPolicyCard: React.FunctionComponent<{
  servicesCount: number;
  policyName: string;
  onPolicyNameChange: (value: string) => void;
}> = ({ servicesCount, policyName, onPolicyNameChange }) => {
  const [hostMode, setHostMode] = useState<HostMode>('new_hosts');
  const [collectSystem, setCollectSystem] = useState(true);

  return (
    <EuiPanel
      hasBorder
      paddingSize="l"
      style={{ overflow: 'hidden' }}
      data-test-subj="awsOnboardingAgentPolicyPanel"
    >
      <PanelHeader
        iconType="compute"
        title="Where to add this integration?"
        servicesCount={servicesCount}
      />
      <EuiSpacer size="m" />
      <EuiRadioGroup
        options={[
          { id: 'new_hosts', label: 'New hosts' },
          { id: 'existing_hosts', label: 'Existing hosts' },
        ]}
        idSelected={hostMode}
        onChange={(id) => setHostMode(id as HostMode)}
        name="awsOnboardingAgentHostMode"
        legend={{ children: 'Hosts' }}
        data-test-subj="awsOnboardingAgentHostModeRadioGroup"
      />
      <EuiSpacer size="m" />

      {hostMode === 'new_hosts' ? (
        <>
          <EuiTitle size="xxs">
            <h4>Create agent policy</h4>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            <p>
              Add this integration to a new set of hosts by creating a new agent policy. You can
              add agent in the next step.
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFormRow label="New agent policy name" style={HALF_WIDTH} fullWidth>
            <EuiFieldText
              fullWidth
              value={policyName}
              onChange={(e) => onPolicyNameChange(e.target.value)}
              aria-label="New agent policy name"
              data-test-subj="awsOnboardingAgentPolicyName"
            />
          </EuiFormRow>
          <EuiSpacer size="s" />
          <EuiCheckbox
            id="awsOnboardingCollectSystemLogs"
            checked={collectSystem}
            onChange={(e) => setCollectSystem(e.target.checked)}
            label={
              <span>
                Collect system logs and metrics{' '}
                <EuiIconTip
                  content="This will also add a System integration to collect system logs and metrics."
                  position="right"
                />
              </span>
            }
          />
        </>
      ) : (
        <>
          <EuiTitle size="xxs">
            <h4>Agent policies</h4>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            <p>Agent policies are used to manage a group of integrations across a set of agents.</p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFormRow label="Agent policies" style={HALF_WIDTH} fullWidth>
            <EuiSelect
              fullWidth
              hasNoInitialSelection
              options={[]}
              aria-label="Select agent policies to add this integration to"
              data-test-subj="awsOnboardingExistingAgentPolicies"
            />
          </EuiFormRow>
          <EuiText size="xs" color="subdued">
            <p>There aren&apos;t any options available</p>
          </EuiText>
        </>
      )}
    </EuiPanel>
  );
};

type EnrollMode = 'fleet' | 'standalone';

const AGENT_PLATFORM_OPTIONS = [
  { id: 'linux', label: 'Linux aarch64' },
  { id: 'macos', label: 'MacOS aarch64' },
  { id: 'deb', label: 'DEB aarch64' },
  { id: 'rpm', label: 'RPM aarch64' },
];

const AGENT_INSTALL_COMMANDS = `curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.5.0-linux-arm64.tar.gz
tar xzvf elastic-agent-9.5.0-linux-arm64.tar.gz
cd elastic-agent-9.5.0-linux-arm64
sudo ./elastic-agent install --url=https://4fc1b088ce026fc9e70a6a0c28b0c58f.fleet.us-east-1.aws.elastic.cloud:443 --enrollment-token=RGVmYXVsdC0wNDE0YTZiLTA5OTY=`;

// Agent path — "Add agent" card, mirroring Fleet's agent-enrollment flyout
// (Enroll in Fleet / Run standalone as a radio choice). Enrollment is
// simulated: the "Listening for agent" state confirms a few seconds after
// the card appears, which in turn unblocks the step's Next button.
const AddAgentCard: React.FunctionComponent<{
  services: AwsServiceEntry[];
  policyName: string;
  isEnrolled: boolean;
  onEnrolled: () => void;
  receivedCount: number;
}> = ({ services, policyName, isEnrolled, onEnrolled, receivedCount }) => {
  const [enrollMode, setEnrollMode] = useState<EnrollMode>('fleet');
  const [platform, setPlatform] = useState('linux');
  const enrollTimer = useRef<number | null>(null);
  const servicesCount = services.length;
  const allReceived = servicesCount > 0 && receivedCount >= servicesCount;

  useEffect(() => {
    if (isEnrolled) return;
    enrollTimer.current = window.setTimeout(onEnrolled, 8000);
    return () => {
      if (enrollTimer.current) window.clearTimeout(enrollTimer.current);
    };
  }, [isEnrolled, onEnrolled]);

  return (
    <EuiPanel
      hasBorder
      paddingSize="l"
      style={{ overflow: 'hidden' }}
      data-test-subj="awsOnboardingAddAgentPanel"
    >
      <PanelHeader iconType="agentApp" title="Add agent" servicesCount={servicesCount} />
      <EuiSpacer size="m" />
      <EuiText size="s">
        <p>Add Elastic Agents to your hosts to collect data and send it to the Elastic Stack.</p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiRadioGroup
        options={[
          { id: 'fleet', label: 'Enroll in Fleet' },
          { id: 'standalone', label: 'Run standalone' },
        ]}
        idSelected={enrollMode}
        onChange={(id) => setEnrollMode(id as EnrollMode)}
        name="awsOnboardingEnrollMode"
        legend={{ children: 'Enrollment mode' }}
        data-test-subj="awsOnboardingEnrollModeRadioGroup"
      />
      <EuiSpacer size="m" />

      {enrollMode === 'standalone' ? (
        <EuiText size="s" color="subdued">
          <p>[Run standalone — not yet designed in this prototype.]</p>
        </EuiText>
      ) : (
        <>
          <EuiText size="s" color="subdued">
            <p>
              Enroll an Elastic Agent in Fleet to automatically deploy updates and centrally
              manage the agent.
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiSteps
            titleSize="xs"
            steps={[
              {
                title: 'Select enrollment token',
                children: (
                  <>
                    <EuiText size="s">
                      <p>
                        <strong>{policyName}</strong> has been selected. Select which enrollment
                        token to use when enrolling agents.
                      </p>
                    </EuiText>
                    <EuiSpacer size="s" />
                    <EuiLink href="#">Authentication settings</EuiLink>
                    <EuiSpacer size="s" />
                    <EuiFormRow label="Enrollment token" style={HALF_WIDTH} fullWidth>
                      <EuiSelect
                        fullWidth
                        options={[
                          {
                            value: 'default',
                            text: 'Default (0414a6b-0996-451f-87a4-3e9c189665e8)',
                          },
                        ]}
                        aria-label="Enrollment token"
                      />
                    </EuiFormRow>
                  </>
                ),
              },
              {
                title: 'Install Elastic Agent on your host',
                children: (
                  <>
                    <EuiText size="s">
                      <p>
                        Select the appropriate platform and run commands to install, enroll, and
                        start Elastic Agent. Reuse commands to set up agents on more than one
                        host. All builds can be found on our{' '}
                        <EuiLink href="#" target="_blank" external>
                          downloads page
                        </EuiLink>
                        . For additional guidance, see our{' '}
                        <EuiLink href="#" target="_blank" external>
                          installation docs
                        </EuiLink>
                        .
                      </p>
                    </EuiText>
                    <EuiSpacer size="m" />
                    <EuiCallOut title="Root privileges required" color="warning" iconType="alert">
                      <p>
                        This agent policy contains the following integrations that require
                        Elastic Agents to have root privileges. To ensure that all data required
                        by the integrations can be collected, enroll the agents using an account
                        with root privileges. For more information, see the{' '}
                        <EuiLink href="#" target="_blank" external>
                          Fleet and Elastic Agent Guide
                        </EuiLink>
                      </p>
                      <ul>
                        <li>System</li>
                      </ul>
                    </EuiCallOut>
                    <EuiSpacer size="m" />
                    <EuiText size="s">
                      <p>
                        To install Elastic Agent without root privileges, add the{' '}
                        <code>--unprivileged</code> flag to the <code>elastic-agent install</code>{' '}
                        command below. For more information, see the{' '}
                        <EuiLink href="#" target="_blank" external>
                          Fleet and Elastic Agent Guide
                        </EuiLink>
                      </p>
                    </EuiText>
                    <EuiSpacer size="m" />
                    <EuiButtonGroup
                      legend="Platform"
                      options={AGENT_PLATFORM_OPTIONS}
                      idSelected={platform}
                      onChange={setPlatform}
                      buttonSize="compressed"
                    />
                    <EuiSpacer size="s" />
                    <EuiCodeBlock language="bash" isCopyable paddingSize="m">
                      {AGENT_INSTALL_COMMANDS}
                    </EuiCodeBlock>
                  </>
                ),
              },
              {
                title: 'Confirm agent enrollment',
                status: isEnrolled ? 'complete' : 'loading',
                children: isEnrolled ? (
                  <EuiCallOut
                    title="1 agent has been enrolled."
                    color="success"
                    iconType="check"
                    data-test-subj="awsOnboardingAgentEnrolled"
                  />
                ) : (
                  <>
                    <EuiPanel color="primary" paddingSize="m">
                      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                        <EuiFlexItem grow={false}>
                          <EuiLoadingSpinner size="m" />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiText size="s">Listening for agent</EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiPanel>
                    <EuiSpacer size="s" />
                    <EuiText size="s" color="subdued">
                      <p>
                        After the agent starts up, the Elastic Stack listens for the agent and
                        confirms the enrollment in Fleet. If you&apos;re having trouble
                        connecting, check out the{' '}
                        <EuiLink href="#" target="_blank" external>
                          troubleshooting guide
                        </EuiLink>
                        .
                      </p>
                    </EuiText>
                  </>
                ),
              },
              {
                title: 'Confirm incoming data',
                status: !isEnrolled ? 'incomplete' : allReceived ? 'complete' : 'loading',
                children: !isEnrolled ? (
                  <EuiText size="s" color="subdued">
                    <p>Waiting for agent enrollment.</p>
                  </EuiText>
                ) : (
                  <>
                    <EuiText size="s" color="subdued">
                      {`${receivedCount} of ${servicesCount} - data received`}
                    </EuiText>
                    <EuiSpacer size="s" />
                    <EuiFlexGrid columns={4} gutterSize="m">
                      {services.map((service, i) => (
                        <EuiFlexItem key={service.id} style={{ minWidth: 0 }}>
                          <ServiceDetectionCard
                            service={service}
                            receiving={i < receivedCount}
                          />
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGrid>
                  </>
                ),
              },
            ]}
          />
        </>
      )}
    </EuiPanel>
  );
};

export const StepAuthentication: React.FunctionComponent<{
  services: AwsServiceEntry[];
  deploymentMethod: DeploymentMethod;
  onDeploymentMethodChange: (method: DeploymentMethod) => void;
  onCredentialsValidChange: (isValid: boolean) => void;
  deployIdentityName: string;
  onDeployIdentityNameChange: (value: string) => void;
  deployRegion: string;
  onDeployRegionChange: (value: string) => void;
  isDeployed: boolean;
  onLaunchCloudFormation: () => void;
  receivedCount: number;
  stackName: string;
  onStackNameChange: (value: string) => void;
  stackVersion: string;
  onStackVersionChange: (value: string) => void;
  agentPolicyName: string;
  onAgentPolicyNameChange: (value: string) => void;
  isAgentEnrolled: boolean;
  onAgentEnrolled: () => void;
  isManagedDeployed: boolean;
  onDeployManagedIntegrations: () => void;
  managedReceivedCount: number;
  agentReceivedCount: number;
}> = ({
  services,
  deploymentMethod,
  onDeploymentMethodChange,
  onCredentialsValidChange,
  deployIdentityName,
  onDeployIdentityNameChange,
  deployRegion,
  onDeployRegionChange,
  isDeployed,
  onLaunchCloudFormation,
  receivedCount,
  stackName,
  onStackNameChange,
  stackVersion,
  onStackVersionChange,
  agentPolicyName,
  onAgentPolicyNameChange,
  isAgentEnrolled,
  onAgentEnrolled,
  isManagedDeployed,
  onDeployManagedIntegrations,
  managedReceivedCount,
  agentReceivedCount,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [pendingMethod, setPendingMethod] = useState<DeploymentMethod>(deploymentMethod);
  const [agentAccessKeyId, setAgentAccessKeyId] = useState('');
  const [agentSecretAccessKey, setAgentSecretAccessKey] = useState('');
  const [managedIntegrationsValid, setManagedIntegrationsValid] = useState(false);

  const servicesCount = services.length;

  const openModal = () => {
    setPendingMethod(deploymentMethod);
    setIsEditModalOpen(true);
  };

  const meta = DEPLOYMENT_METHOD_META[deploymentMethod];
  const { euiTheme } = useEuiTheme();

  useEffect(() => {
    const isValid =
      deploymentMethod === 'agent'
        ? agentAccessKeyId.trim().length > 0 && agentSecretAccessKey.trim().length > 0
        : managedIntegrationsValid;
    onCredentialsValidChange(isValid);
  }, [
    deploymentMethod,
    agentAccessKeyId,
    agentSecretAccessKey,
    managedIntegrationsValid,
    onCredentialsValidChange,
  ]);

  return (
    <>
      <EuiTitle size="m">
        <h2>Authenticate &amp; Deploy</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          Select a deployment method, provide the credentials needed to connect your AWS services
          to Elastic, and deploy.
        </p>
      </EuiText>
      <EuiSpacer size="m" />

      <EuiPanel
        hasBorder
        paddingSize="l"
        style={{ overflow: 'hidden' }}
        data-test-subj="awsOnboardingDeploymentMethodPanel"
      >
        <div
          style={{
            margin: `-${euiTheme.size.l} -${euiTheme.size.l}`,
            padding: euiTheme.size.l,
            background: HEADER_TINT,
          }}
        >
          <EuiFlexGroup alignItems="flexStart" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="gear" size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h3>Deployment method</h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s">
                <strong>{meta.label}</strong>{' '}
                <EuiText size="s" color="subdued" component="span">
                  {meta.description}
                </EuiText>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiLink onClick={openModal} data-test-subj="awsOnboardingEditDeploymentMethod">
                Edit
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </EuiPanel>

      <EuiHorizontalRule margin="l" />

      {deploymentMethod === 'agent' ? (
        <>
        <EuiPanel hasBorder paddingSize="l" style={{ overflow: 'hidden' }}>
          <PanelHeader iconType="rocket" title="Setup access" servicesCount={servicesCount} />
          <EuiSpacer size="m" />
          <EuiFormRow
            label={
              <span>
                Preferred method{' '}
                <EuiIconTip
                  content="How Elastic Agent authenticates against your AWS account."
                  position="right"
                />
              </span>
            }
            style={HALF_WIDTH}
            fullWidth
          >
            <EuiSelect
              fullWidth
              options={[
                { value: 'access_key', text: 'Direct Access Key' },
                { value: 'temporary', text: 'Temporary security credentials' },
                { value: 'shared', text: 'Shared credentials file' },
                { value: 'iam_role', text: 'IAM role ARN' },
              ]}
              aria-label="Preferred authentication method"
            />
          </EuiFormRow>
          <EuiFormRow label="Access Key ID" style={HALF_WIDTH} fullWidth>
            <EuiFieldPassword
              type="dual"
              fullWidth
              value={agentAccessKeyId}
              onChange={(e) => setAgentAccessKeyId(e.target.value)}
              aria-label="Access Key ID"
              data-test-subj="awsOnboardingAgentAccessKeyId"
            />
          </EuiFormRow>
          <EuiFormRow label="Secret Access Key" style={HALF_WIDTH} fullWidth>
            <EuiFieldPassword
              type="dual"
              fullWidth
              value={agentSecretAccessKey}
              onChange={(e) => setAgentSecretAccessKey(e.target.value)}
              aria-label="Secret Access Key"
              data-test-subj="awsOnboardingAgentSecretAccessKey"
            />
          </EuiFormRow>
        </EuiPanel>

        <EuiSpacer size="m" />
        <AgentPolicyCard
          servicesCount={servicesCount}
          policyName={agentPolicyName}
          onPolicyNameChange={onAgentPolicyNameChange}
        />
        <EuiSpacer size="m" />
        <AddAgentCard
          services={services}
          policyName={agentPolicyName}
          isEnrolled={isAgentEnrolled}
          onEnrolled={onAgentEnrolled}
          receivedCount={agentReceivedCount}
        />
        </>
      ) : (
        <>
          <ManagedIntegrationsWidget
            servicesCount={servicesCount}
            onValidityChange={setManagedIntegrationsValid}
            identityName={deployIdentityName}
            onIdentityNameChange={onDeployIdentityNameChange}
            isDeployed={isManagedDeployed}
            onDeploy={onDeployManagedIntegrations}
            receivedCount={managedReceivedCount}
          />
          <EuiSpacer size="m" />
          <CloudFormationWidget
            services={services}
            region={deployRegion}
            onRegionChange={onDeployRegionChange}
            isLaunched={isDeployed}
            onLaunch={onLaunchCloudFormation}
            receivedCount={receivedCount}
            stackName={stackName}
            onStackNameChange={onStackNameChange}
            stackVersion={stackVersion}
            onStackVersionChange={onStackVersionChange}
          />
        </>
      )}

      {isEditModalOpen && (
        <EuiModal
          onClose={() => setIsEditModalOpen(false)}
          data-test-subj="awsOnboardingDeploymentMethodModal"
          style={{ width: 400 }}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle>Edit deployment method</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiText size="s">
              <p>
                The deployment method determines how Elastic connects to and collects data from
                your AWS services.
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiSelect
              fullWidth
              options={[
                { value: 'managed', text: 'Elastic Managed Integrations' },
                { value: 'agent', text: 'Agent-based' },
              ]}
              value={pendingMethod}
              onChange={(e) => setPendingMethod(e.target.value as DeploymentMethod)}
              aria-label="Deployment method"
            />
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty onClick={() => setIsEditModalOpen(false)}>Cancel</EuiButtonEmpty>
            <EuiButton
              fill
              onClick={() => {
                onDeploymentMethodChange(pendingMethod);
                setIsEditModalOpen(false);
              }}
              data-test-subj="awsOnboardingSaveDeploymentMethod"
            >
              Save
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
};
