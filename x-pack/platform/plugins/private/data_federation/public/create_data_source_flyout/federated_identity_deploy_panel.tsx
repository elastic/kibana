/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

export function FederatedIdentityDeployPanel({
  cloudProviderIcon,
  title,
  description,
  launchUrl,
  launchButtonLabel,
  launchHint,
  createsTitle,
  createsItems,
  testSubjPrefix,
}: {
  cloudProviderIcon: 'logoAWS' | 'logoGoogleG' | 'logoAzure';
  title: string;
  description: string;
  launchUrl: string;
  launchButtonLabel: string;
  launchHint: string;
  createsTitle: string;
  createsItems: string[];
  testSubjPrefix: string;
}) {
  return (
    <>
      <EuiPanel hasBorder paddingSize="m" data-test-subj={`${testSubjPrefix}DeployPanel`}>
        <EuiFlexGroup responsive={false} gutterSize="m" alignItems="flexStart">
          <EuiFlexItem>
            <EuiFlexGroup responsive={false} gutterSize="m" alignItems="flexStart">
              <EuiFlexItem grow={false}>
                <EuiIcon type={cloudProviderIcon} size="xl" aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h4>{title}</h4>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText size="s" color="subdued">
                  <p>{description}</p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              color="primary"
              iconType="popout"
              iconSide="right"
              href={launchUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-test-subj={`${testSubjPrefix}DeployLaunchButton`}
            >
              {launchButtonLabel}
            </EuiButton>
            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued">
              {launchHint}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder paddingSize="m" data-test-subj={`${testSubjPrefix}DeployCreatesPanel`}>
        <EuiTitle size="xxs">
          <h5>{createsTitle}</h5>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued" as="div">
          <ol>
            {createsItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </EuiText>
      </EuiPanel>
    </>
  );
}
