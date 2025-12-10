/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, useEuiOverflowScroll, useEuiScrollBar } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@kbn/react-query';
import type { VersionedAttachment } from '@kbn/onechat-common/attachments';
import {
  useHasActiveConversation,
  useConversationAttachments,
  useReferencedAttachmentIds,
} from '../../hooks/use_conversation';
import { ConversationInput } from './conversation_input/conversation_input';
import { ConversationRounds } from './conversation_rounds/conversation_rounds';
import { ConversationAttachmentsPanel } from './conversation_attachments_panel';
import { NewConversationPrompt } from './new_conversation_prompt';
import { useConversationId } from '../../context/conversation/use_conversation_id';
import { useShouldStickToBottom } from '../../context/conversation/use_should_stick_to_bottom';
import { useSendMessage } from '../../context/send_message/send_message_context';
import { useConversationScrollActions } from '../../hooks/use_conversation_scroll_actions';
import { useConversationStatus } from '../../hooks/use_conversation';
import { useSendPredefinedInitialMessage } from '../../hooks/use_initial_message';
import {
  conversationElementPaddingStyles,
  conversationElementWidthStyles,
  fullWidthAndHeightStyles,
} from './conversation.styles';
import { ScrollButton } from './scroll_button';
import { useAppLeave } from '../../context/app_leave_context';
import { useNavigationAbort } from '../../hooks/use_navigation_abort';
import { useConversationContext } from '../../context/conversation/conversation_context';
import { useOnechatServices } from '../../hooks/use_onechat_service';
import { useAttachmentViewer } from '../../hooks/use_attachment_viewer';
import { queryKeys } from '../../query_keys';

