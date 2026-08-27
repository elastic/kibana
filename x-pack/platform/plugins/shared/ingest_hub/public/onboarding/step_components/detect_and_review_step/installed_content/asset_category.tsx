/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { AssetRow } from './asset_row';

interface AssetCategoryProps {
  categoryId: string;
  titleId: string;
  defaultTitle: string;
  assets: Array<{ id: string; title: string; appLink?: string }>;
}

export function AssetCategory({ categoryId, titleId, defaultTitle, assets }: AssetCategoryProps) {
  const assetCount = i18n.translate(
    'xpack.ingestHub.detectAndReviewStep.installedContent.category.assetCount',
    {
      defaultMessage: '{count, plural, one {# asset} other {# assets}}',
      values: { count: assets.length },
    }
  );

  return (
    <div data-test-subj={`assetCategory-${categoryId}`}>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiTitle size="xxs">
          <h4>
            <FormattedMessage id={titleId} defaultMessage={defaultTitle} />
          </h4>
        </EuiTitle>
        <EuiText size="xs" color="subdued">
          {assetCount}
        </EuiText>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {assets.map((asset) => (
        <React.Fragment key={asset.id}>
          <AssetRow id={asset.id} title={asset.title} appLink={asset.appLink} />
          <EuiSpacer size="xs" />
        </React.Fragment>
      ))}
    </div>
  );
}
