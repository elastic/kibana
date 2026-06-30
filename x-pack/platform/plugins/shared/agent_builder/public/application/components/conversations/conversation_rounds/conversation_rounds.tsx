/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { useConversation, useConversationActivityEntries } from '../../../hooks/use_conversation';
import { ActivityAuditRow } from './activity_audit_row';
import { RoundLayout } from './round_layout';

const CONVERSATION_ROUNDS_ID = 'agentBuilderConversationRoundsContainer';

interface ConversationRoundsProps {
  scrollContainerHeight: number;
}

export const ConversationRounds: React.FC<ConversationRoundsProps> = ({
  scrollContainerHeight,
}) => {
  const { conversation } = useConversation();
  const conversationActivityEntries = useConversationActivityEntries();
  const roundEntries = useMemo(
    () =>
      conversationActivityEntries.filter(
        (activityEntry): activityEntry is Extract<typeof activityEntry, { type: 'round' }> =>
          activityEntry.type === 'round'
      ),
    [conversationActivityEntries]
  );
  const allRounds = useMemo(() => roundEntries.map(({ round }) => round), [roundEntries]);

  return (
    <EuiFlexGroup
      id={CONVERSATION_ROUNDS_ID}
      direction="column"
      gutterSize="l"
      aria-label={i18n.translate('xpack.agentBuilder.conversationRounds', {
        defaultMessage: 'Conversation messages',
      })}
    >
      {conversationActivityEntries.map((entry, index) => {
        const entryKey =
          entry.type === 'user_action'
            ? `user-action-${entry.event.id}`
            : `round-${entry.round.id || index}-${index}`;

        if (entry.type === 'user_action') {
          return <ActivityAuditRow key={entryKey} event={entry.event} />;
        }

        const roundIndex = roundEntries.findIndex(
          (roundEntry) => roundEntry.round === entry.round
        );
        const isCurrentRound = index === conversationActivityEntries.length - 1;

        return (
          <RoundLayout
            key={entryKey}
            scrollContainerHeight={scrollContainerHeight}
            isCurrentRound={isCurrentRound}
            rawRound={entry.round}
            author={entry.author}
            conversationId={conversation?.id}
            conversationAttachments={conversation?.attachments}
            allRounds={allRounds}
            roundIndex={roundIndex >= 0 ? roundIndex : index}
          />
        );
      })}
    </EuiFlexGroup>
  );
};
