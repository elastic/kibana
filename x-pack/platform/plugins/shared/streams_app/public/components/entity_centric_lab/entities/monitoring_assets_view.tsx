/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiCard,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInMemoryTable,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EntityCategoryId } from './fake_entities';
import { getCategoryDescriptor } from './fake_entities';
import {
  MONITORING_ASSET_TYPES,
  getCategoryMonitoringAssets,
  type InstalledAsset,
  type MonitoringAssetType,
  type RecommendedAsset,
} from './monitoring_assets';

interface Props {
  readonly category: EntityCategoryId;
}

const AssetTypeBadge = ({ type }: { type: MonitoringAssetType }) => {
  const descriptor = MONITORING_ASSET_TYPES[type];
  return (
    <EuiBadge color="hollow" iconType={descriptor.icon}>
      {descriptor.label}
    </EuiBadge>
  );
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <EuiTitle size="xs">
    <h3>{children}</h3>
  </EuiTitle>
);

const InstalledAssetsSection = ({ assets }: { assets: readonly InstalledAsset[] }) => {
  const columns = useMemo<Array<EuiBasicTableColumn<InstalledAsset>>>(
    () => [
      {
        field: 'type',
        name: i18n.translate(
          'xpack.streams.entityCentricLab.monitoringAssets.installed.columns.type',
          { defaultMessage: 'Type' }
        ),
        width: '150px',
        render: (type: MonitoringAssetType) => <AssetTypeBadge type={type} />,
      },
      {
        field: 'name',
        name: i18n.translate(
          'xpack.streams.entityCentricLab.monitoringAssets.installed.columns.name',
          { defaultMessage: 'Name' }
        ),
        render: (name: string) => <EuiLink>{name}</EuiLink>,
      },
      {
        field: 'integration',
        name: i18n.translate(
          'xpack.streams.entityCentricLab.monitoringAssets.installed.columns.integration',
          { defaultMessage: 'Source' }
        ),
        width: '180px',
        render: (integration: string) => <EuiBadge color="hollow">{integration}</EuiBadge>,
      },
      {
        field: 'updatedAt',
        name: i18n.translate(
          'xpack.streams.entityCentricLab.monitoringAssets.installed.columns.updatedAt',
          { defaultMessage: 'Last updated' }
        ),
        width: '140px',
        render: (updatedAt: string) => (
          <EuiText size="s" color="subdued">
            {updatedAt}
          </EuiText>
        ),
      },
    ],
    []
  );

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <SectionTitle>
            {i18n.translate('xpack.streams.entityCentricLab.monitoringAssets.installed.title', {
              defaultMessage: 'Installed monitoring assets',
            })}
          </SectionTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{assets.length.toLocaleString()}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiInMemoryTable<InstalledAsset>
        tableCaption={i18n.translate(
          'xpack.streams.entityCentricLab.monitoringAssets.installed.caption',
          { defaultMessage: 'Monitoring assets already installed' }
        )}
        items={[...assets]}
        columns={columns}
        rowHeader="name"
        data-test-subj="entityCentricLabMonitoringAssetsInstalledTable"
      />
    </EuiPanel>
  );
};

const RecommendedAssetsSection = ({
  assets,
  integration,
}: {
  assets: readonly RecommendedAsset[];
  integration: string;
}) => (
  <EuiPanel hasBorder hasShadow={false} paddingSize="m">
    <EuiFlexGroup alignItems="baseline" gutterSize="s" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        <SectionTitle>
          {i18n.translate('xpack.streams.entityCentricLab.monitoringAssets.recommended.title', {
            defaultMessage: 'Recommended monitoring assets to install ({count})',
            values: { count: assets.length },
          })}
        </SectionTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.streams.entityCentricLab.monitoringAssets.recommended.subtitle', {
            defaultMessage: 'Curated from the {integration} integration',
            values: { integration },
          })}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="m" />
    <EuiFlexGrid columns={3} gutterSize="m">
      {assets.map((asset) => (
        <EuiFlexItem key={asset.id}>
          <EuiCard
            icon={<EuiIcon type={MONITORING_ASSET_TYPES[asset.type].icon} size="xl" />}
            titleSize="xs"
            title={asset.name}
            description={asset.description}
            betaBadgeProps={{ label: MONITORING_ASSET_TYPES[asset.type].label }}
            footer={
              <EuiButton
                size="s"
                iconType="plusInCircle"
                data-test-subj={`entityCentricLabMonitoringAssetsInstall-${asset.id}`}
              >
                {i18n.translate(
                  'xpack.streams.entityCentricLab.monitoringAssets.recommended.install',
                  { defaultMessage: 'Install' }
                )}
              </EuiButton>
            }
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  </EuiPanel>
);

/**
 * "Monitoring assets" tab for a category page. Renders two sections
 * driven entirely by the category's integration bundle:
 *   1. Monitoring assets already installed (dashboards, rules, SLOs, …).
 *   2. Recommended assets to install next, curated from the integration.
 * All data is static demo content from {@link getCategoryMonitoringAssets}.
 */
export const MonitoringAssetsView = ({ category }: Props) => {
  const { integration, installed, recommended } = useMemo(
    () => getCategoryMonitoringAssets(category),
    [category]
  );
  const categoryLabel = getCategoryDescriptor(category)?.label ?? category;

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.streams.entityCentricLab.monitoringAssets.intro', {
            defaultMessage:
              'Monitoring assets for {categoryLabel} come from the {integration} integration. See what\u2019s already installed, and what else you could be tracking.',
            values: { categoryLabel, integration },
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <InstalledAssetsSection assets={installed} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <RecommendedAssetsSection assets={recommended} integration={integration} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
