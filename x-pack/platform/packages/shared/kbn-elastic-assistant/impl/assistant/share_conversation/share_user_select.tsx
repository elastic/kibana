/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import type { UserProfile } from '@kbn/core-user-profile-common';
import { EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import type { User } from '@kbn/elastic-assistant-common';
import { SELECT_USERS } from './translations';
import type { Conversation } from '../../..';
import { useAssistantContext } from '../../..';
import { UserProfilesSearch } from './user_profiles_search';

interface Props {
  selectedConversation: Conversation | undefined;
  onUsersUpdate: (users: User[]) => void;
}

const ShareUserSelectComponent: React.FC<Props> = ({ selectedConversation, onUsersUpdate }) => {
  const { currentUser } = useAssistantContext();
  const [nextUsers, setNextUsers] = useState<UserProfile[]>([]);
  useEffect(() => {
    const conversationUsers =
      selectedConversation?.users
        // do not show current user in UI
        .filter((user) => user.id !== currentUser?.id && user.name !== currentUser?.name)
        .map(({ name, id }) => ({
          // id or name will be defined, empty string is fallback for TS
          uid: id ?? name ?? '',
          enabled: true,
          user: { username: name ?? id ?? '' },
          data: {},
        })) || [];
    setNextUsers(conversationUsers);
  }, [currentUser?.id, currentUser?.name, selectedConversation?.users]);

  const onNextUsersSelect = useCallback(
    (updatedUsers: UserProfile[]) => {
      setNextUsers(updatedUsers);
      const users = updatedUsers.map((user) => ({ name: user.user.username, id: user.uid }));
      onUsersUpdate([...users, ...(currentUser ? [currentUser] : [])]);
    },
    [currentUser, onUsersUpdate]
  );

  return (
    <>
      <EuiText
        css={css`
          font-weight: bold;
        `}
        size="xs"
      >
        {SELECT_USERS}
      </EuiText>
      <span
        css={css`
          .euiSelectable .euiPanel {
            padding: 8px 0;
          }
        `}
      >
        <UserProfilesSearch
          onUsersSelect={onNextUsersSelect}
          selectedUsers={nextUsers}
          forbiddenUsers={[...(currentUser?.id ? [currentUser?.id] : [])]}
        />
      </span>
    </>
  );
};

export const ShareUserSelect = React.memo(ShareUserSelectComponent);
