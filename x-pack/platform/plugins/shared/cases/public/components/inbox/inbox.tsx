/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiScreenReaderOnly,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { InboxReason } from '../../../common/types/api/inbox/v1';
import { MENTION_TOKEN_PATTERN } from '../../../common/utils/mentions';
import { useCaseViewNavigation } from '../../common/navigation';
import { useInbox } from '../../containers/inbox/hooks';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';
import { HoverableAvatarResolver } from '../user_profiles/hoverable_avatar_resolver';
import { HoverableUsernameResolver } from '../user_profiles/hoverable_username_resolver';
import { convertToCaseUser } from '../user_profiles/user_converter';
import { UserActionTimestamp } from '../user_actions/timestamp';
import { setOpenThread } from '../attachments/comment/thread_store';
import * as i18n from './translations';

const SNIPPET_LENGTH = 200;

const toSnippet = (content: string): string => {
  const text = content.replace(new RegExp(MENTION_TOKEN_PATTERN, 'g'), '@$1').trim();
  return text.length > SNIPPET_LENGTH ? `${text.slice(0, SNIPPET_LENGTH)}…` : text;
};

const ReasonMessage: React.FC<{
  reason: InboxReason;
  user: React.ReactNode;
  caseTitle: React.ReactNode;
}> = ({ reason, user, caseTitle }) => {
  switch (reason) {
    case 'mention':
      return (
        <FormattedMessage
          id="xpack.cases.inbox.mentionedYou"
          defaultMessage="{user} mentioned you in {caseTitle}"
          values={{ user, caseTitle }}
        />
      );
    case 'reply':
      return (
        <FormattedMessage
          id="xpack.cases.inbox.repliedToYou"
          defaultMessage="{user} replied to your comment in {caseTitle}"
          values={{ user, caseTitle }}
        />
      );
    case 'assignment':
      return (
        <FormattedMessage
          id="xpack.cases.inbox.assignedYou"
          defaultMessage="{user} assigned you to {caseTitle}"
          values={{ user, caseTitle }}
        />
      );
  }
};

ReasonMessage.displayName = 'ReasonMessage';

/** Lists the mentions of, replies to and case assignments of the current user, read or unread. */
export const Inbox: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { items, unreadCount, isLoading, isUnread: getIsUnread, markAllRead } = useInbox();
  const { getCaseViewUrl, navigateToCaseView } = useCaseViewNavigation();

  const uids = useMemo(
    () => [...new Set(items.flatMap(({ createdBy }) => createdBy.profile_uid ?? []))],
    [items]
  );
  const { data: userProfiles } = useBulkGetUserProfiles({ uids });

  if (isLoading) {
    return <EuiLoadingSpinner size="l" />;
  }

  if (items.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="bell"
        title={<h3>{i18n.EMPTY_TITLE}</h3>}
        body={i18n.EMPTY_BODY}
        data-test-subj="cases-inbox-empty"
      />
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="cases-inbox">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="check"
              isDisabled={unreadCount === 0}
              onClick={markAllRead}
              data-test-subj="cases-inbox-mark-all-read"
            >
              {i18n.MARK_ALL_READ}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {items.map((item) => {
        const isUnread = getIsUnread(item);
        const pathParams = { detailName: item.caseId, commentId: item.commentId };
        const user = convertToCaseUser(item.createdBy);

        return (
          <EuiFlexItem grow={false} key={item.id}>
            <EuiPanel
              hasBorder
              paddingSize="m"
              color={isUnread ? 'primary' : 'plain'}
              data-test-subj={`cases-inbox-item-${item.id}`}
              data-unread={isUnread}
            >
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
                <EuiFlexItem grow={false}>
                  <span
                    aria-hidden={true}
                    css={css({
                      display: 'inline-block',
                      width: euiTheme.size.s,
                      height: euiTheme.size.s,
                      borderRadius: '50%',
                      backgroundColor: isUnread ? euiTheme.colors.primary : 'transparent',
                    })}
                  />
                  {isUnread ? (
                    <EuiScreenReaderOnly>
                      <span>{i18n.UNREAD}</span>
                    </EuiScreenReaderOnly>
                  ) : null}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <HoverableAvatarResolver user={user} userProfiles={userProfiles} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s" color="subdued">
                    <ReasonMessage
                      reason={item.reason}
                      user={<HoverableUsernameResolver user={user} userProfiles={userProfiles} />}
                      caseTitle={
                        <EuiLink
                          href={getCaseViewUrl(pathParams)}
                          onClick={(event: React.MouseEvent) => {
                            event.preventDefault();
                            if (item.threadId != null) {
                              setOpenThread(item.threadId);
                            }
                            navigateToCaseView(pathParams);
                          }}
                          data-test-subj={`cases-inbox-link-${item.id}`}
                        >
                          {isUnread ? <strong>{item.caseTitle}</strong> : item.caseTitle}
                        </EuiLink>
                      }
                    />
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    <UserActionTimestamp createdAt={item.createdAt} />
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              {item.content ? (
                <EuiText size="s" css={css({ paddingLeft: euiTheme.size.base })}>
                  <p>{toSnippet(item.content)}</p>
                </EuiText>
              ) : null}
            </EuiPanel>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};

Inbox.displayName = 'Inbox';
