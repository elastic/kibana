/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiButtonIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { AttachmentPanelContent } from './attachment_panel_content';
import { AttachmentNavigator } from './attachment_navigator';

interface AttachmentPanelProps {
  onClose: () => void;
  attachmentId?: string;
}

export const AttachmentPanel: React.FC<AttachmentPanelProps> = ({ onClose, attachmentId }) => {
  const { euiTheme } = useEuiTheme();
  const [isPanelHovered, setIsPanelHovered] = useState(false);

  const handlePanelMouseEnter = useCallback(() => setIsPanelHovered(true), []);
  const handlePanelMouseLeave = useCallback(() => setIsPanelHovered(false), []);

  const headerStyles = css`
    padding: ${euiTheme.size.m};
    border-bottom: ${euiTheme.border.thin};
  `;

  const contentContainerStyles = css`
    position: relative;
    flex: 1;
    min-height: 0;
  `;

  const contentStyles = css`
    padding: ${euiTheme.size.m};
    overflow-y: auto;
    height: 100%;
  `;

  return (
    <EuiFlexGroup direction="column" gutterSize="none" style={{ height: '100%' }}>
      <EuiFlexItem grow={false} css={headerStyles}>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h3>Canvas Mode (3)</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon size="s" onClick={onClose} iconType="cross" aria-label="Close panel" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem
        grow
        css={contentContainerStyles}
        onMouseEnter={handlePanelMouseEnter}
        onMouseLeave={handlePanelMouseLeave}
      >
        <div css={contentStyles}>
          <AttachmentPanelContent attachmentId={attachmentId} />
        </div>
        <AttachmentNavigator isPanelHovered={isPanelHovered} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
