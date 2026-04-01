/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo } from 'react';
import { useConversation, useConversationRounds } from '../../../hooks/use_conversation';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useAttachmentLifecycle } from '../../../hooks/use_attachment_lifecycle';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useExperimentalFeatures } from '../../../hooks/use_experimental_features';
import { useKibana } from '../../../hooks/use_kibana';
import { RoundLayout } from './round_layout';

const CONVERSATION_ROUNDS_ID = 'agentBuilderConversationRoundsContainer';

const ADD_CONVERSATION_TO_DATASET_BUTTON_LABEL = i18n.translate(
  'xpack.agentBuilder.conversationRounds.addConversationToDatasetButtonLabel',
  { defaultMessage: 'Add conversation to dataset' }
);

const EMPTY_MESSAGE_LABEL = i18n.translate(
  'xpack.agentBuilder.conversationRounds.emptyMessageLabel',
  { defaultMessage: '(no message)' }
);

interface ConversationRoundsProps {
  scrollContainerHeight: number;
}

export const ConversationRounds: React.FC<ConversationRoundsProps> = ({
  scrollContainerHeight,
}) => {
  const { conversation } = useConversation();
  const conversationRounds = useConversationRounds();
  const { services } = useKibana();
  const isExperimentalEnabled = useExperimentalFeatures();
  const { attachmentsService } = useAgentBuilderServices();
  const { conversationActions } = useConversationContext();

  const openAddToDatasetFlyout = services.plugins.evals?.openAddToDatasetFlyout;

  useAttachmentLifecycle({
    attachments: conversation?.attachments,
    conversationId: conversation?.id,
    attachmentsService,
    invalidateConversation: conversationActions.invalidateConversation,
  });

  const completedRounds = useMemo(() => {
    return conversationRounds.flatMap((round, roundIndex) => {
      if (!round.response?.message) return [];
      return [{ round, roundIndex }];
    });
  }, [conversationRounds]);

  const onAddConversationToDataset = useCallback(() => {
    if (!openAddToDatasetFlyout) return;

    openAddToDatasetFlyout({
      title: ADD_CONVERSATION_TO_DATASET_BUTTON_LABEL,
      initialExamples: completedRounds.map(({ round, roundIndex }) => {
        const message =
          typeof round.input?.message === 'string' && round.input.message.trim()
            ? round.input.message.trim()
            : EMPTY_MESSAGE_LABEL;

        const shortMessage = message.length > 80 ? `${message.slice(0, 77).trimEnd()}…` : message;

        const traceId =
          round.trace_id == null
            ? null
            : Array.isArray(round.trace_id)
            ? round.trace_id[0] ?? null
            : round.trace_id;

        return {
          label: i18n.translate('xpack.agentBuilder.conversationRounds.turnLabel', {
            defaultMessage: 'Turn {turn}: {message}',
            values: { turn: roundIndex + 1, message: shortMessage },
          }),
          input: { round },
          output: { steps: round.steps },
          metadata: {
            source: 'agent_builder',
            conversation_id: conversation?.id ?? null,
            turn_index: roundIndex,
            trace_id: traceId,
          },
          selected: true,
        };
      }),
    });
  }, [completedRounds, conversation?.id, openAddToDatasetFlyout]);

  const showAddConversationToDatasetButton =
    isExperimentalEnabled && openAddToDatasetFlyout != null && completedRounds.length > 0;

  return (
    <EuiFlexGroup
      id={CONVERSATION_ROUNDS_ID}
      direction="column"
      gutterSize="l"
      aria-label={i18n.translate('xpack.agentBuilder.conversationRounds', {
        defaultMessage: 'Conversation messages',
      })}
    >
      {showAddConversationToDatasetButton ? (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                iconType="beaker"
                data-test-subj="agentBuilderAddConversationToDataset"
                onClick={onAddConversationToDataset}
              >
                {ADD_CONVERSATION_TO_DATASET_BUTTON_LABEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ) : null}

      {conversationRounds.map((round, index) => {
        const isCurrentRound = index === conversationRounds.length - 1;

        return (
          <RoundLayout
            key={index}
            scrollContainerHeight={scrollContainerHeight}
            isCurrentRound={isCurrentRound}
            rawRound={round}
            conversationId={conversation?.id}
            conversationAttachments={conversation?.attachments}
            allRounds={conversationRounds}
            roundIndex={index}
          />
        );
      })}
    </EuiFlexGroup>
  );
};
