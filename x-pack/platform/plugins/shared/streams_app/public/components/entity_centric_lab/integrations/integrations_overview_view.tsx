/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { StreamsAppPageTemplate } from '../../streams_app_page_template';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { getFakeIntegrations, type FakeIntegration } from './fake_integrations';
import {
  BrowseMoreIntegrationsBanner,
  IntegrationStatRow,
  LabBadge,
  StarToggleButton,
} from './integration_shared';

const IntegrationSummaryCard = ({
  integration,
  onOpen,
}: {
  integration: FakeIntegration;
  onOpen: (id: string) => void;
}) => (
  <EuiPanel
    hasBorder
    paddingSize="l"
    data-test-subj={`entityCentricLabIntegrationCard-${integration.id}`}
  >
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={integration.icon} size="l" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h3>{integration.name}</h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <StarToggleButton integrationId={integration.id} size="s" />
      </EuiFlexItem>
      <EuiFlexItem grow />
      <EuiFlexItem grow={false}>
        <EuiLink
          onClick={() => onOpen(integration.id)}
          data-test-subj={`entityCentricLabIntegrationCardViewDetails-${integration.id}`}
        >
          {i18n.translate('xpack.streams.entityCentricLab.integrations.viewDetails', {
            defaultMessage: 'View details',
          })}
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiHorizontalRule margin="m" />
    <IntegrationStatRow integration={integration} />
  </EuiPanel>
);

/**
 * Super-short-term lab: the starred integrations "Overview". Aggregates one
 * summary card per favorited integration; empty until the user stars some.
 */
export const IntegrationsOverviewView = () => {
  const router = useStreamsAppRouter();

  const openIntegration = useCallback(
    (integrationId: string) => {
      router.push('/integrations/{integrationId}', {
        path: { integrationId },
        query: {},
      });
    },
    [router]
  );

  const installedIntegrations = getFakeIntegrations();

  return (
    <>
      <StreamsAppPageTemplate.Header
        pageTitle={
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              {i18n.translate('xpack.streams.entityCentricLab.integrations.overviewTitle', {
                defaultMessage: 'All integrations',
              })}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <LabBadge />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      />
      <StreamsAppPageTemplate.Body>
        <EuiFlexGroup direction="column" gutterSize="l">
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.streams.entityCentricLab.integrations.overviewSubtitle', {
                defaultMessage:
                  '{count, plural, one {# installed integration} other {# installed integrations}}. Open one to see everything it ships.',
                values: { count: installedIntegrations.length },
              })}
            </EuiText>
          </EuiFlexItem>
          {installedIntegrations.map((integration) => (
            <EuiFlexItem grow={false} key={integration.id}>
              <IntegrationSummaryCard integration={integration} onOpen={openIntegration} />
            </EuiFlexItem>
          ))}
          <EuiFlexItem grow={false}>
            <EuiSpacer size="s" />
            <BrowseMoreIntegrationsBanner />
          </EuiFlexItem>
        </EuiFlexGroup>
      </StreamsAppPageTemplate.Body>
    </>
  );
};
