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
  EuiFlexItem,
  EuiIcon,
  EuiNotificationBadge,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EsAssetReference } from '@kbn/fleet-plugin/common';

const ES_TYPE_LABELS: Record<string, string> = {
  index_template: 'Index template',
  component_template: 'Component template',
  ingest_pipeline: 'Ingest pipeline',
  transform: 'Transform',
  ml_model: 'ML model',
  data_stream_ilm_policy: 'ILM policy',
  ilm_policy: 'ILM policy',
};

function esTypeLabel(type: string): string {
  return ES_TYPE_LABELS[type] ?? type;
}

interface RequiredAssetsProps {
  esAssets: EsAssetReference[];
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
        const typeLabel = esTypeLabel(asset.type);
        return (
          <React.Fragment key={asset.id}>
            <EuiPanel paddingSize="s" hasBorder hasShadow={false}>
              <EuiFlexGroup
                alignItems="center"
                justifyContent="spaceBetween"
                gutterSize="s"
                responsive={false}
              >
                <EuiFlexItem>
                  <EuiText size="s">
                    <strong>{asset.id}</strong>
                  </EuiText>
                  <EuiText size="xs" color="subdued">
                    {typeLabel}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge iconType="lock" color="hollow">
                    <FormattedMessage
                      id="xpack.ingestHub.detectAndReviewStep.installedContent.requiredAssets.badge"
                      defaultMessage="Required"
                    />
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
            <EuiSpacer size="xs" />
          </React.Fragment>
        );
      })}
    </EuiAccordion>
  );
}
