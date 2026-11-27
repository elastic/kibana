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
import React, { useState } from 'react';
import type { ConversationRoundAuthor, ConversationRoundOrigin } from '@kbn/agent-builder-common';
import type {
  Attachment,
  AttachmentVersionRef,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { AttachmentType, ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { useHasMultipleAuthors } from '../../../../hooks/use_has_multiple_authors';
import { useUserMessageAuthor } from '../../../../hooks/use_user_message_author';
import { ResponseActions } from '../response/response_actions';
import { AttachmentReferences } from '../attachments/attachment_references';
import { UserMessageText } from './user_message_text';
import { UserMessageAuthor } from './user_message_author';
import { AuthorTime } from '../author_header';
import { UserMessageImages } from './user_message_images';
import { useUserMessageThumbnails } from './use_user_message_thumbnails';

const labels = {
  userMessage: i18n.translate('xpack.agentBuilder.userMessage.userInput', {
    defaultMessage: 'User input',
  }),
};

interface UserMessageProps {
  input: string;
  author?: ConversationRoundAuthor;
  isPendingCurrentRound: boolean;
  origin?: ConversationRoundOrigin;
  startedAt: string;
  attachmentRefs?: AttachmentVersionRef[];
  conversationAttachments?: VersionedAttachment[];
  fallbackAttachments?: Attachment[];
}

/** Keeps a long message narrower than the timeline, so it still reads as right-aligned. */
const BUBBLE_MAX_INLINE_SIZE = '70%';

const EXCLUDE_IMAGE_TYPES: AttachmentType[] = [AttachmentType.image];
const USER_ACTOR_FILTER = [ATTACHMENT_REF_ACTOR.user];

export const UserMessage = ({
  input,
  author,
  isPendingCurrentRound,
  origin,
  startedAt,
  attachmentRefs,
  conversationAttachments,
  fallbackAttachments,
}: UserMessageProps) => {
  const { euiTheme } = useEuiTheme();
  const [isHovering, setIsHovering] = useState(false);
  const [hoveredImageName, setHoveredImageName] = useState<string | null>(null);
  const { profile: authorProfile, name: authorName } = useUserMessageAuthor({
    author,
    origin,
    isPendingCurrentRound,
  });
  const hasMultipleAuthors = useHasMultipleAuthors();
  // While one person has written every message, naming them adds nothing. A message from an
  // external system is the exception: its author is not the person reading it here.
  const showAuthor = hasMultipleAuthors || Boolean(origin);
  const thumbnails = useUserMessageThumbnails({
    attachmentRefs,
    conversationAttachments,
    fallbackAttachments,
    actorFilter: USER_ACTOR_FILTER,
  });

  const hasText = input.trim().length > 0;
  const hasBubble = hasText || thumbnails.length > 0;

  const bubbleColumnStyles = css`
    max-inline-size: ${BUBBLE_MAX_INLINE_SIZE};
  `;

  const bubbleStyles = css`
    ${euiTextBreakWord()}
    white-space: pre-wrap;
    border-radius: ${euiTheme.size.base};
    padding: ${euiTheme.size.m} ${euiTheme.size.base};
  `;

  // The time is shown on demand, with the actions, so the timeline stays quiet at rest.
  const timeStyles = css`
    opacity: ${isHovering ? 1 : 0};
    transition: opacity ${euiTheme.animation.fast} ease;

    &:focus-within {
      opacity: 1;
    }
  `;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="xs"
      alignItems="flexEnd"
      responsive={false}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      data-test-subj="agentBuilderUserMessageLayout"
    >
      {showAuthor && (
        <EuiFlexItem grow={false}>
          <UserMessageAuthor profile={authorProfile} name={authorName} origin={origin} />
        </EuiFlexItem>
      )}
      {hasBubble && (
        <EuiFlexItem
          grow={false}
          css={bubbleColumnStyles}
          data-test-subj="agentBuilderUserMessageContent"
        >
          <EuiPanel
            css={bubbleStyles}
            color="plain"
            hasShadow={false}
            hasBorder
            aria-label={labels.userMessage}
          >
            <EuiFlexGroup direction="column" gutterSize="s">
              <UserMessageImages thumbnails={thumbnails} hoveredImageName={hoveredImageName} />
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <UserMessageText text={input} onHoverImage={setHoveredImageName} />
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      )}
      <AttachmentReferences
        attachmentRefs={attachmentRefs}
        conversationAttachments={conversationAttachments}
        fallbackAttachments={fallbackAttachments}
        actorFilter={USER_ACTOR_FILTER}
        justifyContent="flexEnd"
        excludeTypes={EXCLUDE_IMAGE_TYPES}
      />
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false} css={timeStyles} data-test-subj="agentBuilderUserMessageTime">
            <EuiText size="xs">
              <AuthorTime startedAt={startedAt} />
            </EuiText>
          </EuiFlexItem>
          {hasText && (
            <EuiFlexItem grow={false}>
              <ResponseActions content={input} isVisible={isHovering} copyTarget="prompt" />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
