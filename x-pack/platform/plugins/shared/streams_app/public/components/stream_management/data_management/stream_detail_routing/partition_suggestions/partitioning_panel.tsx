/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiTitle, EuiText, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { AssetImage } from '../../../../asset_image';

interface PartitioningPanelProps {
  message: string;
}

export function PartitioningPanel({ message }: PartitioningPanelProps) {
  return (
    <EuiPanel
      hasShadow={false}
      grow={false}
      css={css`
        text-align: left;
      `}
      paddingSize="none"
    >
      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem>
          <EuiTitle size="m">
            <h5>
              {i18n.translate(
                'xpack.streams.streamDetailView.routingTab.noDataEmptyPrompt.panelTitle',
                {
                  defaultMessage: 'Route your data into meaningful child streams',
                }
              )}
            </h5>
          </EuiTitle>
          <EuiText size="xs">{message}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AssetImage type="routingSuggestionEmptyState" size={100} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
