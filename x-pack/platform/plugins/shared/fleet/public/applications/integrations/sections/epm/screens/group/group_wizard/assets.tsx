/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: granular "assets to install". Replaces the all-or-nothing "Install content"
// checkbox: every Kibana asset a package installs (dashboards, saved searches, alert and SLO
// templates, ML jobs...) as a checklist grouped by type. Unchecked assets go to the install API
// as `skip_kibana_assets: [{ type, id }]`; Elasticsearch assets always install. Where this lives
// in the flow (here on review, or next to signals) is a design question.

import React from 'react';
import { css } from '@emotion/react';
import { useQueries } from '@kbn/react-query';
import {
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';

import type { PackageInfo } from '../../../../../../../types';
import type {
  KibanaAssetSelector,
  PackageKibanaAssetListItem,
  SkipKibanaAssets,
} from '../../../../../../../../common/types';
import { sendGetKibanaAssetListForRq } from '../../../../../../../hooks';
import { kibanaAssetKey } from '../../../../../../../../common/services';

const ASSET_TYPE_LABELS: Record<string, string> = {
  dashboard: 'Dashboards',
  visualization: 'Visualizations',
  lens: 'Lens visualizations',
  map: 'Maps',
  search: 'Saved searches',
  'index-pattern': 'Data views',
  alerting_rule_template: 'Alert templates',
  slo_template: 'SLO templates',
  'ml-module': 'Machine learning jobs',
  'security-rule': 'Security rules',
  'csp-rule-template': 'Posture rules',
  'osquery-pack-asset': 'Osquery packs',
  'osquery-saved-query': 'Osquery queries',
  tag: 'Tags',
};

export const getAssetTypeLabel = (type: string) =>
  ASSET_TYPE_LABELS[type] ?? type.replace(/[-_]/g, ' ').replace(/^./, (c) => c.toUpperCase());

/** Assets grouped by type, in label order with dashboards first. */
export const groupAssetsByType = (items: PackageKibanaAssetListItem[]) => {
  const order = Object.keys(ASSET_TYPE_LABELS);
  const types = [...new Set(items.map((i) => i.type))].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  return types.map((type) => ({ type, items: items.filter((i) => i.type === type) }));
};

/**
 * Install option for a package: undefined = everything (stock install), true = nothing, a list =
 * all but those.
 */
export const getSkipKibanaAssets = (
  items: PackageKibanaAssetListItem[] | undefined,
  skippedKeys: string[]
): SkipKibanaAssets | undefined => {
  if (!items?.length || !skippedKeys.length) return undefined;
  const skipped = items.filter((i) => skippedKeys.includes(kibanaAssetKey(i)));
  if (!skipped.length) return undefined;
  if (skipped.length === items.length) return true;
  return skipped.map(({ type, id }): KibanaAssetSelector => ({ type, id }));
};

/** Keys skipped by an installed package's saved choice. */
export const getInstalledSkippedKeys = (
  packageInfo: PackageInfo | undefined,
  items: PackageKibanaAssetListItem[] | undefined
): string[] => {
  const installation =
    packageInfo && 'installationInfo' in packageInfo ? packageInfo.installationInfo : undefined;
  if (installation?.skip_kibana_assets) return (items ?? []).map(kibanaAssetKey);
  return (installation?.skipped_kibana_assets ?? []).map(kibanaAssetKey);
};

/** "Installs" review text for one package. */
export const getAssetInstallText = (
  pkgLabel: string,
  items: PackageKibanaAssetListItem[],
  skippedKeys: string[]
): string => {
  const esText = 'Elasticsearch assets (index templates, ingest pipelines)';
  const selected = items.filter((i) => !skippedKeys.includes(kibanaAssetKey(i)));
  if (!selected.length) return `${pkgLabel}: ${esText} only.`;
  const byType = groupAssetsByType(selected)
    .map((g) => `${g.items.length} ${getAssetTypeLabel(g.type).toLowerCase()}`)
    .join(', ');
  return `${pkgLabel}: ${esText}, plus ${selected.length} of ${items.length} content assets (${byType}).`;
};

/** Asset lists for several packages (react-query cached per name + version). */
export const useKibanaAssetLists = (
  packages: Array<{ name: string; version: string } | undefined>
) => {
  const results = useQueries({
    queries: packages.map((pkg) => ({
      queryKey: ['kibana_asset_list', pkg?.name, pkg?.version],
      queryFn: () => sendGetKibanaAssetListForRq(pkg!.name, pkg!.version),
      enabled: !!pkg,
      refetchOnWindowFocus: false,
    })),
  });
  return results.map((r) => ({ items: r.data?.items, isLoading: r.isLoading }));
};

export const AssetChecklist: React.FC<{
  packageName: string;
  items?: PackageKibanaAssetListItem[];
  isLoading: boolean;
  skippedKeys: string[];
  onChange: (skippedKeys: string[]) => void;
  /** Installed package: its saved choice, read-only. */
  lockedReason?: string;
}> = ({ packageName, items, isLoading, skippedKeys, onChange, lockedReason }) => {
  const { euiTheme } = useEuiTheme();
  if (isLoading) return <EuiLoadingSpinner />;
  if (!items?.length) {
    return (
      <EuiText size="xs" color="subdued">
        No content in this package. Only Elasticsearch assets are installed.
      </EuiText>
    );
  }
  const isSkipped = (asset: PackageKibanaAssetListItem) =>
    skippedKeys.includes(kibanaAssetKey(asset));
  const setSkipped = (assets: PackageKibanaAssetListItem[], skip: boolean) => {
    const keys = assets.map(kibanaAssetKey);
    onChange(
      skip ? [...new Set([...skippedKeys, ...keys])] : skippedKeys.filter((k) => !keys.includes(k))
    );
  };
  const selectedCount = items.filter((i) => !isSkipped(i)).length;
  const disabled = !!lockedReason;

  return (
    <div data-test-subj={`groupWizardAssets-${packageName}`}>
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {selectedCount} of {items.length} selected
          </EuiText>
        </EuiFlexItem>
        {!disabled && (
          <>
            <EuiFlexItem grow={false}>
              <EuiLink onClick={() => setSkipped(items, false)}>Select all</EuiLink>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiLink onClick={() => setSkipped(items, true)}>Select none</EuiLink>
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
      {lockedReason && (
        <EuiText size="xs" color="subdued">
          {lockedReason}
        </EuiText>
      )}
      <EuiSpacer size="s" />
      <EuiPanel hasBorder paddingSize="m" css={css({ maxHeight: 360, overflowY: 'auto' })}>
        {groupAssetsByType(items).map(({ type, items: typeItems }, i) => {
          const selected = typeItems.filter((a) => !isSkipped(a)).length;
          return (
            <div key={type} css={css({ marginTop: i ? euiTheme.size.m : 0 })}>
              <EuiCheckbox
                id={`groupWizardAssetType-${packageName}-${type}`}
                data-test-subj={`groupWizardAssetType-${packageName}-${type}`}
                label={
                  <EuiText size="s">
                    <strong>{getAssetTypeLabel(type)}</strong> ({selected}/{typeItems.length})
                  </EuiText>
                }
                checked={selected === typeItems.length}
                indeterminate={selected > 0 && selected < typeItems.length}
                disabled={disabled}
                onChange={() => setSkipped(typeItems, selected === typeItems.length)}
              />
              <div
                css={css({
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: `${euiTheme.size.xs} ${euiTheme.size.l}`,
                  margin: `${euiTheme.size.xs} 0 0 ${euiTheme.size.l}`,
                })}
              >
                {typeItems.map((asset) => (
                  <EuiCheckbox
                    key={kibanaAssetKey(asset)}
                    id={`groupWizardAsset-${packageName}-${kibanaAssetKey(asset)}`}
                    data-test-subj={`groupWizardAsset-${asset.type}-${asset.id}`}
                    label={
                      <EuiText size="xs" title={asset.description}>
                        {asset.title}
                      </EuiText>
                    }
                    checked={!isSkipped(asset)}
                    disabled={disabled}
                    onChange={(e) => setSkipped([asset], !e.target.checked)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </EuiPanel>
    </div>
  );
};
