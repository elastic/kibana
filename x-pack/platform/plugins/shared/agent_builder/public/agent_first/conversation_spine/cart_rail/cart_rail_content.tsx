/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import { headerHeight } from '../../../application/components/conversations/conversation.styles';
import { ConversationTitle } from '../../../application/components/conversations/conversation_header/conversation_title';
import type { AttachmentsService } from '../../../services/attachments/attachements_service';
import { useOptionalConversationSpineContext } from '../conversation_spine_context';
import { GenericConversationSpine } from '../generic_conversation_spine';
import { useEscapeKeyHandler } from '../hooks/use_escape_key_handler';

const emptyLabels = {
  close: i18n.translate('xpack.agentBuilder.conversationSpine.attachmentsEmptyOverlay.close', {
    defaultMessage: 'Close',
  }),
  body: i18n.translate('xpack.agentBuilder.conversationSpine.attachmentsEmptyOverlay.body', {
    defaultMessage:
      'No pinned items yet. Open an app and click the pin button to add content to this conversation.',
  }),
};

interface CartRailContentProps {
  attachmentsService: AttachmentsService;
}

export const CartRailContent: React.FC<CartRailContentProps> = ({ attachmentsService }) => {
  const { euiTheme } = useEuiTheme();
  const spineContext = useOptionalConversationSpineContext();
  const hasAttachments = spineContext?.hasAttachments ?? false;
  const isSpineActive = spineContext?.isSpineActive ?? false;
  const isAttachmentsEmptyOpen = spineContext?.isAttachmentsEmptyOpen ?? false;
  const closeAttachmentsEmptyOverlay =
    spineContext?.closeAttachmentsEmptyOverlay ?? (() => undefined);

  const isEmptyOpen = isAttachmentsEmptyOpen && !hasAttachments;

  const onEscapeEmpty = useCallback(() => {
    closeAttachmentsEmptyOverlay();
  }, [closeAttachmentsEmptyOverlay]);

  useEscapeKeyHandler(onEscapeEmpty, isEmptyOpen);

  if (hasAttachments && isSpineActive) {
    return <GenericConversationSpine attachmentsService={attachmentsService} />;
  }

  if (!isEmptyOpen) {
    return null;
  }

  const headerStyles = css`
    flex-shrink: 0;
    box-sizing: border-box;
    border-bottom: ${euiTheme.border.thin};
    border-color: ${euiTheme.colors.borderBaseSubdued};
    background: ${euiTheme.colors.backgroundBasePlain};
    padding-inline: ${euiTheme.size.m};
    min-height: calc(${headerHeight}px - ${euiTheme.border.width.thin});
  `;

  const contentStyles = css`
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  const rootStyles = css`
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    height: 100%;
    background: ${euiTheme.colors.backgroundBasePlain};
  `;

  return (
    <div css={rootStyles} data-test-subj="agentBuilderAttachmentsEmptyOverlay">
      <div css={headerStyles}>
        <EuiFlexGroup
          responsive={false}
          alignItems="center"
          justifyContent="spaceBetween"
          style={{ minHeight: `calc(${headerHeight}px - ${euiTheme.border.width.thin})` }}
        >
          <EuiFlexItem grow={false} style={{ minWidth: 0 }}>
            <ConversationTitle
              showBadge={false}
              showSidebarTrigger={false}
              showTitleMenu={false}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={emptyLabels.close} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="cross"
                aria-label={emptyLabels.close}
                color="text"
                size="s"
                onClick={closeAttachmentsEmptyOverlay}
                data-test-subj="agentBuilderAttachmentsEmptyOverlayClose"
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
      <div css={contentStyles}>
        <EuiEmptyPrompt icon={<EuiIcon type="paperClip" size="xl" />} body={emptyLabels.body} />
      </div>
    </div>
  );
};
