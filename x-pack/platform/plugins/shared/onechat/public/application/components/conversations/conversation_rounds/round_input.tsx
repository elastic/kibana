/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiPanel,
  useEuiTheme,
  euiTextBreakWord,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useCallback } from 'react';
import type { Attachment, VersionedAttachment } from '@kbn/onechat-common/attachments';
import { ROUNDED_BORDER_RADIUS_LARGE } from '../conversation.styles';
import { AttachmentPillsRow } from '../conversation_input/attachment_pills_row';
import { useAttachmentViewer } from '../../../hooks/use_attachment_viewer';

const labels = {
  userMessage: i18n.translate('xpack.onechat.round.userInput', {
    defaultMessage: 'User input',
  }),
};

interface RoundInputProps {
  input: string;
  attachments?: Attachment[];
  conversationAttachments?: VersionedAttachment[];
}

export const RoundInput = ({ input, attachments, conversationAttachments }: RoundInputProps) => {
  const { euiTheme } = useEuiTheme();

  // Use the attachment viewer hook with conversation-level versioned attachments
  const { openViewer } = useAttachmentViewer({
    attachments: conversationAttachments,
  });

  const handleAttachmentClick = useCallback(
    (attachmentId: string) => {
      // Debug logging to understand why click might not work
      console.log('[AttachmentClick] Clicked attachment:', attachmentId);
      console.log('[AttachmentClick] Available conversationAttachments:', conversationAttachments);
      console.log(
        '[AttachmentClick] Match found:',
        conversationAttachments?.find((a) => a.id === attachmentId)
      );
      openViewer(attachmentId);
    },
    [openViewer, conversationAttachments]
  );

  const backgroundColorStyle = {
    background: `linear-gradient(
          90deg,
          ${euiTheme.colors.backgroundBasePrimary} 0%,
          ${euiTheme.colors.backgroundBasePrimary} 70%,
          ${euiTheme.colors.backgroundBaseSubdued} 100%
        )`,
  };

  const inputContainerStyles = css`
    align-self: end;
    max-inline-size: 90%;
    background: ${backgroundColorStyle.background};
    ${euiTextBreakWord()}
    white-space: pre-wrap;
    border-radius: ${`${ROUNDED_BORDER_RADIUS_LARGE} ${ROUNDED_BORDER_RADIUS_LARGE} 0 ${ROUNDED_BORDER_RADIUS_LARGE}`};
  `;

  const visibleAttachments = useMemo(() => {
    if (!attachments) return [];
    return attachments.filter((attachment) => !attachment.hidden);
  }, [attachments]);

  return (
    <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexEnd">
      <EuiPanel
        css={inputContainerStyles}
        paddingSize="m"
        hasShadow={false}
        hasBorder={false}
        aria-label={labels.userMessage}
      >
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiText size="m">{input}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      {visibleAttachments.length > 0 && (
        <EuiFlexItem grow={false}>
          <AttachmentPillsRow
            attachments={visibleAttachments}
            onAttachmentClick={conversationAttachments ? handleAttachmentClick : undefined}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
