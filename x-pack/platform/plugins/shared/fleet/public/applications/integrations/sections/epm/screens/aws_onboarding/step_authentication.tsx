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
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiIconTip,
  EuiLink,
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

// Elastic Cloud Forwarder widget — the ONE place CloudFormation is launched
// (state is lifted to the parent flow so step 4 "Deploy" can pick up the
// resulting deploy/detect state without asking the user to launch again).
// Credentials (incl. the Federated Identity Name) live in the Setup access
// card above; Launch itself is always active.
const CloudFormationWidget: React.FunctionComponent<{
  servicesCount: number;
  region: string;
  onRegionChange: (value: string) => void;
  isLaunched: boolean;
  onLaunch: () => void;
}> = ({ servicesCount, region, onRegionChange, isLaunched, onLaunch }) => {
  return (
    <EuiPanel hasBorder paddingSize="l" style={{ overflow: 'hidden' }}>
      <PanelHeader iconType="rocket" title="Elastic Cloud Forwarder" servicesCount={servicesCount} />
      <EuiSpacer size="m" />
      <EuiText size="s">
        <p>
          Log collection via a single AWS CloudFormation stack — no agents required. Trigger
          source (S3 or CloudWatch) is configured per service in Service settings. Complete
          Setup access above, then launch CloudFormation to deploy.
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
      ) : (
        <EuiButton isLoading disabled data-test-subj="awsOnboardingStep3CloudFormationDeploying">
          Cloudformation stack deploying...
        </EuiButton>
      )}

      {isLaunched && (
        <>
          <EuiSpacer size="m" />
          <EuiText size="s" color="subdued">
            <p>
              Elastic Cloud Forwarder is being set up in your AWS account. Once the stack is
              ready, log collection will start automatically. Continue to the next step to
              monitor deployment.
            </p>
          </EuiText>
        </>
      )}
    </EuiPanel>
  );
};

type ManagedAccessMethod = 'access_keys' | 'identity_federation';

