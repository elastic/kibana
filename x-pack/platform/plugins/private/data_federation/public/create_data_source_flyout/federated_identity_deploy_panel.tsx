/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';

const LAUNCH_ICON: EuiIconType = 'external';

export interface FederatedIdentityDeployItem {
  id: string;
  label: string;
}

export interface FederatedIdentityDeployConfig {
  title: string;
  description: string;
  launchUrl: string;
  launchButtonLabel: string;
  createsTitle: string;
  createsItems: FederatedIdentityDeployItem[];
}

export function FederatedIdentityDeployPanel({
  config,
  testSubjPrefix,
}: {
  config: FederatedIdentityDeployConfig;
  testSubjPrefix: string;
}) {
  const createsAccordionId = useGeneratedHtmlId({ prefix: 'federatedIdentityDeployCreates' });
  const { title, description, launchUrl, launchButtonLabel, createsTitle, createsItems } = config;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="m"
      responsive={false}
      data-test-subj={`${testSubjPrefix}DeployPanel`}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="l" alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h4>{title}</h4>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              {description}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType={LAUNCH_ICON}
              iconSide="right"
              href={launchUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-test-subj={`${testSubjPrefix}DeployLaunchButton`}
            >
              {launchButtonLabel}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiAccordion
          id={createsAccordionId}
          buttonContent={<EuiText size="s">{createsTitle}</EuiText>}
          paddingSize="s"
          data-test-subj={`${testSubjPrefix}DeployCreates`}
        >
          <EuiText size="xs" color="subdued">
            <ol>
              {createsItems.map(({ id, label }) => (
                <li key={id}>{label}</li>
              ))}
            </ol>
          </EuiText>
        </EuiAccordion>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
