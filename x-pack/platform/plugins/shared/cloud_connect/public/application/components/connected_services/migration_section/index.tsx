/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiTitle,
  EuiText,
  EuiTextColor,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiCard,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useCloudConnectedAppContext } from '../../../app_context';

export const MigrationSection: React.FC = () => {
  const { docLinks, telemetryService } = useCloudConnectedAppContext();
  const { euiTheme } = useEuiTheme();

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
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.cloudConnect.connectedServices.migration.title"
                defaultMessage="Move your self-managed workloads to Elastic Cloud"
              />
            </h3>
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
            href={docLinks.links.cloud.cloudConnect}
            target="_blank"
            iconType="popout"
            iconSide="right"
            onClick={() => {
              // Track telemetry for migration learn more link
              telemetryService.trackLinkClicked({
                destination_type: 'migration_docs',
              });
            }}
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
          <EuiFlexItem
            key={index}
            css={css`
              @media (min-width: ${euiTheme.breakpoint.m}px) {
                & + & {
                  position: relative;

                  &::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 50%;
                    transform: translateY(-50%);
                    height: 100px;
                    width: 1px;
                    background-color: ${euiTheme.colors.borderBaseSubdued};
                    z-index: 1;
                  }
                }
              }
            `}
          >
            <EuiCard
              hasBorder={false}
              paddingSize="l"
              layout="horizontal"
              title={benefit.title}
              description={<EuiTextColor color="subdued">{benefit.description}</EuiTextColor>}
              titleSize="xs"
              css={css`
                box-shadow: none !important;
                ${index === 0 && 'padding-left: 0 !important;'}

                @media (max-width: ${euiTheme.breakpoint.m - 1}px) {
                  padding-left: 0 !important;
                }
              `}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </>
  );
};