// Managed Integrations widget — a second, separate credential set (used by
// the managed integration itself to query data, distinct from the
// CloudFormation/Setup access credentials above it). Defaults to Identity
// Federation.
const ManagedIntegrationsWidget: React.FunctionComponent<{
  servicesCount: number;
  onValidityChange: (isValid: boolean) => void;
}> = ({ servicesCount, onValidityChange }) => {
  const [method, setMethod] = useState<ManagedAccessMethod>('identity_federation');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [isAccessKeyIdTouched, setIsAccessKeyIdTouched] = useState(false);
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [federatedIdentityName, setFederatedIdentityName] = useState('');
  const [isIdentityNameTouched, setIsIdentityNameTouched] = useState(false);
  const [roleArn, setRoleArn] = useState('');

  const isAccessKeyIdInvalid = isAccessKeyIdTouched && accessKeyId.trim().length === 0;
  const isIdentityNameInvalid = isIdentityNameTouched && federatedIdentityName.trim().length === 0;

  useEffect(() => {
    const isValid =
      method === 'access_keys'
        ? accessKeyId.trim().length > 0 && secretAccessKey.trim().length > 0
        : federatedIdentityName.trim().length > 0;
    onValidityChange(isValid);
  }, [method, accessKeyId, secretAccessKey, federatedIdentityName, onValidityChange]);

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
              value={federatedIdentityName}
              onChange={(e) => setFederatedIdentityName(e.target.value)}
              onBlur={() => setIsIdentityNameTouched(true)}
              isInvalid={isIdentityNameInvalid}
              aria-label="Federated Identity Name"
              data-test-subj="awsOnboardingManagedFederatedIdentityName"
            />
          </EuiFormRow>
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

type PreferredAccessMethod = 'identity_federation' | 'direct_access_keys';
type IdentityMode = 'new_identity' | 'existing_identity';

const PolicySecretsLink: React.FunctionComponent = () => (
  <EuiLink href="#" target="_blank" external>
    Learn more about policy secrets.
  </EuiLink>
);

// Setup access widget for the managed-integration path — a "Preferred method"
// dropdown (defaults to Identity Federation) drives which credential form
// renders below. Within Identity Federation, New vs Existing identity is a
// radio choice, not tabs. The Federated Identity Name is lifted to the parent
// flow: it's the single place the name is entered (the Cloud Forwarder widget
// no longer has its own field) and step 5's summary reads it from there.
const SetupAccessWidget: React.FunctionComponent<{
  servicesCount: number;
  onValidityChange: (isValid: boolean) => void;
  identityName: string;
  onIdentityNameChange: (value: string) => void;
}> = ({ servicesCount, onValidityChange, identityName, onIdentityNameChange }) => {
  const [preferredMethod, setPreferredMethod] = useState<PreferredAccessMethod>(
    'identity_federation'
  );
  const [identityMode, setIdentityMode] = useState<IdentityMode>('new_identity');
  const federatedIdentityName = identityName;
  const [isIdentityNameTouched, setIsIdentityNameTouched] = useState(false);
  const [existingRoleArn, setExistingRoleArn] = useState('');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');

  const isIdentityNameInvalid = isIdentityNameTouched && federatedIdentityName.trim().length === 0;

  useEffect(() => {
    const isValid =
      preferredMethod === 'direct_access_keys'
        ? accessKeyId.trim().length > 0 && secretAccessKey.trim().length > 0
        : identityMode === 'new_identity'
        ? federatedIdentityName.trim().length > 0
        : existingRoleArn.trim().length > 0;
    onValidityChange(isValid);
  }, [
    preferredMethod,
    identityMode,
    federatedIdentityName,
    existingRoleArn,
    accessKeyId,
    secretAccessKey,
    onValidityChange,
  ]);

  return (
    <EuiPanel
      hasBorder
      paddingSize="l"
      style={{ overflow: 'hidden' }}
      data-test-subj="awsOnboardingSetupAccessPanel"
    >
      <PanelHeader iconType="lock" title="Setup access" servicesCount={servicesCount} />
      <EuiSpacer size="m" />
      <EuiFormRow
        label={
          <span>
            Preferred method{' '}
            <EuiIconTip
              content="How Elastic connects to your AWS account to collect data."
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
            { value: 'identity_federation', text: 'Identity Federation' },
            { value: 'direct_access_keys', text: 'Direct Access Keys' },
          ]}
          value={preferredMethod}
          onChange={(e) => setPreferredMethod(e.target.value as PreferredAccessMethod)}
          aria-label="Preferred method"
          data-test-subj="awsOnboardingPreferredMethod"
        />
      </EuiFormRow>

      {preferredMethod === 'identity_federation' ? (
        <>
          <EuiSpacer size="m" />
          <EuiRadioGroup
            options={[
              { id: 'new_identity', label: 'New Identity' },
              { id: 'existing_identity', label: 'Existing Identity' },
            ]}
            idSelected={identityMode}
            onChange={(id) => setIdentityMode(id as IdentityMode)}
            name="awsOnboardingIdentityMode"
            legend={{ children: 'Identity mode' }}
            data-test-subj="awsOnboardingIdentityModeRadioGroup"
          />
          <EuiSpacer size="m" />

          {identityMode === 'new_identity' && (
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
                  isInvalid={isIdentityNameInvalid}
                  value={federatedIdentityName}
                  onChange={(e) => onIdentityNameChange(e.target.value)}
                  onBlur={() => setIsIdentityNameTouched(true)}
                  aria-label="Federated Identity Name"
                  data-test-subj="awsOnboardingFederatedIdentityName"
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
                      (Optional) Change the <strong>AWS region</strong> in the upper right corner
                      to the region you want to deploy your stack to
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
                      Once stack status is <strong>CREATE_COMPLETE</strong> then click the Outputs
                      tab
                    </li>
                    <li>
                      Copy <strong>Role ARN</strong> and <strong>External ID</strong> then paste
                      the role credentials below
                    </li>
                  </ol>
                </EuiText>
              </EuiAccordion>
              <EuiSpacer size="m" />
              <EuiFormRow label="Role ARN" style={HALF_WIDTH} fullWidth>
                <EuiFieldText fullWidth aria-label="Role ARN" />
              </EuiFormRow>
            </>
          )}

          {identityMode === 'existing_identity' && (
            <EuiFormRow label="Role ARN" style={HALF_WIDTH} fullWidth>
              <EuiFieldText
                fullWidth
                placeholder="arn:aws:iam::123456789012:role/elastic-forwarder"
                value={existingRoleArn}
                onChange={(e) => setExistingRoleArn(e.target.value)}
                aria-label="Role ARN"
                data-test-subj="awsOnboardingExistingRoleArn"
              />
            </EuiFormRow>
          )}

          <EuiSpacer size="m" />
          <EuiPanel color="subdued" paddingSize="m" style={HALF_WIDTH}>
            <EuiFormRow
              label={
                <span>
                  External ID{' '}
                  <EuiIconTip
                    type="info"
                    content="A unique identifier used to prevent the confused-deputy problem when assuming a role in another AWS account."
                    position="right"
                  />
                </span>
              }
              helpText={
                <>
                  External ID to use when assuming a role in another account, see the{' '}
                  <EuiLink href="#" target="_blank" external>
                    AWS documentation for use of external IDs
                  </EuiLink>
                </>
              }
              fullWidth
            >
              <EuiFieldPassword type="dual" fullWidth aria-label="External ID" />
            </EuiFormRow>
            <EuiSpacer size="s" />
            <PolicySecretsLink />
          </EuiPanel>
        </>
      ) : (
        <>
          <EuiSpacer size="m" />
          <EuiPanel color="subdued" paddingSize="m" style={HALF_WIDTH}>
            <EuiFormRow
              label={
                <span>
                  Access Key ID{' '}
                  <EuiIconTip
                    type="info"
                    content="The AWS access key ID for the credentials Elastic uses to collect data."
                    position="right"
                  />
                </span>
              }
              fullWidth
            >
              <EuiFieldPassword
                type="dual"
                fullWidth
                value={accessKeyId}
                onChange={(e) => setAccessKeyId(e.target.value)}
                aria-label="Access Key ID"
                data-test-subj="awsOnboardingAccessKeyId"
              />
            </EuiFormRow>
            <EuiSpacer size="s" />
            <PolicySecretsLink />
          </EuiPanel>
          <EuiSpacer size="m" />
          <EuiPanel color="subdued" paddingSize="m" style={HALF_WIDTH}>
            <EuiFormRow
              label={
                <span>
                  Secret Access Key{' '}
                  <EuiIconTip
                    type="info"
                    content="The AWS secret access key paired with the access key ID above."
                    position="right"
                  />
                </span>
              }
              fullWidth
            >
              <EuiFieldPassword
                type="dual"
                fullWidth
                value={secretAccessKey}
                onChange={(e) => setSecretAccessKey(e.target.value)}
                aria-label="Secret Access Key"
                data-test-subj="awsOnboardingSecretAccessKey"
              />
            </EuiFormRow>
            <EuiSpacer size="s" />
            <PolicySecretsLink />
          </EuiPanel>
        </>
      )}
    </EuiPanel>
  );
};

