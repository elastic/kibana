/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
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

// Elastic Cloud Forwarder widget — default (editable) state, then a
// post-launch state with disabled fields + deploying status copy.
const CloudFormationWidget: React.FunctionComponent<{ servicesCount: number }> = ({
  servicesCount,
}) => {
  const [identityName, setIdentityName] = useState('');
  const [isIdentityNameTouched, setIsIdentityNameTouched] = useState(false);
  const [region, setRegion] = useState('us-east');
  const [isLaunched, setIsLaunched] = useState(false);

  const isIdentityNameInvalid = isIdentityNameTouched && identityName.trim().length === 0;

  return (
    <EuiPanel hasBorder paddingSize="l" style={{ overflow: 'hidden' }}>
      <PanelHeader iconType="rocket" title="Elastic Cloud Forwarder" servicesCount={servicesCount} />
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
        isInvalid={isIdentityNameInvalid}
        error="Federated Identity Name is required"
        style={HALF_WIDTH}
        fullWidth
      >
        <EuiFieldText
          fullWidth
          placeholder="e.g.: elastic-forwarder-prod"
          value={identityName}
          onChange={(e) => setIdentityName(e.target.value)}
          onBlur={() => setIsIdentityNameTouched(true)}
          isInvalid={isIdentityNameInvalid}
          disabled={isLaunched}
          data-test-subj="awsOnboardingStep3IdentityName"
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
        style={HALF_WIDTH}
        fullWidth
      >
        <EuiSelect
          fullWidth
          options={REGION_OPTIONS}
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          disabled={isLaunched}
          aria-label="Select region"
        />
      </EuiFormRow>
      <EuiSpacer size="m" />

      {!isLaunched ? (
        <EuiButton
          iconType="popout"
          iconSide="right"
          isDisabled={identityName.trim().length === 0}
          onClick={() => setIsLaunched(true)}
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

type PreferredAccessMethod = 'identity_federation' | 'direct_access_keys';
type IdentityMode = 'new_identity' | 'existing_identity';

const PolicySecretsLink: React.FunctionComponent = () => (
  <EuiLink href="#" target="_blank" external>
    Learn more about policy secrets.
  </EuiLink>
);

// Setup access widget for the managed-integration path — a "Preferred method"
// dropdown (Identity Federation vs Direct Access Keys, defaults to Direct
// Access Keys) drives which credential form renders below. Within Identity
// Federation, New vs Existing identity is a radio choice, not tabs.
const SetupAccessWidget: React.FunctionComponent<{ servicesCount: number }> = ({
  servicesCount,
}) => {
  const [preferredMethod, setPreferredMethod] = useState<PreferredAccessMethod>(
    'direct_access_keys'
  );
  const [identityMode, setIdentityMode] = useState<IdentityMode>('new_identity');
  const [federatedIdentityName, setFederatedIdentityName] = useState('');
  const [isIdentityNameTouched, setIsIdentityNameTouched] = useState(false);

  const isIdentityNameInvalid = isIdentityNameTouched && federatedIdentityName.trim().length === 0;

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
            { value: 'direct_access_keys', text: 'Direct Access Keys' },
            { value: 'identity_federation', text: 'Identity Federation' },
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
                  onChange={(e) => setFederatedIdentityName(e.target.value)}
                  onBlur={() => setIsIdentityNameTouched(true)}
                  aria-label="Federated Identity Name"
                  data-test-subj="awsOnboardingFederatedIdentityName"
                />
              </EuiFormRow>
              <EuiSpacer size="s" />
              <EuiAccordion id="awsOnboardingStepsToAssumeRole" buttonContent="Steps to assume role">
                <EuiSpacer size="s" />
                <EuiText size="s" color="subdued">
                  <p>[Placeholder — content for these steps not yet provided.]</p>
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
                aria-label="Role ARN"
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
              <EuiFieldPassword type="dual" fullWidth aria-label="Access Key ID" />
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
              <EuiFieldPassword type="dual" fullWidth aria-label="Secret Access Key" />
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
}> = ({ servicesCount, deploymentMethod, onDeploymentMethodChange }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [pendingMethod, setPendingMethod] = useState<DeploymentMethod>(deploymentMethod);

  const openModal = () => {
    setPendingMethod(deploymentMethod);
    setIsEditModalOpen(true);
  };

  const meta = DEPLOYMENT_METHOD_META[deploymentMethod];
  const { euiTheme } = useEuiTheme();

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
            <EuiFieldPassword type="dual" fullWidth aria-label="Access Key ID" />
          </EuiFormRow>
          <EuiFormRow label="Secret Access Key" style={HALF_WIDTH} fullWidth>
            <EuiFieldPassword type="dual" fullWidth aria-label="Secret Access Key" />
          </EuiFormRow>
        </EuiPanel>
      ) : (
        <>
          <SetupAccessWidget servicesCount={servicesCount} />
          <EuiSpacer size="m" />
          <CloudFormationWidget servicesCount={servicesCount} />
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
