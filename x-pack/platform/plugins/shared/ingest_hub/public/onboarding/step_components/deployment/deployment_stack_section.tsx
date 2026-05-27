/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiPanel,
  EuiSpacer,
  EuiTabbedContent,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { CloudOnboardingDeployment } from '@kbn/fleet-plugin/common/types/models/cloud_onboarding_deployment';
import type { StackMechanism, RequiredStack } from './compute_required_stacks';

interface DeploymentStackSectionProps {
  stack: RequiredStack;
  deployment: CloudOnboardingDeployment | null;
  prepareResult: {
    templateUrl: string;
    templateParameters: Record<string, string>;
    cliCommand: string;
    apiKeyId?: string;
  } | null;
  isPreparingOrCreating: boolean;
  onConfirmDeployed: () => void;
  onRetry: () => void;
}

const MECHANISM_TITLES: Record<StackMechanism, string> = {
  identity_federation: 'Deploy Identity Federation',
  firehose: 'Deploy Firehose',
  cloud_forwarder: 'Deploy Cloud Forwarder',
};

const MECHANISM_CALLOUTS: Record<StackMechanism, string> = {
  identity_federation:
    'Creates an IAM role for OIDC-based identity federation between your AWS account and Elastic.',
  firehose:
    'Creates a Firehose delivery stream that sends data directly to your Elastic deployment.',
  cloud_forwarder:
    'Deploys the EDOT Cloud Forwarder Lambda function to collect logs from S3 and CloudWatch.',
};

const AWS_CONSOLE_TAB_ID = 'aws-console';
const AWS_CLI_TAB_ID = 'aws-cli';

const getStatusHealth = (
  deployment: CloudOnboardingDeployment | null
): { color: 'subdued' | 'primary' | 'success' | 'danger'; label: string } => {
  if (!deployment) {
    return { color: 'subdued', label: 'Not started' };
  }

  switch (deployment.status) {
    case 'pending':
      return { color: 'subdued', label: 'Pending' };
    case 'deploying':
      return { color: 'primary', label: 'Deploying...' };
    case 'succeeded':
      return { color: 'success', label: 'Succeeded' };
    case 'failed':
      return { color: 'danger', label: 'Failed' };
  }
};

export const DeploymentStackSection: React.FC<DeploymentStackSectionProps> = ({
  stack,
  deployment,
  prepareResult,
  isPreparingOrCreating,
  onConfirmDeployed,
  onRetry,
}) => {
  const [selectedTabId, setSelectedTabId] = useState(AWS_CONSOLE_TAB_ID);

  const templateUrl = prepareResult?.templateUrl;
  useEffect(() => {
    if (templateUrl) {
      setSelectedTabId(AWS_CONSOLE_TAB_ID);
    }
  }, [templateUrl]);

  const onTabClick = useCallback((tab: { id: string }) => {
    setSelectedTabId(tab.id);
  }, []);

  const statusHealth = getStatusHealth(deployment);

  const tabs = prepareResult
    ? [
        {
          id: AWS_CONSOLE_TAB_ID,
          name: 'AWS Console',
          content: (
            <>
              <EuiText size="s">
                <a href={prepareResult.templateUrl}>Download the CloudFormation template</a>
              </EuiText>
              <EuiSpacer size="m" />
              <EuiText size="s">
                <strong>Template parameters</strong>
              </EuiText>
              <EuiSpacer size="s" />
              <dl>
                {Object.entries(prepareResult.templateParameters).map(([key, value]) => (
                  <React.Fragment key={key}>
                    <dt>
                      <EuiText size="s">
                        <strong>{key}</strong>
                      </EuiText>
                    </dt>
                    <dd>
                      <EuiText size="s">{value}</EuiText>
                    </dd>
                    <EuiSpacer size="s" />
                  </React.Fragment>
                ))}
              </dl>
            </>
          ),
        },
        {
          id: AWS_CLI_TAB_ID,
          name: 'AWS CLI',
          content: (
            <EuiCodeBlock language="bash" isCopyable data-test-subj="cliCommandBlock">
              {prepareResult.cliCommand}
            </EuiCodeBlock>
          ),
        },
      ]
    : [];

  const renderActions = () => {
    if (isPreparingOrCreating) {
      return (
        <EuiButton isLoading fill>
          Preparing deployment...
        </EuiButton>
      );
    }

    if (deployment?.status === 'failed') {
      return (
        <>
          {deployment.statusMessage ? (
            <>
              <EuiText color="danger" size="s">
                {deployment.statusMessage}
              </EuiText>
              <EuiSpacer size="m" />
            </>
          ) : null}
          <EuiButton color="warning" onClick={onRetry} data-test-subj="retryDeploymentButton">
            Retry
          </EuiButton>
        </>
      );
    }

    if (deployment?.status === 'succeeded') {
      return null;
    }

    if (prepareResult && (deployment?.status === 'pending' || deployment?.status === 'deploying')) {
      return (
        <EuiButton fill onClick={onConfirmDeployed} data-test-subj="confirmDeployedButton">
          I&apos;ve created the stack
        </EuiButton>
      );
    }

    return null;
  };

  const actions = renderActions();

  return (
    <EuiPanel
      paddingSize="l"
      hasBorder
      data-test-subj={`deploymentStackSection-${stack.mechanism}`}
    >
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{MECHANISM_TITLES[stack.mechanism]}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHealth color={statusHealth.color}>{statusHealth.label}</EuiHealth>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="s" wrap responsive={false}>
        {stack.services.map((service) => (
          <EuiFlexItem grow={false} key={service.id}>
            <EuiBadge>{service.name}</EuiBadge>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiCallOut color="primary" iconType="iInCircle">
        <p>{MECHANISM_CALLOUTS[stack.mechanism]}</p>
      </EuiCallOut>

      {prepareResult ? (
        <>
          <EuiSpacer size="m" />
          <EuiTabbedContent
            tabs={tabs}
            selectedTab={tabs.find((tab) => tab.id === selectedTabId)}
            onTabClick={onTabClick}
          />
        </>
      ) : null}

      {actions ? (
        <>
          <EuiSpacer size="m" />
          {actions}
        </>
      ) : null}
    </EuiPanel>
  );
};
