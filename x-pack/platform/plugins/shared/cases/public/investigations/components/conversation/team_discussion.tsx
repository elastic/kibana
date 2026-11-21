/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EuiButtonEmpty, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { InvestigationRecord, RecordComment } from '../../../../common/investigations/types';
import { useBulkGetUserProfiles } from '../../../containers/user_profiles/use_bulk_get_user_profiles';
import { ICONS } from '../../icons';
import { useCurrentActor } from '../proposals/use_current_actor';
import { EmptyState, ErrorState, LoadingState } from '../shared';
import { ClaimFromMessageModal } from './claim_from_message_modal';
import { appendQuote } from './quote';
import { TeamComposer } from './team_composer';
import type { TeamComposerHandle } from './team_composer';
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

const getAuthorName = (comment: RecordComment): string =>
  comment.created_by.full_name || comment.created_by.username || i18n.UNKNOWN_AUTHOR;

/**
 * The discussion of a record without an agent: the case's comments in a flat list, newest at the
 * bottom, with reply, quote, edit, delete, @mentions and pinning a comment as a claim.
 */
export const TeamDiscussion: React.FC<TeamDiscussionProps> = ({ record, compact = false }) => {
  const { euiTheme } = useEuiTheme();
  const { comments, total, hasOlder, isFetchingOlder, fetchOlder, isLoading, error, refetch } =
    useTeamDiscussion(record);
  const pinnedClaims = usePinnedClaims(record);
  const currentActor = useCurrentActor();
  const [claimSource, setClaimSource] = useState<ClaimSource | null>(null);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<RecordComment | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<TeamComposerHandle | null>(null);
  const newestId = comments.length > 0 ? comments[comments.length - 1].id : null;

  const uids = useMemo(
    () => [
      ...new Set(
        comments.flatMap(({ created_by: author }) =>
          author.profile_uid ? [author.profile_uid] : []
        )
      ),
    ],
    [comments]
  );
  const { data: userProfiles } = useBulkGetUserProfiles({ uids });

  // Scroll to the newest comment when the discussion opens and when a new one arrives.
  useEffect(() => {
    const list = listRef.current;
    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }, [newestId]);

  const pin = (comment: RecordComment) =>
    setClaimSource({
      conversationId: record.id,
      messageId: comment.id,
      label: i18n.MESSAGE_BY_LABEL(getAuthorName(comment)),
      authorName: getAuthorName(comment),
      ts: comment.created_at,
      text: comment.content,
    });

  const reply = (comment: RecordComment) => {
    setReplyTo(comment);
    composerRef.current?.focus();
  };

  const quote = (comment: RecordComment) => {
    setDraft((current) => appendQuote(current, comment.content));
    composerRef.current?.focus();
  };

  const renderList = () => {
    if (isLoading) {
      return <LoadingState label={i18n.TEAM_DISCUSSION_LOADING} size="m" />;
    }
    if (error) {
      return <ErrorState title={i18n.TEAM_DISCUSSION_ERROR} error={error} onRetry={refetch} />;
    }
    if (comments.length === 0) {
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
        {hasOlder ? (
          <EuiButtonEmpty
            size="s"
            iconType={ICONS.chevronUp}
            isLoading={isFetchingOlder}
            onClick={fetchOlder}
            data-test-subj="investigationTeamLoadEarlier"
          >
            {i18n.LOAD_EARLIER(Math.max(total - comments.length, 0))}
          </EuiButtonEmpty>
        ) : null}
        {comments.map((comment) => (
          <TeamMessage
            key={comment.id}
            record={record}
            comment={comment}
            userProfiles={userProfiles}
            isOwn={
              currentActor !== null &&
              Boolean(comment.created_by.username) &&
              comment.created_by.username === currentActor.id
            }
            pinned={pinnedClaims.get(comment.id)}
            onPin={pin}
            onReply={reply}
            onQuote={quote}
            compact={compact}
          />
        ))}
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
        <TeamComposer
          ref={composerRef}
          record={record}
          draft={draft}
          onDraftChange={setDraft}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          onSent={() => setReplyTo(null)}
        />
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
