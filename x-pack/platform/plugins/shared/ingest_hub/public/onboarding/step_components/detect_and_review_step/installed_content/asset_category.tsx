/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiIcon,
  EuiNotificationBadge,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { AssetRow } from './asset_row';

interface AssetCategoryProps {
  categoryId: string;
  titleId: string;
  defaultTitle: string;
  /** EUI icon shown beside the category title. Caller-supplied so this stays generic. */
  iconType: string;
  assets: Array<{ id: string; title: string; appLink?: string }>;
}

export function AssetCategory({
  categoryId,
  titleId,
  defaultTitle,
  iconType,
  assets,
}: AssetCategoryProps) {
  const installedLabel = i18n.translate(
    'xpack.ingestHub.detectAndReviewStep.installedContent.category.installedCount',
    {
      defaultMessage: '{count} of {total} installed',
      values: { count: assets.length, total: assets.length },
    }
  );

  return (
    <EuiAccordion
      id={`assetCategory-${categoryId}`}
      initialIsOpen={false}
      extraAction={
        <EuiText size="xs" color="subdued">
          {installedLabel}
        </EuiText>
      }
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiIcon type={iconType} size="m" aria-hidden />
          <EuiTitle size="xxs">
            <h4>
              <FormattedMessage id={titleId} defaultMessage={defaultTitle} />
            </h4>
          </EuiTitle>
          <EuiNotificationBadge color="subdued">{assets.length}</EuiNotificationBadge>
        </EuiFlexGroup>
      }
      data-test-subj={`assetCategory-${categoryId}`}
    >
      <EuiSpacer size="s" />
      {assets.map((asset) => (
        <React.Fragment key={asset.id}>
          <AssetRow id={asset.id} title={asset.title} appLink={asset.appLink} />
          <EuiSpacer size="xs" />
        </React.Fragment>
      ))}
    </EuiAccordion>
  );
}
