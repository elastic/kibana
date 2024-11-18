/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UserAvatar } from '@kbn/user-profile-components';
import { css } from '@emotion/css';
import { EuiAvatar, EuiLoadingSpinner } from '@elastic/eui';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { AssistantAvatar, MessageRole } from '@kbn/observability-ai-assistant-plugin/public';

interface ChatAvatarProps {
  currentUser?: Pick<AuthenticatedUser, 'full_name' | 'username'> | undefined;
  role: MessageRole;
  loading: boolean;
}

const assistantAvatarClassName = css`
  svg {
    width: 16px;
    height: 16px;
  }
`;

export function ChatItemAvatar({ currentUser, role, loading }: ChatAvatarProps) {
  const isLoading = loading || !currentUser;

  if (isLoading) {
    return <EuiLoadingSpinner size="xl" />;
  }

  switch (role) {
    case MessageRole.User:
      return <UserAvatar user={currentUser} size="m" data-test-subj="userMenuAvatar" />;

    case MessageRole.Assistant:
    case MessageRole.Elastic:
    case MessageRole.Function:
      return (
        <EuiAvatar
          name="Elastic Assistant"
          iconType={AssistantAvatar}
          color="subdued"
          className={assistantAvatarClassName}
        />
      );

    case MessageRole.System:
      return <EuiAvatar name="system" iconType="dot" color="subdued" />;

    default:
      return null;
  }
}
