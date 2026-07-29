/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiBetaBadge,
  EuiEmptyPrompt,
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
import { useFavoriteIntegrations } from '@kbn/entity-centric-lab-flyout';
import { StreamsAppPageTemplate } from '../../streams_app_page_template';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { getFakeIntegration, type FakeIntegration } from './fake_integrations';
import {
  BrowseMoreIntegrationsBanner,
  IntegrationStatRow,
  StarToggleButton,
} from './integration_shared';

const LAB_BADGE_LABEL = i18n.translate('xpack.streams.entityCentricLab.integrations.labBadge', {
  defaultMessage: 'LAB',
});

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
  const favoriteIds = useFavoriteIntegrations();

  const openIntegration = useCallback(
    (integrationId: string) => {
      router.push('/integrations/{integrationId}', {
        path: { integrationId },
        query: {},
      });
    },
    [router]
  );

  const starredIntegrations = favoriteIds
    .map((id) => getFakeIntegration(id))
    .filter((integration): integration is FakeIntegration => Boolean(integration));

  return (
    <>
      <StreamsAppPageTemplate.Header
        pageTitle={
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              {i18n.translate('xpack.streams.entityCentricLab.integrations.overviewTitle', {
                defaultMessage: 'Overview',
              })}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBetaBadge label={LAB_BADGE_LABEL} color="accent" size="s" />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      />
      <StreamsAppPageTemplate.Body>
        {starredIntegrations.length === 0 ? (
          <EuiEmptyPrompt
            iconType="starEmpty"
            title={
              <h2>
                {i18n.translate('xpack.streams.entityCentricLab.integrations.overviewEmptyTitle', {
                  defaultMessage: 'No starred integrations yet',
                })}
              </h2>
            }
            body={
              <p>
                {i18n.translate('xpack.streams.entityCentricLab.integrations.overviewEmptyBody', {
                  defaultMessage:
                    'Star an integration from the Infrastructure navigation to pin it here and see its assets, alerts, and recommendations at a glance.',
                })}
              </p>
            }
          />
        ) : (
          <EuiFlexGroup direction="column" gutterSize="l">
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {i18n.translate('xpack.streams.entityCentricLab.integrations.overviewSubtitle', {
                  defaultMessage:
                    '{count, plural, one {# starred integration} other {# starred integrations}}. Open one to see everything it ships.',
                  values: { count: starredIntegrations.length },
                })}
              </EuiText>
            </EuiFlexItem>
            {starredIntegrations.map((integration) => (
              <EuiFlexItem grow={false} key={integration.id}>
                <IntegrationSummaryCard integration={integration} onOpen={openIntegration} />
              </EuiFlexItem>
            ))}
            <EuiFlexItem grow={false}>
              <EuiSpacer size="s" />
              <BrowseMoreIntegrationsBanner />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </StreamsAppPageTemplate.Body>
    </>
  );
};
