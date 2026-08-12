/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
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
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';

import type { AwsServiceEntry } from './aws_services_data';

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
// the parent flow so Detect & Review's summary can read it.
const ManagedIntegrationsWidget: React.FunctionComponent<{
  servicesCount: number;
  onValidityChange: (isValid: boolean) => void;
  identityName: string;
  onIdentityNameChange: (value: string) => void;
}> = ({ servicesCount, onValidityChange, identityName, onIdentityNameChange }) => {
  const [method, setMethod] = useState<ManagedAccessMethod>('identity_federation');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [isAccessKeyIdTouched, setIsAccessKeyIdTouched] = useState(false);
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [isIdentityNameTouched, setIsIdentityNameTouched] = useState(false);
  const [roleArn, setRoleArn] = useState('');

  const isAccessKeyIdInvalid = isAccessKeyIdTouched && accessKeyId.trim().length === 0;
  const isIdentityNameInvalid = isIdentityNameTouched && identityName.trim().length === 0;

  useEffect(() => {
    const isValid =
      method === 'access_keys'
        ? accessKeyId.trim().length > 0 && secretAccessKey.trim().length > 0
        : identityName.trim().length > 0;
    onValidityChange(isValid);
  }, [method, accessKeyId, secretAccessKey, identityName, onValidityChange]);

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
      ) : (
        <>
          <ManagedIntegrationsWidget
            servicesCount={servicesCount}
            onValidityChange={setManagedIntegrationsValid}
            identityName={deployIdentityName}
            onIdentityNameChange={onDeployIdentityNameChange}
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
