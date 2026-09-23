/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiIcon,
  EuiNotificationBadge,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { AssetTitleMap } from '@kbn/fleet-plugin/public';
import type { EnrichedEsAsset } from './use_installed_content';
import { AssetRow } from './asset_row';

interface RequiredAssetsProps {
  esAssets: EnrichedEsAsset[];
}

export function RequiredAssets({ esAssets }: RequiredAssetsProps) {
  return (
    <EuiAccordion
      id="required-assets"
      initialIsOpen={false}
      extraAction={
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.ingestHub.detectAndReviewStep.installedContent.requiredAssets.label"
            defaultMessage="Installed with the package — cannot be removed"
          />
        </EuiText>
      }
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiIcon type="lock" size="m" aria-hidden />
          <EuiTitle size="xxs">
            <h4>
              <FormattedMessage
                id="xpack.ingestHub.detectAndReviewStep.installedContent.requiredAssets.title"
                defaultMessage="Required assets"
              />
            </h4>
          </EuiTitle>
          <EuiNotificationBadge color="subdued">{esAssets.length}</EuiNotificationBadge>
        </EuiFlexGroup>
      }
      data-test-subj="requiredAssets-accordion"
    >
      <EuiSpacer size="s" />
      {esAssets.map((asset) => {
        const typeLabel = AssetTitleMap[asset.type as keyof typeof AssetTitleMap] ?? asset.type;
        return (
          <React.Fragment key={asset.id}>
            <AssetRow
              id={asset.id}
              title={asset.id}
              subLabel={typeLabel}
              appLink={asset.appLink}
              badge={
                <EuiBadge iconType="lock" color="hollow">
                  <FormattedMessage
                    id="xpack.ingestHub.detectAndReviewStep.installedContent.requiredAssets.badge"
                    defaultMessage="Required"
                  />
                </EuiBadge>
              }
            />
            <EuiSpacer size="xs" />
          </React.Fragment>
        );
      })}
    </EuiAccordion>
  );
}
