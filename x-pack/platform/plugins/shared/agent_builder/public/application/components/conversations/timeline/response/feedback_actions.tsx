/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { useConversationId } from '../../../../context/conversation/use_conversation_id';
import { useConversation } from '../../../../hooks/use_conversation';
import { useCurrentUser } from '../../../../hooks/use_current_user';
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

const hiddenStyle = css`
  visibility: hidden;
  pointer-events: none;
`;

export const FeedbackActions: React.FC<FeedbackActionsProps> = ({ roundId }) => {
  const conversationId = useConversationId();
  const { conversation } = useConversation();
  const { currentUser } = useCurrentUser();
  const inviteRef = useRef<HTMLButtonElement>(null);

  const serverVote = useMemo(
    () => conversation?.feedback?.[roundId]?.vote ?? null,
    [conversation?.feedback, roundId]
  );

  const round = useMemo(
    () => conversation?.rounds.find((r) => r.id === roundId),
    [conversation?.rounds, roundId]
  );

  const ebtContext = useMemo(
    () => ({
      connectorId: round?.model_usage?.connector_id,
      model: round?.model_usage?.model,
      inputTokens: round?.model_usage?.input_tokens,
      outputTokens: round?.model_usage?.output_tokens,
      llmCalls: round?.model_usage?.llm_calls,
    }),
    [round]
  );

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
  } = useFeedback(conversationId ?? '', roundId, serverVote, ebtContext);

  useEffect(() => {
    if (inviteVisible) inviteRef.current?.focus();
  }, [inviteVisible]);

  const isOwner =
    Boolean(conversationId) &&
    Boolean(conversation?.user?.id) &&
    conversation?.user?.id === currentUser?.uid;

  const showInvite = inviteVisible || (modalOpen && vote === 'up');

  if (!isOwner) return null;

  return (
    <>
      <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center" responsive={false}>
        {submitted ? (
          <EuiFlexItem grow={false} css={submittedFading ? fadingStyle : undefined}>
            <FeedbackSubmitted />
          </EuiFlexItem>
        ) : showInvite ? (
          <EuiFlexItem grow={false} css={!inviteVisible ? hiddenStyle : undefined}>
            <UpInvite ref={inviteRef} onTellUsMore={openModal} onDismiss={dismissInvite} />
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
