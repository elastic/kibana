/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAccordion, EuiBadge, EuiFlexGroup, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { EsAssetReference } from '@kbn/fleet-plugin/common';

/**
 * Derive a human-readable sub-label from an ES asset id.
 * `metrics-aws.config@package` → `aws.config`
 * Transform ids (no type-dataset prefix) yield undefined.
 */
function deriveEsSubLabel(id: string): string | undefined {
  const match = id.match(/^(?:logs|metrics)-(.+?)(?:@.+)?$/);
  return match ? match[1] : undefined;
}

interface RequiredAssetsProps {
  esAssets: EsAssetReference[];
}

export function RequiredAssets({ esAssets }: RequiredAssetsProps) {
  const assetCount = i18n.translate(
    'xpack.ingestHub.detectAndReviewStep.installedContent.category.assetCount',
    {
      defaultMessage: '{count, plural, one {# asset} other {# assets}}',
      values: { count: esAssets.length },
    }
  );

  return (
    <EuiAccordion
      id="required-assets"
      initialIsOpen={false}
      isDisabled
      extraAction={
        <EuiText size="xs" color="subdued">
          {assetCount}
        </EuiText>
      }
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiTitle size="xxs">
            <h4>
              <FormattedMessage
                id="xpack.ingestHub.detectAndReviewStep.installedContent.requiredAssets.title"
                defaultMessage="Required assets"
              />
            </h4>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.ingestHub.detectAndReviewStep.installedContent.requiredAssets.label"
              defaultMessage="Installed with the package — cannot be removed"
            />
          </EuiText>
        </EuiFlexGroup>
      }
      data-test-subj="requiredAssets-accordion"
    >
      <EuiSpacer size="s" />
      {esAssets.map((asset) => {
        const subLabel = deriveEsSubLabel(asset.id);
        return (
          <EuiFlexGroup key={asset.id} alignItems="center" gutterSize="s" responsive={false}>
            <EuiText size="s">{asset.id}</EuiText>
            {subLabel && (
              <EuiText size="xs" color="subdued">
                {subLabel}
              </EuiText>
            )}
            <EuiBadge iconType="check" color="hollow">
              <FormattedMessage
                id="xpack.ingestHub.detectAndReviewStep.installedContent.assetRow.installed"
                defaultMessage="Installed"
              />
            </EuiBadge>
          </EuiFlexGroup>
        );
      })}
    </EuiAccordion>
  );
}
