/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import type { ConversationRoundFeedback } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { useRoundFeedback } from '../../../../hooks/use_round_feedback';

interface FeedbackActionsProps {
  conversationId: string;
  roundId: string;
  feedback?: ConversationRoundFeedback;
}

export const FeedbackActions: React.FC<FeedbackActionsProps> = ({
  conversationId,
  roundId,
  feedback,
}) => {
  const { submitFeedback, isSubmitting } = useRoundFeedback({ conversationId, roundId });

  const currentVote = feedback?.vote;

  const handleThumbUp = useCallback(() => {
    submitFeedback({ vote: currentVote === 'up' ? null : 'up' });
  }, [submitFeedback, currentVote]);

  const handleThumbDown = useCallback(() => {
    submitFeedback({ vote: currentVote === 'down' ? null : 'down' });
  }, [submitFeedback, currentVote]);

  const thumbUpLabel = i18n.translate('xpack.agentBuilder.feedbackActions.thumbUp', {
    defaultMessage: 'Good response',
  });

  const thumbDownLabel = i18n.translate('xpack.agentBuilder.feedbackActions.thumbDown', {
    defaultMessage: 'Bad response',
  });

  return (
    <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={thumbUpLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="thumbUp"
            aria-label={thumbUpLabel}
            onClick={handleThumbUp}
            color={currentVote === 'up' ? 'primary' : 'text'}
            isDisabled={isSubmitting}
            data-test-subj="agentBuilderFeedbackThumbUp"
            {...getEbtProps({
              element: AGENT_BUILDER_UI_EBT.element.pageContent,
              action:
                currentVote === 'up'
                  ? AGENT_BUILDER_UI_EBT.action.conversation.FEEDBACK_RETRACT
                  : AGENT_BUILDER_UI_EBT.action.conversation.FEEDBACK_THUMB_UP,
              detail: 'conversation',
            })}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={thumbDownLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="thumbDown"
            aria-label={thumbDownLabel}
            onClick={handleThumbDown}
            color={currentVote === 'down' ? 'primary' : 'text'}
            isDisabled={isSubmitting}
            data-test-subj="agentBuilderFeedbackThumbDown"
            {...getEbtProps({
              element: AGENT_BUILDER_UI_EBT.element.pageContent,
              action:
                currentVote === 'down'
                  ? AGENT_BUILDER_UI_EBT.action.conversation.FEEDBACK_RETRACT
                  : AGENT_BUILDER_UI_EBT.action.conversation.FEEDBACK_THUMB_DOWN,
              detail: 'conversation',
            })}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
