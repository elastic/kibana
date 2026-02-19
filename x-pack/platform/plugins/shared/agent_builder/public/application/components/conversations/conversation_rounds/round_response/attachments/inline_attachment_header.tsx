/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSplitPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ActionButton } from '@kbn/agent-builder-browser/attachments';
import { AttachmentActions } from './attachment_actions';

interface InlineAttachmentHeaderProps {
  label: string;
  actionButtons?: ActionButton[];
}

export const InlineAttachmentHeader: React.FC<InlineAttachmentHeaderProps> = ({
  label,
  actionButtons,
}) => {
  const { euiTheme } = useEuiTheme();

  const textStyles = css`
    font-weight: ${euiTheme.font.weight.semiBold};
  `;

  const headerStyles = css`
    border-bottom: ${euiTheme.border.thin};
    border-color: ${euiTheme.colors.borderBaseSubdued};
  `;

  if (!actionButtons || actionButtons.length === 0) {
    return null;
  }

  return (
    <EuiSplitPanel.Inner color="subdued" css={headerStyles}>
      <EuiFlexGroup responsive={false} justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText css={textStyles} size="s">
            {label}
          </EuiText>
        </EuiFlexItem>
        {<AttachmentActions buttons={actionButtons} />}
      </EuiFlexGroup>
    </EuiSplitPanel.Inner>
  );
};
