/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseUser } from '../../../containers/types';
import { useGetCurrentUserProfile } from '../../../containers/user_profiles/use_get_current_user_profile';

/** Whether the current user posted the comment; false while the current user is unknown. */
export const useIsAuthor = ({ profileUid, username }: CaseUser): boolean => {
  const { data: currentUser } = useGetCurrentUserProfile();

  if (currentUser == null) {
    return false;
  }

  if (profileUid != null) {
    return profileUid === currentUser.uid;
  }

  return username != null && username === currentUser.user.username;
};
