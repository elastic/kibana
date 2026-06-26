/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AttachmentHeader } from './attachment_header';
import { AttachmentCartGrid } from './attachment_cart_grid';
import { useActiveConversationAttachmentCount } from '../../../../../hooks/use_active_conversation_attachment_count';

const cartTitle = (count: number) =>
  i18n.translate('xpack.agentBuilder.attachmentCartPanel.title', {
    defaultMessage: 'Attachments ({count})',
    values: { count },
  });

export interface AttachmentCartPanelProps {
  onClose: () => void;
  squareBottomCorners?: boolean;
}

export const AttachmentCartPanel: React.FC<AttachmentCartPanelProps> = ({
  onClose,
  squareBottomCorners = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const attachmentCount = useActiveConversationAttachmentCount();

  const bodyStyles = css`
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    padding-top: ${euiTheme.size.m};
  `;

  return (
    <>
      <AttachmentHeader
        icon="paperClip"
        title={cartTitle(attachmentCount)}
        onClose={onClose}
        previewBadgeState="none"
        squareBottomCorners={squareBottomCorners}
      />
      <div css={bodyStyles}>
        <AttachmentCartGrid />
      </div>
    </>
  );
};
