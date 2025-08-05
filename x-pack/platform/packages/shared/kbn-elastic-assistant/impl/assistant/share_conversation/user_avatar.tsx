/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAvatar } from '@elastic/eui';
import type { User } from '@kbn/elastic-assistant-common';
import { useQuery } from '@tanstack/react-query';
import type { UserProfileAvatarData } from '@kbn/user-profile-components';
import { EuiAvatarSize } from '@elastic/eui/src/components/avatar/avatar';
import { useAssistantContext } from '../../..';

interface Props {
  // legacy message object does not include user
  user?: User;
  size?: EuiAvatarSize;
}
const useUserProfile = ({ user }: Props) => {
  const { userProfileService } = useAssistantContext();

  return useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      const data = await userProfileService?.bulkGet<{ avatar: UserProfileAvatarData }>({
        uids: new Set([user?.id ?? '']),
        dataPath: 'avatar',
      });

      return data;
    },
    select: (profile) => {
      return {
        username: profile?.[0]?.user.username ?? user?.name ?? 'Unknown',
        avatar: profile?.[0]?.data.avatar,
      };
    },
    enabled: !!user?.id?.length,
  });
};

export const UserAvatar: React.FC<Props> = ({ user, size = 'l' }) => {
  const { data: currentUserAvatar } = useUserProfile({ user });
  if (currentUserAvatar?.avatar) {
    return (
      <EuiAvatar
        name="user"
        size="l"
        color={currentUserAvatar?.avatar?.color ?? 'subdued'}
        {...(currentUserAvatar?.avatar?.imageUrl
          ? { imageUrl: currentUserAvatar?.avatar.imageUrl as string }
          : { initials: currentUserAvatar?.avatar?.initials })}
      />
    );
  }

  return <EuiAvatar name="user" size={size} color="subdued" iconType="userAvatar" />;
};
