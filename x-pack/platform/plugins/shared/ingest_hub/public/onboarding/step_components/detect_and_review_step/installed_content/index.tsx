/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFieldSearch,
  EuiSpacer,
  EuiText,
  EuiTitle,
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
  const [search, setSearch] = useState('');
  const { dashboards, detectionRules, esAssets } = useInstalledContent({
    installedKibana,
    installedEs,
  });

  const q = search.toLowerCase();
  const filteredDashboards = dashboards.filter((a) => a.title.toLowerCase().includes(q));
  const filteredRules = detectionRules.filter((a) => a.title.toLowerCase().includes(q));

  const serviceCount = i18n.translate(
    'xpack.ingestHub.detectAndReviewStep.installedContent.serviceCount',
    {
      defaultMessage: '{count, plural, one {# service} other {# services}}',
      values: { count: 1 },
    }
  );

  return (
    <div data-test-subj="installedContent">
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.ingestHub.detectAndReviewStep.installedContent.title"
            defaultMessage="Installed content"
          />{' '}
          <EuiText component="span" size="s" color="subdued">
            {serviceCount}
          </EuiText>
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
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
            assets={filteredRules}
          />
          <EuiSpacer size="m" />
        </>
      )}

      {esAssets.length > 0 && <RequiredAssets esAssets={esAssets} />}
    </div>
  );
}
