/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import * as i18n from './translations';
import { UserProfileDisplay } from './user_profile_display';

export interface AlertEpisodeAssigneeCellProps {
  assigneeUid: string | null | undefined;
  userProfile: UserProfileService;
  isTooltipFocusable?: boolean;
}

export const AlertEpisodeAssigneeCell = ({
  assigneeUid,
  userProfile,
  isTooltipFocusable = true,
}: AlertEpisodeAssigneeCellProps) => {
  return (
    <UserProfileDisplay
      userProfileUid={assigneeUid}
      userProfile={userProfile}
      emptyState={i18n.ASSIGNEE_CELL_EMPTY}
      isTooltipFocusable={isTooltipFocusable}
      dataTestSubj="alertingV2EpisodeAssigneeCell"
    />
  );
};
