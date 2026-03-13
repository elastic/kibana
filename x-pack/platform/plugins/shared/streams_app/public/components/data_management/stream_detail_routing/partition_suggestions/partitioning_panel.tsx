/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiTitle, EuiText, EuiFlexItem, EuiSpacer, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { AssetImage } from '../../../asset_image';

interface PartitioningPanelProps {
  message: string;
  children?: React.ReactNode;
}

export function PartitioningPanel({ message, children }: PartitioningPanelProps) {
  return (
    <EuiPanel
      hasBorder
      grow={false}
      css={css`
        text-align: left;
      `}
      paddingSize="l"
    >
      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem>
          <EuiTitle size="m">
            <h4>
              {i18n.translate(
                'xpack.streams.streamDetailView.routingTab.noDataEmptyPrompt.panelTitle',
                {
                  defaultMessage: 'Partition your data',
                }
              )}
            </h4>
          </EuiTitle>
          <EuiText size="s">{message}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AssetImage type="routingSuggestionEmptyState" size={100} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {children}
    </EuiPanel>
  );
}
