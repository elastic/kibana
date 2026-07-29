/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  isFavoriteIntegration,
  toggleFavoriteIntegration,
  useFavoriteIntegrations,
} from '@kbn/entity-centric-lab-flyout';
import type { FakeIntegration } from './fake_integrations';
import { countEnabledRecommended, useIntegrationAssetsVersion } from './integration_assets_store';

/**
 * Every recommended asset id for an integration (alert rules + SLO templates) —
 * the pool that can be enabled to raise the "Enabled assets" progress.
 */
export const getRecommendedAssetIds = (integration: FakeIntegration): string[] => [
  ...integration.alertRules.recommended.map((rule) => rule.id),
  ...integration.sloTemplates.recommended.map((slo) => slo.id),
];

/**
 * Live "enabled assets" count = the seeded baseline plus any recommended
 * assets the user has since enabled. Re-computes when the asset store changes.
 */
export const useEnabledAssetCount = (integration: FakeIntegration): number => {
  useIntegrationAssetsVersion();
  return (
    integration.stats.enabledAssets +
    countEnabledRecommended(integration.id, getRecommendedAssetIds(integration))
  );
};

/** Star / unstar toggle. Subscribes so its filled/empty state stays in sync. */
export const StarToggleButton = ({
  integrationId,
  size = 'm',
}: {
  integrationId: string;
  size?: 'xs' | 's' | 'm';
}) => {
  useFavoriteIntegrations();
  const favorite = isFavoriteIntegration(integrationId);
  return (
    <EuiButtonIcon
      iconType={favorite ? 'starFilled' : 'starEmpty'}
      color={favorite ? 'primary' : 'text'}
      size={size}
      aria-label={
        favorite
          ? i18n.translate('xpack.streams.entityCentricLab.integrations.unstar', {
              defaultMessage: 'Remove from starred',
            })
          : i18n.translate('xpack.streams.entityCentricLab.integrations.star', {
              defaultMessage: 'Add to starred',
            })
      }
      onClick={() => toggleFavoriteIntegration(integrationId)}
      data-test-subj={`entityCentricLabIntegrationStar-${integrationId}`}
    />
  );
};

const StatTile = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'danger' | 'success' | 'default';
}) => (
  <EuiFlexItem grow={false} css={{ minWidth: 110 }}>
    <EuiText size="xs" color="subdued">
      {label}
    </EuiText>
    <EuiTitle size="s">
      <span>
        {tone === 'danger' ? (
          <EuiTextColor color="danger">{value}</EuiTextColor>
        ) : tone === 'success' ? (
          <EuiTextColor color="success">{value}</EuiTextColor>
        ) : (
          value
        )}
      </span>
    </EuiTitle>
  </EuiFlexItem>
);

/**
 * The headline stat row shared by the Overview cards and the detail page:
 * Dashboards / Data streams / Alerts in alert / Breaching SLOs / LLM jobs &
 * skills / Recommended resources / Enabled assets (with a progress bar).
 */
export const IntegrationStatRow = ({ integration }: { integration: FakeIntegration }) => {
  const enabledAssets = useEnabledAssetCount(integration);
  const { stats } = integration;
  return (
    <EuiFlexGroup gutterSize="xl" alignItems="flexStart" wrap responsive={false}>
      <StatTile
        label={i18n.translate('xpack.streams.entityCentricLab.integrations.stat.dashboards', {
          defaultMessage: 'Dashboards',
        })}
        value={stats.dashboards}
      />
      <StatTile
        label={i18n.translate('xpack.streams.entityCentricLab.integrations.stat.dataStreams', {
          defaultMessage: 'Data streams',
        })}
        value={stats.dataStreams}
      />
      <StatTile
        label={i18n.translate('xpack.streams.entityCentricLab.integrations.stat.alertsInAlert', {
          defaultMessage: 'Alerts in alert',
        })}
        value={stats.alertsInAlert}
        tone={stats.alertsInAlert > 0 ? 'danger' : 'default'}
      />
      <StatTile
        label={i18n.translate('xpack.streams.entityCentricLab.integrations.stat.breachingSlos', {
          defaultMessage: 'Breaching SLOs',
        })}
        value={stats.breachingSlos}
        tone={stats.breachingSlos > 0 ? 'danger' : 'success'}
      />
      <StatTile
        label={i18n.translate('xpack.streams.entityCentricLab.integrations.stat.llmJobsSkills', {
          defaultMessage: 'LLM jobs & skills',
        })}
        value={stats.llmJobsSkills}
      />
      <StatTile
        label={i18n.translate(
          'xpack.streams.entityCentricLab.integrations.stat.recommendedResources',
          {
            defaultMessage: 'Recommended resources',
          }
        )}
        value={stats.recommendedResources}
      />
      <EuiFlexItem grow={false} css={{ minWidth: 160 }}>
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.streams.entityCentricLab.integrations.stat.enabledAssets', {
            defaultMessage: 'Enabled assets',
          })}
        </EuiText>
        <EuiTitle size="s">
          <span>
            {enabledAssets}/{stats.totalAssets}
          </span>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiProgress
          value={enabledAssets}
          max={stats.totalAssets}
          size="s"
          color={enabledAssets >= stats.totalAssets ? 'success' : 'primary'}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/** Elastic.co integrations catalogue (opened in a new tab from the banner). */
const BROWSE_INTEGRATIONS_URL =
  'https://www.elastic.co/integrations/data-integrations?solution=observability';

/**
 * Persistent bottom banner nudging the user to browse the full integrations
 * catalogue. "Browse" opens the public Elastic integrations catalogue in a new
 * tab.
 */
export const BrowseMoreIntegrationsBanner = ({ onRemindLater }: { onRemindLater?: () => void }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      color="subdued"
      data-test-subj="entityCentricLabIntegrationsBrowseBanner"
    >
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="launch" size="l" color={euiTheme.colors.primary} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>
              {i18n.translate('xpack.streams.entityCentricLab.integrations.browse.title', {
                defaultMessage: 'Browse through more available integrations',
              })}
            </strong>
          </EuiText>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.streams.entityCentricLab.integrations.browse.body', {
              defaultMessage:
                'Browse through more of the 400+ integrations and add the ones you need to better monitor and troubleshoot your system.',
            })}
          </EuiText>
        </EuiFlexItem>
        {onRemindLater ? (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" onClick={onRemindLater}>
              {i18n.translate('xpack.streams.entityCentricLab.integrations.browse.remindLater', {
                defaultMessage: 'Remind me later',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            href={BROWSE_INTEGRATIONS_URL}
            target="_blank"
            iconType="popout"
            iconSide="right"
          >
            {i18n.translate('xpack.streams.entityCentricLab.integrations.browse.cta', {
              defaultMessage: 'Browse',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
