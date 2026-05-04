/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { labels } from '../../../utils/i18n';
import { useToolService } from '../../../hooks/tools/use_tools';
import { RenderMarkdownReadOnly } from '../common/render_markdown_read_only';

interface ToolReadOnlyFlyoutProps {
  toolId: string;
  onClose: () => void;
}

export const ToolReadOnlyFlyout: React.FC<ToolReadOnlyFlyoutProps> = ({ toolId, onClose }) => {
  const { tool, isLoading } = useToolService(toolId);

  return (
    <EuiFlyout onClose={onClose} size="m" aria-labelledby="toolReadOnlyFlyoutTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h2 id="toolReadOnlyFlyoutTitle">{tool?.id ?? toolId}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" iconType="lock">
              {labels.agentTools.readOnlyBadge}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {isLoading ? (
          <EuiFlexGroup justifyContent="center" alignItems="center">
            <EuiLoadingSpinner size="l" />
          </EuiFlexGroup>
        ) : tool ? (
          <EuiFlexGroup direction="column" gutterSize="l">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxxs">
                <h4>{labels.agentTools.toolDetailIdLabel}</h4>
              </EuiTitle>
              <EuiText size="s">{tool.id}</EuiText>
            </EuiFlexItem>
            <EuiHorizontalRule margin="none" />
            <EuiFlexItem grow={false}>
              <RenderMarkdownReadOnly
                content={tool.description ?? ''}
                label={labels.agentTools.toolDetailDescriptionLabel}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : null}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
