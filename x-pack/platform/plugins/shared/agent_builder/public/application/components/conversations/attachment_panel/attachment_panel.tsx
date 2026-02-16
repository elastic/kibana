/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButtonIcon,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

interface AttachmentPanelProps {
  onClose: () => void;
  attachmentId?: string;
}

export const AttachmentPanel: React.FC<AttachmentPanelProps> = ({ onClose, attachmentId }) => {
  const { euiTheme } = useEuiTheme();

  const headerStyles = css`
    padding: ${euiTheme.size.m};
    border-bottom: ${euiTheme.border.thin};
  `;

  const contentStyles = css`
    padding: ${euiTheme.size.m};
    overflow-y: auto;
    flex: 1;
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

      <EuiFlexItem grow css={contentStyles}>
        <EuiText>
          <p>Attachment ID: {attachmentId || 'No attachment selected'}</p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
