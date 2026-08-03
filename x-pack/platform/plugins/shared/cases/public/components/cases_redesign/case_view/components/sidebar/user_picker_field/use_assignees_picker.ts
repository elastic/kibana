/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useCallback, useEffect, useState } from 'react';
import type { Assignee } from '../../../../../user_profiles/types';
import type { CurrentUserProfile } from '../../../../../types';

export interface UseAssigneesPickerArgs {
  allAssignees: Assignee[];
  assigneesWithoutProfiles: Assignee[];
  currentUserProfile: CurrentUserProfile;
  onAssigneesChanged: (assignees: Assignee[]) => void;
}

export interface UseAssigneesPickerResult {
  isPopoverOpen: boolean;
  togglePopover: () => void;
  openPopover: () => void;
  onClosePopover: () => void;
  onUsersChange: (users: UserProfileWithAvatar[]) => void;
  assignSelf: () => void;
}

export const useAssigneesPicker = ({
  allAssignees,
  assigneesWithoutProfiles,
  currentUserProfile,
  onAssigneesChanged,
}: UseAssigneesPickerArgs): UseAssigneesPickerResult => {
  const [selectedAssignees, setSelectedAssignees] = useState<Assignee[] | undefined>();
  const [needToUpdateAssignees, setNeedToUpdateAssignees] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopover = useCallback(() => {
    setIsPopoverOpen((value) => !value);
    setNeedToUpdateAssignees(true);
  }, []);

  const openPopover = useCallback(() => {
    setIsPopoverOpen(true);
    setNeedToUpdateAssignees(true);
  }, []);

  const onClosePopover = useCallback(() => {
    // Order matters: needToUpdateAssignees may already be true from opening the popover.
    setNeedToUpdateAssignees(true);
    setIsPopoverOpen(false);
  }, []);

  const onUsersChange = useCallback(
    (users: UserProfileWithAvatar[]) => {
      if (users.length > 0) {
        setSelectedAssignees([...users, ...assigneesWithoutProfiles]);
      } else {
        setSelectedAssignees([]);
      }
    },
    [assigneesWithoutProfiles]
  );

  const assignSelf = useCallback(() => {
    if (!currentUserProfile) {
      return;
    }

    const newAssignees = [currentUserProfile, ...allAssignees];
    setSelectedAssignees(newAssignees);
    setNeedToUpdateAssignees(true);
  }, [currentUserProfile, allAssignees]);

  useEffect(() => {
    if (isPopoverOpen === false && needToUpdateAssignees && selectedAssignees) {
      setNeedToUpdateAssignees(false);
      onAssigneesChanged(selectedAssignees);
    }
  }, [isPopoverOpen, needToUpdateAssignees, onAssigneesChanged, selectedAssignees]);

  return {
    isPopoverOpen,
    togglePopover,
    openPopover,
    onClosePopover,
    onUsersChange,
    assignSelf,
  };
};
