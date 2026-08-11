/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { getUserDisplayName } from '@kbn/user-profile-components';

export interface SelectedUser {
  uid: string;
  name: string;
}

export type UserProfileOption = EuiComboBoxOptionOption<string> & UserProfileWithAvatar;

const isSelectedUser = (item: unknown): item is SelectedUser =>
  typeof item === 'object' &&
  item !== null &&
  typeof (item as Record<string, unknown>).uid === 'string' &&
  typeof (item as Record<string, unknown>).name === 'string';

export const toSelectedUsers = (value: unknown): SelectedUser[] => {
  if (Array.isArray(value)) return value.filter(isSelectedUser);
  if (typeof value === 'string' && value !== '') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(isSelectedUser) : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const profileToOption = (profile: UserProfileWithAvatar): UserProfileOption => ({
  ...profile,
  label: getUserDisplayName(profile.user),
  value: profile.uid,
  key: profile.uid,
});