export const StepAuthentication: React.FunctionComponent<{
  servicesCount: number;
  deploymentMethod: DeploymentMethod;
  onDeploymentMethodChange: (method: DeploymentMethod) => void;
  onCredentialsValidChange: (isValid: boolean) => void;
  deployIdentityName: string;
  onDeployIdentityNameChange: (value: string) => void;
  deployRegion: string;
  onDeployRegionChange: (value: string) => void;
  isDeployed: boolean;
  onLaunchCloudFormation: () => void;
}> = ({
  servicesCount,
  deploymentMethod,
  onDeploymentMethodChange,
  onCredentialsValidChange,
  deployIdentityName,
  onDeployIdentityNameChange,
  deployRegion,
  onDeployRegionChange,
  isDeployed,
  onLaunchCloudFormation,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [pendingMethod, setPendingMethod] = useState<DeploymentMethod>(deploymentMethod);
  const [agentAccessKeyId, setAgentAccessKeyId] = useState('');
  const [agentSecretAccessKey, setAgentSecretAccessKey] = useState('');
  const [managedCredsValid, setManagedCredsValid] = useState(false);
  const [managedIntegrationsValid, setManagedIntegrationsValid] = useState(false);

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
        : managedCredsValid && managedIntegrationsValid;
    onCredentialsValidChange(isValid);
  }, [
    deploymentMethod,
    agentAccessKeyId,
    agentSecretAccessKey,
    managedCredsValid,
    managedIntegrationsValid,
    onCredentialsValidChange,
  ]);

  return (
    <>
      <EuiTitle size="m">
        <h2>Authentication</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          Select a deployment method and provide the credentials needed to connect your AWS
          services to Elastic.
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
          <SetupAccessWidget
            servicesCount={servicesCount}
            onValidityChange={setManagedCredsValid}
            identityName={deployIdentityName}
            onIdentityNameChange={onDeployIdentityNameChange}
          />
          <EuiSpacer size="m" />
          <CloudFormationWidget
            servicesCount={servicesCount}
            region={deployRegion}
            onRegionChange={onDeployRegionChange}
            isLaunched={isDeployed}
            onLaunch={onLaunchCloudFormation}
          />
          <EuiSpacer size="m" />
          <ManagedIntegrationsWidget
            servicesCount={servicesCount}
            onValidityChange={setManagedIntegrationsValid}
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
