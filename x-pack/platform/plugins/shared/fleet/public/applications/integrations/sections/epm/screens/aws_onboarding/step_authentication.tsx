/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
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
  EuiSelect,
  EuiSpacer,
  EuiTabbedContent,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

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

const PanelHeader: React.FunctionComponent<{
  iconType: string;
  title: string;
  servicesCount: number;
}> = ({ iconType, title, servicesCount }) => (
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
);

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

      <EuiPanel hasBorder paddingSize="l" data-test-subj="awsOnboardingDeploymentMethodPanel">
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
      </EuiPanel>

      <EuiHorizontalRule margin="l" />

      {deploymentMethod === 'agent' ? (
        <EuiPanel hasBorder paddingSize="l">
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
          <EuiFormRow label="Access Key ID" fullWidth>
            <EuiFieldPassword type="dual" fullWidth aria-label="Access Key ID" />
          </EuiFormRow>
          <EuiFormRow label="Secret Access Key" fullWidth>
            <EuiFieldPassword type="dual" fullWidth aria-label="Secret Access Key" />
          </EuiFormRow>
        </EuiPanel>
      ) : (
        <>
          <EuiPanel hasBorder paddingSize="l">
            <PanelHeader
              iconType="rocket"
              title="Elastic Cloud Forwarder"
              servicesCount={servicesCount}
            />
            <EuiSpacer size="m" />
            <EuiText size="s">
              <p>
                Log collection via a single AWS CloudFormation stack — no agents required. Trigger
                source (S3 or CloudWatch) is configured per service in Service settings.
              </p>
            </EuiText>
          </EuiPanel>
          <EuiSpacer size="m" />
          <EuiPanel hasBorder paddingSize="l">
            <PanelHeader iconType="wrench" title="Managed Integrations" servicesCount={1} />
            <EuiSpacer size="m" />
            <EuiText size="s">
              <p>
                Utilize AWS Access Keys or Federated Identity to set up and deploy your AWS
                account. Refer to our <EuiLink>Getting Started</EuiLink> guide for details.
              </p>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiTabbedContent
              size="s"
              tabs={[
                {
                  id: 'identity_federation',
                  name: 'Identity Federation',
                  content: (
                    <>
                      <EuiSpacer size="m" />
                      <EuiFormRow label="Federated Identity Name" fullWidth>
                        <EuiFieldText
                          fullWidth
                          placeholder="e.g.: elastic-forwarder-prod"
                          aria-label="Federated Identity Name"
                        />
                      </EuiFormRow>
                    </>
                  ),
                },
                {
                  id: 'access_keys',
                  name: 'Access Keys',
                  content: (
                    <>
                      <EuiSpacer size="m" />
                      <EuiFormRow label="Access key ID" fullWidth>
                        <EuiFieldText fullWidth aria-label="Access key ID" />
                      </EuiFormRow>
                      <EuiFormRow label="Secret access key" fullWidth>
                        <EuiFieldPassword type="dual" fullWidth aria-label="Secret access key" />
                      </EuiFormRow>
                    </>
                  ),
                },
              ]}
            />
          </EuiPanel>
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
