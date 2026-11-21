/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { CommentItem, InvestigationRecord } from '../../../../common/investigations/types';
import { useInvestigationToasts } from '../../hooks';
import { ICONS } from '../../icons';
import { ActorBadge, RelativeTime } from '../shared';
import { TeamComposer } from './team_composer';
import type { PinnedClaim } from './use_claim_sources';
import type { TeamThread } from './use_team_discussion';
import * as i18n from './translations';

interface MessageBodyProps {
  comment: CommentItem;
  pinned: PinnedClaim | undefined;
  onPin: (comment: CommentItem) => void;
  /** Present for top-level messages: opens the reply composer. */
  onReply?: () => void;
  compact: boolean;
}

const MessageBody: React.FC<MessageBodyProps> = ({ comment, pinned, onPin, onReply, compact }) => {
  const { euiTheme } = useEuiTheme();
  const { showSuccess } = useInvestigationToasts();

  const copy = () => {
    void navigator.clipboard?.writeText(comment.text ?? '').then(() => showSuccess(i18n.COPIED));
  };

  return (
    <div data-test-subj={`investigationTeamMessage-${comment.ref}`}>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <ActorBadge actor={comment.created_by} compact />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <RelativeTime value={comment.created_at} />
          </EuiText>
        </EuiFlexItem>
        {pinned ? (
          <EuiFlexItem grow={false}>
            <EuiBadge
              color="success"
              iconType={ICONS.pinned}
              data-test-subj="investigationTeamMessagePinned"
            >
              {i18n.PINNED(pinned.ref)}
            </EuiBadge>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <div
        css={css`
          margin-block-start: ${euiTheme.size.xs};
          padding-inline-start: ${compact ? 0 : euiTheme.size.xl};
          overflow-wrap: anywhere;
        `}
      >
        <EuiMarkdownFormat textSize="s">{comment.text ?? ''}</EuiMarkdownFormat>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
          {onReply ? (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                iconType={ICONS.thread}
                onClick={onReply}
                data-test-subj="investigationTeamMessageReply"
              >
                {i18n.REPLY_IN_THREAD}
              </EuiButtonEmpty>
            </EuiFlexItem>
          ) : null}
          {pinned ? null : (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                iconType={ICONS.pin}
                aria-label={i18n.PIN_AS_CLAIM_ARIA}
                onClick={() => onPin(comment)}
                data-test-subj="investigationTeamMessagePin"
              >
                {i18n.PIN_AS_CLAIM}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiToolTip content={i18n.COPY_MESSAGE} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType={ICONS.copy}
                size="xs"
                color="text"
                aria-label={i18n.COPY_MESSAGE}
                onClick={copy}
                data-test-subj="investigationTeamMessageCopy"
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  );
};
MessageBody.displayName = 'MessageBody';

export interface TeamMessageProps {
  record: InvestigationRecord;
  thread: TeamThread;
  pinnedClaims: Map<string, PinnedClaim>;
  onPin: (comment: CommentItem) => void;
  compact: boolean;
}

/** One message with its replies behind an "N replies" toggle and a reply box. */
export const TeamMessage: React.FC<TeamMessageProps> = ({
  record,
  thread,
  pinnedClaims,
  onPin,
  compact,
}) => {
  const { euiTheme } = useEuiTheme();
  const { message, replies } = thread;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isReplying, setIsReplying] = useState(false);

  const showReplies = isExpanded || isReplying;

  return (
    <div
      css={css`
        padding-block: ${euiTheme.size.s};
      `}
      data-test-subj="investigationTeamThread"
    >
      <MessageBody
        comment={message}
        pinned={pinnedClaims.get(message.id)}
        onPin={onPin}
        onReply={() => {
          setIsReplying(true);
          setIsExpanded(true);
        }}
        compact={compact}
      />
      {replies.length > 0 ? (
        <div
          css={css`
            padding-inline-start: ${compact ? euiTheme.size.s : euiTheme.size.xl};
          `}
        >
          <EuiButtonEmpty
            size="xs"
            iconType={isExpanded ? ICONS.chevronDown : ICONS.chevronRight}
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((expanded) => !expanded)}
            data-test-subj="investigationTeamRepliesToggle"
          >
            {i18n.REPLIES(replies.length)}
          </EuiButtonEmpty>
        </div>
      ) : null}
      {showReplies ? (
        <div
          css={css`
            margin-inline-start: ${compact ? euiTheme.size.s : euiTheme.size.xl};
            padding-inline-start: ${euiTheme.size.m};
            border-inline-start: ${euiTheme.border.thin};
          `}
          data-test-subj="investigationTeamReplies"
        >
          {isExpanded
            ? replies.map((reply) => (
                <div
                  key={reply.id}
                  css={css`
                    padding-block: ${euiTheme.size.s};
                  `}
                >
                  <MessageBody
                    comment={reply}
                    pinned={pinnedClaims.get(reply.id)}
                    onPin={onPin}
                    compact
                  />
                </div>
              ))
            : null}
          {isReplying ? (
            <div
              css={css`
                padding-block: ${euiTheme.size.s};
              `}
            >
              <TeamComposer
                record={record}
                parentId={message.id}
                placeholder={i18n.REPLY_PLACEHOLDER}
                ariaLabel={i18n.REPLY_PLACEHOLDER}
                onSent={() => {
                  setIsReplying(false);
                  setIsExpanded(true);
                }}
                onCancel={() => setIsReplying(false)}
                data-test-subj="investigationTeamReplyComposer"
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
TeamMessage.displayName = 'TeamMessage';