export const Conversation: React.FC<{}> = () => {
  const conversationId = useConversationId();
  const hasActiveConversation = useHasActiveConversation();
  const { isResponseLoading } = useSendMessage();
  const { isFetched } = useConversationStatus();
  const shouldStickToBottom = useShouldStickToBottom();
  const onAppLeave = useAppLeave();
  const { isEmbeddedContext } = useConversationContext();
  const conversationAttachments = useConversationAttachments();
  const referencedAttachmentIds = useReferencedAttachmentIds();
  const { conversationsService } = useOnechatServices();
  const queryClient = useQueryClient();

  // Handler to update an attachment (creates new version)
  const handleUpdateAttachment = useCallback(
    async (attachmentId: string, content: unknown, description?: string) => {
      if (!conversationId) {
        throw new Error('No conversation ID');
      }
      try {
        const result = await conversationsService.updateAttachment({
          conversationId,
          attachmentId,
          data: content,
          description,
        });
        // Invalidate the conversation query to refresh attachments
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.byId(conversationId) });
        // Return the updated attachment
        return result.attachment as VersionedAttachment;
      } catch (error) {
        // TODO: Show error toast
        console.error('Failed to update attachment:', error);
        throw error; // Re-throw so the viewer can show error
      }
    },
    [conversationId, conversationsService, queryClient]
  );

  // Handler to rename an attachment (update description without creating new version)
  const handleRenameAttachment = useCallback(
    async (attachmentId: string, description: string) => {
      if (!conversationId) {
        throw new Error('No conversation ID');
      }
      try {
        const result = await conversationsService.renameAttachment({
          conversationId,
          attachmentId,
          description,
        });
        // Invalidate the conversation query to refresh attachments
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.byId(conversationId) });
        // Return the updated attachment
        return result.attachment as VersionedAttachment;
      } catch (error) {
        // TODO: Show error toast
        console.error('Failed to rename attachment:', error);
        throw error; // Re-throw so the viewer can show error
      }
    },
    [conversationId, conversationsService, queryClient]
  );

  // Hook to open attachment viewer flyout
  const { openViewer: openAttachmentViewer } = useAttachmentViewer({
    attachments: conversationAttachments,
    onUpdate: handleUpdateAttachment,
    onRename: handleRenameAttachment,
  });

  useSendPredefinedInitialMessage();

  useNavigationAbort({
    onAppLeave,
    isResponseLoading,
  });

  // Handler to delete a conversation-level attachment (soft delete)
  const handleDeleteAttachment = useCallback(
    async (attachmentId: string) => {
      if (!conversationId) return;
      try {
        await conversationsService.deleteAttachment({ conversationId, attachmentId, permanent: false });
        // Invalidate the conversation query to refresh attachments
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.byId(conversationId) });
      } catch (error) {
        // TODO: Show error toast
        console.error('Failed to delete attachment:', error);
      }
    },
    [conversationId, conversationsService, queryClient]
  );

  // Handler to permanently delete a conversation-level attachment
  const handlePermanentDeleteAttachment = useCallback(
    async (attachmentId: string) => {
      if (!conversationId) return;
      try {
        await conversationsService.deleteAttachment({ conversationId, attachmentId, permanent: true });
        // Invalidate the conversation query to refresh attachments
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.byId(conversationId) });
      } catch (error) {
        // TODO: Show error toast
        console.error('Failed to permanently delete attachment:', error);
      }
    },
    [conversationId, conversationsService, queryClient]
  );

  // Handler to restore a previously deleted attachment
  const handleRestoreAttachment = useCallback(
    async (attachmentId: string) => {
      if (!conversationId) return;
      try {
        await conversationsService.restoreAttachment({ conversationId, attachmentId });
        // Invalidate the conversation query to refresh attachments
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.byId(conversationId) });
      } catch (error) {
        // TODO: Show error toast
        console.error('Failed to restore attachment:', error);
      }
    },
    [conversationId, conversationsService, queryClient]
  );

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const {
    showScrollButton,
    scrollToMostRecentRoundBottom,
    scrollToMostRecentRoundTop,
    stickToBottom,
  } = useConversationScrollActions({
    isResponseLoading,
    conversationId: conversationId || '',
    scrollContainer: scrollContainerRef.current,
  });

  const scrollContainerHeight = scrollContainerRef.current?.clientHeight ?? 0;

  // Stick to bottom only when user returns to an existing conversation (conversationId is defined and changes)
  useEffect(() => {
    if (isFetched && conversationId && shouldStickToBottom) {
      requestAnimationFrame(() => {
        stickToBottom();
      });
    }
  }, [stickToBottom, isFetched, conversationId, shouldStickToBottom]);

  const containerStyles = css`
    ${fullWidthAndHeightStyles}
  `;

  // Necessary to position the scroll button absolute to the container.
  const scrollWrapperStyles = css`
    ${fullWidthAndHeightStyles}
    position: relative;
    min-height: 0;
  `;

  const scrollableStyles = css`
    ${useEuiScrollBar()}
    ${useEuiOverflowScroll('y', isEmbeddedContext ? false : true)}
  `;

  if (!hasActiveConversation) {
    return <NewConversationPrompt />;
  }

  return (
    <EuiFlexGroup direction="column" alignItems="center" css={containerStyles}>
      <EuiFlexItem grow={true} css={scrollWrapperStyles}>
        <EuiFlexGroup
          direction="column"
          alignItems="center"
          ref={scrollContainerRef}
          css={scrollableStyles}
        >
          <EuiFlexItem css={[conversationElementWidthStyles, conversationElementPaddingStyles]}>
            <ConversationRounds
              scrollContainerHeight={scrollContainerHeight}
              conversationAttachments={conversationAttachments}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        {showScrollButton && <ScrollButton onClick={scrollToMostRecentRoundBottom} />}
      </EuiFlexItem>
      {/* Conversation-level attachments panel */}
      {conversationAttachments && conversationAttachments.length > 0 && (
        <EuiFlexItem
          css={[conversationElementWidthStyles, conversationElementPaddingStyles]}
          grow={false}
        >
          <ConversationAttachmentsPanel
            attachments={conversationAttachments}
            referencedAttachmentIds={referencedAttachmentIds}
            onDeleteAttachment={handleDeleteAttachment}
            onPermanentDeleteAttachment={handlePermanentDeleteAttachment}
            onRestoreAttachment={handleRestoreAttachment}
            onOpenAttachmentViewer={openAttachmentViewer}
            autoCollapse
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem
        css={[conversationElementWidthStyles, conversationElementPaddingStyles]}
        grow={false}
      >
        <ConversationInput onSubmit={scrollToMostRecentRoundTop} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
