/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { CommentItem, InvestigationRecord } from '../../../../common/investigations/types';
import { ICONS } from '../../icons';
import { EmptyState, ErrorState, LoadingState } from '../shared';
import { ClaimFromMessageModal } from './claim_from_message_modal';
import { TeamComposer } from './team_composer';
import { TeamMessage } from './team_message';
import { usePinnedClaims } from './use_claim_sources';
import type { ClaimSource } from './use_claim_sources';
import { useTeamDiscussion } from './use_team_discussion';
import * as i18n from './translations';

export interface TeamDiscussionProps {
  record: InvestigationRecord;
  /** The narrow layout of the side panel. */
  compact?: boolean;
}

/**
 * The discussion of a record without an agent: record-level comments with replies grouped under
 * their message, @mentions of people, and pinning a message as a claim.
 */
export const TeamDiscussion: React.FC<TeamDiscussionProps> = ({ record, compact = false }) => {
  const { euiTheme } = useEuiTheme();
  const { threads, messageCount, total, isLoading, error, refetch } = useTeamDiscussion(record);
  const pinnedClaims = usePinnedClaims(record);
  const [claimSource, setClaimSource] = useState<ClaimSource | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }, [messageCount]);

  const pin = (comment: CommentItem) =>
    setClaimSource({
      conversationId: record.id,
      messageId: comment.id,
      label: i18n.MESSAGE_BY_LABEL(comment.created_by.name),
      authorName: comment.created_by.name,
      ts: comment.created_at,
      text: comment.text ?? '',
    });

  const renderList = () => {
    if (isLoading) {
      return <LoadingState label={i18n.TEAM_DISCUSSION_LOADING} size="m" />;
    }
    if (error) {
      return <ErrorState title={i18n.TEAM_DISCUSSION_ERROR} error={error} onRetry={refetch} />;
    }
    if (threads.length === 0) {
      return (
        <EmptyState
          iconType={ICONS.conversation}
          title={i18n.TEAM_EMPTY_TITLE}
          body={i18n.TEAM_EMPTY_BODY}
          data-test-subj="investigationTeamEmpty"
        />
      );
    }
    return (
      <>
        {threads.map((thread) => (
          <TeamMessage
            key={thread.message.id}
            record={record}
            thread={thread}
            pinnedClaims={pinnedClaims}
            onPin={pin}
            compact={compact}
          />
        ))}
        {total > messageCount ? (
          <EuiText size="xs" color="subdued">
            <p>{i18n.SHOWING_LATEST(messageCount, total)}</p>
          </EuiText>
        ) : null}
      </>
    );
  };

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        block-size: 100%;
        min-block-size: 0;
        gap: ${euiTheme.size.s};
      `}
      data-test-subj="investigationTeamDiscussion"
    >
      <div
        ref={listRef}
        css={css`
          flex: 1 1 auto;
          min-block-size: 0;
          overflow-y: auto;
          padding-inline: ${euiTheme.size.xs};
        `}
        data-test-subj="investigationTeamMessages"
      >
        {renderList()}
      </div>
      <div
        css={css`
          flex: 0 0 auto;
        `}
      >
        <TeamComposer record={record} />
      </div>
      {claimSource ? (
        <ClaimFromMessageModal
          record={record}
          source={claimSource}
          onCreated={() => setClaimSource(null)}
          onClose={() => setClaimSource(null)}
        />
      ) : null}
    </div>
  );
};
TeamDiscussion.displayName = 'TeamDiscussion';
