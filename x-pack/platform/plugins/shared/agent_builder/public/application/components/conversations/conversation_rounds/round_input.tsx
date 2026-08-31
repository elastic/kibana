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
import type { ConversationRoundOrigin } from '@kbn/agent-builder-common';
import type {
  Attachment,
  AttachmentVersionRef,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { AB_PANEL_RADIUS } from '../../../../common.styles';
import { useCurrentUser } from '../../../hooks/use_current_user';
import { RoundResponseActions } from './round_response/round_response_actions';
import { RoundAttachmentReferences } from './round_attachment_references';
import { CommandBadgeText } from './command_badge_text';
import { RoundAuthorHeader } from './round_author_header';
import { getInputAuthor, isCurrentUserAuthor, type RoundAuthor } from './round_author';

const labels = {
  userMessage: i18n.translate('xpack.agentBuilder.round.userInput', {
    defaultMessage: 'User input',
  }),
};

interface RoundInputProps {
  input: string;
  author?: RoundAuthor;
  isPendingCurrentRound: boolean;
  origin?: ConversationRoundOrigin;
  startedAt: string;
  attachmentRefs?: AttachmentVersionRef[];
  conversationAttachments?: VersionedAttachment[];
  fallbackAttachments?: Attachment[];
}

export const RoundInput = ({
  input,
  author,
  isPendingCurrentRound,
  origin,
  startedAt,
  attachmentRefs,
  conversationAttachments,
  fallbackAttachments,
}: RoundInputProps) => {
  const { euiTheme } = useEuiTheme();
  const { currentUser } = useCurrentUser();
  const [isHovering, setIsHovering] = useState(false);
  const inputAuthor = getInputAuthor({ author, currentUser, isPendingCurrentRound });
  const isCurrentUser = isCurrentUserAuthor({ author: inputAuthor, currentUser });
  const hasAttachmentReferences = Boolean(attachmentRefs?.length || fallbackAttachments?.length);

  const inputContainerStyles = css`
    width: 100%;
    background: ${isCurrentUser
      ? euiTheme.colors.backgroundLightPrimary
      : euiTheme.colors.backgroundBaseSubdued};
    ${euiTextBreakWord()}
    white-space: pre-wrap;
    border-radius: 0 ${AB_PANEL_RADIUS}px ${AB_PANEL_RADIUS}px ${AB_PANEL_RADIUS}px;
    padding: ${euiTheme.size.m} ${euiTheme.size.base} ${euiTheme.size.m} ${euiTheme.size.xl};
  `;

  const inputContentStyles = css`
    inline-size: 100%;
  `;

  const stackItemSpacingStyles = css`
    margin-block-start: ${euiTheme.size.xxs};
  `;

  const actionContentStyles = css`
    inline-size: 100%;
    margin-block-start: ${euiTheme.size.xxs};
  `;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      alignItems="flexStart"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <EuiFlexItem grow={false} css={inputContentStyles}>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <RoundAuthorHeader author={inputAuthor} origin={origin} startedAt={startedAt} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiPanel
              css={inputContainerStyles}
              hasShadow={false}
              hasBorder={false}
              aria-label={labels.userMessage}
            >
              <EuiFlexGroup direction="column" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <CommandBadgeText text={input} />
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {hasAttachmentReferences && (
        <EuiFlexItem grow={false} css={stackItemSpacingStyles}>
          <RoundAttachmentReferences
            attachmentRefs={attachmentRefs}
            conversationAttachments={conversationAttachments}
            fallbackAttachments={fallbackAttachments}
            actorFilter={[ATTACHMENT_REF_ACTOR.user]}
            justifyContent="flexStart"
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false} css={actionContentStyles}>
        <RoundResponseActions
          content={input}
          isVisible={isHovering}
          copyTarget="prompt"
          actionStackGutterSize="none"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
