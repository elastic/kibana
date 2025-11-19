/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiPanel,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const MigrationSection: React.FC = () => {
  const benefits = [
    {
      title: (
        <FormattedMessage
          id="xpack.cloudConnect.connectedServices.migration.fasterTimeToValue.title"
          defaultMessage="Get faster time to value"
        />
      ),
      description: (
        <FormattedMessage
          id="xpack.cloudConnect.connectedServices.migration.fasterTimeToValue.description"
          defaultMessage="Deploy in minutes on AWS, Google Cloud, or Azure. Ingest data easily with built-in integrations and analyze everything in Kibana dashboards."
        />
      ),
    },
    {
      title: (
        <FormattedMessage
          id="xpack.cloudConnect.connectedServices.migration.improvePerformance.title"
          defaultMessage="Improve performance"
        />
      ),
      description: (
        <FormattedMessage
          id="xpack.cloudConnect.connectedServices.migration.improvePerformance.description"
          defaultMessage="Scale automatically to match demand and pay only for what you use. Optimize costs with low-cost storage tiers, and replicate/ search data across clouds for speed and reliability"
        />
      ),
    },
    {
      title: (
        <FormattedMessage
          id="xpack.cloudConnect.connectedServices.migration.accessInnovation.title"
          defaultMessage="Access innovation"
        />
      ),
      description: (
        <FormattedMessage
          id="xpack.cloudConnect.connectedServices.migration.accessInnovation.description"
          defaultMessage="Leverage the latest VM types, pick your ideal subscription, integrate with any cloud service, and upgrade with one click to unlock new features."
        />
      ),
    },
  ];

  return (
    <>
      <EuiSpacer size="xxl" />
      <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false} style={{ maxWidth: '50%' }}>
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.cloudConnect.connectedServices.migration.title"
                defaultMessage="Move your self-managed workloads to the Elastic Cloud"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.cloudConnect.connectedServices.migration.description"
                defaultMessage="Spin up a deployment and leave managing the infrastructure to us."
              />
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            color="text"
            size="s"
            href="https://www.elastic.co/cloud"
            target="_blank"
            iconType="popout"
            iconSide="right"
          >
            <FormattedMessage
              id="xpack.cloudConnect.connectedServices.migration.learnMore"
              defaultMessage="Learn more"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      <EuiFlexGroup gutterSize="l">
        {benefits.map((benefit, index) => (
          <EuiFlexItem key={index}>
            <EuiPanel color="subdued" paddingSize="l">
              <EuiTitle size="xs">
                <h3>{benefit.title}</h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                <p>{benefit.description}</p>
              </EuiText>
            </EuiPanel>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </>
  );
};
