/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { getUserDisplayName } from '@kbn/user-profile-components';
import { sortBy } from 'lodash';

export const MAX_TEMPLATE_ASSIGNEES = 10;

export interface TemplateAssignee {
  uid: string;
  username: string;
}

export type TemplateAssigneeOption = EuiComboBoxOptionOption<string> & UserProfileWithAvatar;

const getSortField = (profile: UserProfileWithAvatar) =>
  profile.user.full_name?.toLowerCase() ??
  profile.user.email?.toLowerCase() ??
  profile.user.username.toLowerCase();

const isTemplateAssignee = (entry: unknown): entry is TemplateAssignee => {
  if (typeof entry !== 'object' || entry === null) {
    return false;
  }

  const { uid, id, username } = entry as {
    uid?: unknown;
    id?: unknown;
    username?: unknown;
  };
  const resolvedUid = typeof uid === 'string' ? uid : typeof id === 'string' ? id : undefined;

  return typeof resolvedUid === 'string' && typeof username === 'string' && username.length > 0;
};

export const parseTemplateAssignees = (value: unknown): TemplateAssignee[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!isTemplateAssignee(entry)) {
      return [];
    }

    const resolvedUid =
      typeof entry.uid === 'string'
        ? entry.uid
        : typeof (entry as { id?: string }).id === 'string'
        ? (entry as { id: string }).id
        : '';

    return [{ uid: resolvedUid, username: entry.username }];
  });
};

export const profileToAssigneeOption = (profile: UserProfileWithAvatar): TemplateAssigneeOption => ({
  ...profile,
  label: getUserDisplayName(profile.user),
  value: profile.uid,
  key: profile.uid,
});

export const assigneeOptionToStoredValue = (
  option: EuiComboBoxOptionOption<string>,
  profiles: UserProfileWithAvatar[]
): TemplateAssignee => {
  const profile = profiles.find((entry) => entry.uid === option.value);
  return {
    uid: option.value ?? '',
    username: profile?.user.username ?? option.label,
  };
};

export const sortProfilesWithCurrentUserFirst = (
  currentUserUid: string | undefined,
  profiles: UserProfileWithAvatar[]
): UserProfileWithAvatar[] => {
  const sortedProfiles = sortBy(profiles, getSortField);

  if (!currentUserUid) {
    return sortedProfiles;
  }

  const currentUserProfile = sortedProfiles.find((profile) => profile.uid === currentUserUid);
  if (!currentUserProfile) {
    return sortedProfiles;
  }

  return [
    currentUserProfile,
    ...sortedProfiles.filter((profile) => profile.uid !== currentUserUid),
  ];
};
