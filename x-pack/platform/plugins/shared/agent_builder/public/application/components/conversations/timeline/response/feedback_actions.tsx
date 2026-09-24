/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { TimelineEventType } from '@kbn/agent-builder-common';
import { useConversationId } from '../../../../context/conversation/use_conversation_id';
import { useConversation } from '../../../../hooks/use_conversation';
import { ThumbButton } from './feedback_controls/thumb_button';
import { FeedbackModal } from './feedback_controls/feedback_modal';
import { UpInvite } from './feedback_controls/up_invite';
import { FeedbackSubmitted } from './feedback_controls/feedback_submitted';
import { useFeedback } from './feedback_controls/use_feedback';

interface FeedbackActionsProps {
  roundId: string;
}

const fadingStyle = css`
  opacity: 0;
  transition: opacity 0.5s ease-out;
`;

export const FeedbackActions: React.FC<FeedbackActionsProps> = ({ roundId }) => {
  const conversationId = useConversationId();
  const { conversation } = useConversation();

  const serverVote = useMemo(() => {
    let vote: 'up' | 'down' | null = null;
    for (const event of conversation?.events ?? []) {
      if (event.type === TimelineEventType.roundFeedback) {
        const data = event.data as { round_id: string; vote: 'up' | 'down' | null } | null;
        if (data?.round_id === roundId) {
          vote = data.vote;
        }
      }
    }
    return vote;
  }, [conversation?.events, roundId]);

  const {
    vote,
    chips,
    comment,
    modalOpen,
    inviteVisible,
    submitted,
    submittedFading,
    isSubmitting,
    setVote,
    toggleChip,
    setComment,
    openModal,
    closeModal,
    dismissInvite,
    submit,
  } = useFeedback(conversationId ?? '', roundId, serverVote);

  if (!conversationId) return null;

  return (
    <>
      <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center" responsive={false}>
        {submitted ? (
          <EuiFlexItem grow={false} css={submittedFading ? fadingStyle : undefined}>
            <FeedbackSubmitted />
          </EuiFlexItem>
        ) : inviteVisible ? (
          <EuiFlexItem grow={false}>
            <UpInvite onTellUsMore={openModal} onDismiss={dismissInvite} />
          </EuiFlexItem>
        ) : (
          <>
            <EuiFlexItem grow={false}>
              <ThumbButton
                direction="up"
                isActive={vote === 'up'}
                isDisabled={isSubmitting}
                onClick={() => setVote('up')}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ThumbButton
                direction="down"
                isActive={vote === 'down'}
                isDisabled={isSubmitting}
                onClick={() => setVote('down')}
              />
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>

      {modalOpen && vote && (
        <FeedbackModal
          vote={vote}
          chips={chips}
          comment={comment}
          isSubmitting={isSubmitting}
          onToggleChip={toggleChip}
          onCommentChange={setComment}
          onSubmit={submit}
          onClose={closeModal}
        />
      )}
    </>
  );
};
