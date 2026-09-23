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
import { useUserMessageAuthor } from '../../../../hooks/use_user_message_author';
import { ResponseActions } from '../response/response_actions';
import { AttachmentReferences } from '../attachments/attachment_references';
import { UserMessageText } from './user_message_text';
import { UserMessageAvatar } from './user_message_avatar';
import { AuthorHeader } from '../author_header';
import { UserMessageImages } from './user_message_images';

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

const EXCLUDE_IMAGE_TYPES: AttachmentType[] = [AttachmentType.image];

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
  const {
    profile: authorProfile,
    name: authorName,
    isCurrentUser,
  } = useUserMessageAuthor({ author, origin, isPendingCurrentRound });

  const inputContainerStyles = css`
    width: 100%;
    background: ${isCurrentUser
      ? euiTheme.colors.backgroundLightPrimary
      : euiTheme.colors.backgroundLightText};
    ${euiTextBreakWord()}
    white-space: pre-wrap;
    border-radius: ${euiTheme.border.radius.small} ${euiTheme.size.base} ${euiTheme.size.base}
      ${euiTheme.size.base};
    padding: ${euiTheme.size.m} ${euiTheme.size.base};
  `;

  const inputContentStyles = css`
    inline-size: 100%;
  `;

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="flexStart"
      responsive={false}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      data-test-subj="agentBuilderUserMessageLayout"
    >
      <EuiFlexItem grow={false} data-test-subj="agentBuilderUserMessageAvatar">
        <UserMessageAvatar profile={authorProfile} name={authorName} />
      </EuiFlexItem>
      <EuiFlexItem
        grow={false}
        css={inputContentStyles}
        data-test-subj="agentBuilderUserMessageContent"
      >
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <AuthorHeader name={authorName} origin={origin} startedAt={startedAt} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiPanel
              css={inputContainerStyles}
              hasShadow={false}
              hasBorder={false}
              aria-label={labels.userMessage}
            >
              <EuiFlexGroup direction="column" gutterSize="s">
                <UserMessageImages
                  attachmentRefs={attachmentRefs}
                  conversationAttachments={conversationAttachments}
                  fallbackAttachments={fallbackAttachments}
                  actorFilter={[ATTACHMENT_REF_ACTOR.user]}
                  hoveredImageName={hoveredImageName}
                />
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <UserMessageText text={input} onHoverImage={setHoveredImageName} />
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
          <AttachmentReferences
            attachmentRefs={attachmentRefs}
            conversationAttachments={conversationAttachments}
            fallbackAttachments={fallbackAttachments}
            actorFilter={[ATTACHMENT_REF_ACTOR.user]}
            justifyContent="flexStart"
            excludeTypes={EXCLUDE_IMAGE_TYPES}
          />
          <EuiFlexItem grow={false}>
            <ResponseActions content={input} isVisible={isHovering} copyTarget="prompt" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
