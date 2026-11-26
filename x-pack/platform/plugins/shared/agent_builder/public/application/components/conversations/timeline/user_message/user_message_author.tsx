/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ConversationRoundOrigin } from '@kbn/agent-builder-common';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { AuthorOrigin } from '../author_header';
import { UserMessageAvatar } from './user_message_avatar';

interface UserMessageAuthorProps {
  profile?: UserProfileWithAvatar;
  name?: string;
  origin?: ConversationRoundOrigin;
}

/** The muted line above a user message that says who wrote it. */
export const UserMessageAuthor: React.FC<UserMessageAuthorProps> = ({ profile, name, origin }) => {
  const { euiTheme } = useEuiTheme();

  const nameStyles = css`
    font-weight: ${euiTheme.font.weight.medium};
  `;

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      data-test-subj="agentBuilderUserMessageAuthor"
    >
      <EuiFlexItem grow={false} data-test-subj="agentBuilderUserMessageAvatar">
        <UserMessageAvatar profile={profile} name={name} />
      </EuiFlexItem>
      {name && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued" css={nameStyles}>
            {name}
          </EuiText>
        </EuiFlexItem>
      )}
      {origin && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <AuthorOrigin origin={origin} />
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
