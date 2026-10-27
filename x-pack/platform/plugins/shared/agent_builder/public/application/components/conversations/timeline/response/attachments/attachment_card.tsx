/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSplitPanel } from '@elastic/eui';
import { css } from '@emotion/react';
import type { HeaderColor } from '@kbn/agent-builder-browser/attachments';
import { AB_PANEL_RADIUS } from '../../../../../../common.styles';
import { useHeaderColorTokens } from './header_color';

interface AttachmentCardProps {
  color?: HeaderColor;
  maxWidth?: number;
  children: React.ReactNode;
}

export const AttachmentCard: React.FC<AttachmentCardProps> = ({ color, maxWidth, children }) => {
  const { border } = useHeaderColorTokens(color);

  return (
    <EuiSplitPanel.Outer
      grow
      hasShadow={false}
      hasBorder={true}
      css={css`
        overflow: visible;
        border-color: ${border};
        border-radius: ${AB_PANEL_RADIUS}px;
        ${maxWidth !== undefined ? `max-width: ${maxWidth}px;` : ''}
      `}
    >
      {children}
    </EuiSplitPanel.Outer>
  );
};
