/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
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
import { useFavoritesState } from '@kbn/entity-centric-lab-flyout';
import { StreamsAppPageTemplate } from '../../streams_app_page_template';
import { useStreamsAppParams } from '../../../hooks/use_streams_app_params';
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
 * Super-short-term lab: the integrations "Overview". By default it aggregates a
 * summary card per installed integration. When a `groupId` is supplied (the
 * per-group overview auto-created once a starred group holds more than one
 * integration), it scopes down to that group's members and titles the page with
 * the group name.
 */
export const IntegrationsOverviewView = ({ groupId }: { groupId?: string } = {}) => {
  const router = useStreamsAppRouter();
  const favoritesState = useFavoritesState();

  const openIntegration = useCallback(
    (integrationId: string) => {
      router.push('/integrations/{integrationId}', {
        path: { integrationId },
        query: {},
      });
    },
    [router]
  );

  const group = useMemo(
    () => (groupId ? favoritesState.groups.find((candidate) => candidate.id === groupId) : undefined),
    [favoritesState.groups, groupId]
  );

  const installedIntegrations = useMemo(() => {
    const all = getFakeIntegrations();
    if (!group) return all;
    // Preserve the group's member ordering, dropping any ids no longer installed.
    return group.integrationIds
      .map((id) => all.find((integration) => integration.id === id))
      .filter((integration): integration is FakeIntegration => Boolean(integration));
  }, [group]);

  const title = group
    ? group.name
    : i18n.translate('xpack.streams.entityCentricLab.integrations.overviewTitle', {
        defaultMessage: 'All integrations',
      });

  const subtitle = group
    ? i18n.translate('xpack.streams.entityCentricLab.integrations.groupOverviewSubtitle', {
        defaultMessage:
          '{count, plural, one {# integration} other {# integrations}} in this group. Open one to see everything it ships.',
        values: { count: installedIntegrations.length },
      })
    : i18n.translate('xpack.streams.entityCentricLab.integrations.overviewSubtitle', {
        defaultMessage:
          '{count, plural, one {# installed integration} other {# installed integrations}}. Open one to see everything it ships.',
        values: { count: installedIntegrations.length },
      });

  return (
    <>
      <StreamsAppPageTemplate.Header
        pageTitle={
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>{title}</EuiFlexItem>
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
              {subtitle}
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

/**
 * Route wrapper for `/integrations/groups/{groupId}` — reads the group id from
 * the path and renders the group-scoped overview.
 */
export const IntegrationGroupOverviewView = () => {
  const {
    path: { groupId },
  } = useStreamsAppParams('/integrations/groups/{groupId}');
  return <IntegrationsOverviewView groupId={groupId} />;
};
