/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { KibanaAssetReference, EsAssetReference } from '@kbn/fleet-plugin/common';
import { useInstalledContent } from './use_installed_content';
import { AssetCategory } from './asset_category';
import { RequiredAssets } from './required_assets';

interface InstalledContentProps {
  installedKibana: KibanaAssetReference[];
  installedEs: EsAssetReference[];
}

export function InstalledContent({ installedKibana, installedEs }: InstalledContentProps) {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(true);
  const [search, setSearch] = useState('');
  const contentId = useGeneratedHtmlId({ prefix: 'installedContent' });

  const { dashboards, detectionRules, esAssets } = useInstalledContent({
    installedKibana,
    installedEs,
  });

  const q = search.toLowerCase();
  const filteredDashboards = dashboards.filter((a) => a.title.toLowerCase().includes(q));
  const filteredRules = detectionRules.filter((a) => a.title.toLowerCase().includes(q));
  const filteredEsAssets = esAssets.filter((a) => a.id.toLowerCase().includes(q));

  // Assets come from the AWS package installation, which is shared across every selected service —
  // nothing in `installed_kibana` records which policy_template an asset came from, so this count
  // can't be per-service today. Tracked by https://github.com/elastic/ingest-dev/issues/9343.
  const assetCount = i18n.translate(
    'xpack.ingestHub.detectAndReviewStep.installedContent.assetCount',
    {
      defaultMessage: '{count, plural, one {# asset} other {# assets}}',
      values: { count: dashboards.length + detectionRules.length + esAssets.length },
    }
  );

  const panelCss = css`
    border: 1px solid ${euiTheme.colors.borderBaseSubdued};
  `;

  const headerButtonCss = css`
    display: block;
    width: 100%;
    text-align: left;
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    border: none;
    padding: ${euiTheme.size.l} ${euiTheme.size.m};
    cursor: pointer;
    border-bottom: ${isOpen ? `1px solid ${euiTheme.colors.borderBaseSubdued}` : 'none'};
  `;

  return (
    <EuiPanel paddingSize="none" css={panelCss} hasShadow={false} data-test-subj="installedContent">
      <button
        type="button"
        css={headerButtonCss}
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((v) => !v)}
        data-test-subj="installedContent-headerButton"
      >
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="dashboardApp" size="m" color="subdued" aria-hidden />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>
                <FormattedMessage
                  id="xpack.ingestHub.detectAndReviewStep.installedContent.title"
                  defaultMessage="Installed content"
                />
              </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {assetCount}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </button>

      {isOpen && (
        <div id={contentId} role="region">
          <EuiPanel paddingSize="m" hasBorder={false} hasShadow={false}>
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.ingestHub.detectAndReviewStep.installedContent.body"
                defaultMessage="Everything below was installed with the AWS integration. You can reinstall or remove content at any time from the integration's Assets tab. Required technical assets are listed separately at the bottom and cannot be removed."
              />
            </EuiText>
            <EuiSpacer size="m" />

            <EuiFieldSearch
              placeholder={i18n.translate(
                'xpack.ingestHub.detectAndReviewStep.installedContent.searchPlaceholder',
                { defaultMessage: 'Search content by name' }
              )}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-test-subj="installedContent-search"
              fullWidth
            />
            <EuiSpacer size="m" />

            {filteredDashboards.length > 0 && (
              <>
                <AssetCategory
                  categoryId="dashboards"
                  titleId="xpack.ingestHub.detectAndReviewStep.installedContent.category.dashboards"
                  defaultTitle="Dashboards"
                  iconType="dashboardApp"
                  assets={filteredDashboards}
                />
                <EuiSpacer size="m" />
              </>
            )}

            {filteredRules.length > 0 && (
              <>
                <AssetCategory
                  categoryId="detectionRules"
                  titleId="xpack.ingestHub.detectAndReviewStep.installedContent.category.detectionRules"
                  defaultTitle="Detection rules"
                  iconType="securityApp"
                  assets={filteredRules}
                />
                <EuiSpacer size="m" />
              </>
            )}

            {filteredEsAssets.length > 0 && <RequiredAssets esAssets={filteredEsAssets} />}
          </EuiPanel>
        </div>
      )}
    </EuiPanel>
  );
}
