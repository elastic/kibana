/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserProfilesPopover } from '@kbn/user-profile-components';

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { useIsUserTyping } from '../../../common/use_is_user_typing';
import { MAX_ASSIGNEES_PER_CASE } from '../../../../common/constants';
import { useSuggestUserProfiles } from '../../../containers/user_profiles/use_suggest_user_profiles';
import { useCasesContext } from '../../cases_context/use_cases_context';
import type { AssigneeWithProfile } from '../../user_profiles/types';
import * as i18n from '../translations';
import { bringCurrentUserToFrontAndSort } from '../../user_profiles/sort';
import { EmptyMessage } from '../../user_profiles/empty_message';
import { NoMatches } from '../../user_profiles/no_matches';
import type { CurrentUserProfile } from '../../types';

const PopoverButton: React.FC<{ togglePopover: () => void; isDisabled: boolean }> = ({
  togglePopover,
  isDisabled,
}) => (
  <EuiToolTip position="left" content={i18n.EDIT_ASSIGNEES}>
    <EuiButtonIcon
      data-test-subj="case-view-assignees-edit-button"
      aria-label={i18n.EDIT_ASSIGNEES_ARIA_LABEL}
      iconType={'pencil'}
      onClick={togglePopover}
      disabled={isDisabled}
    />
  </EuiToolTip>
);
PopoverButton.displayName = 'PopoverButton';

export interface SuggestUsersPopoverProps {
  assignedUsersWithProfiles: AssigneeWithProfile[];
  currentUserProfile: CurrentUserProfile;
  isLoading: boolean;
  isPopoverOpen: boolean;
  onUsersChange: (users: UserProfileWithAvatar[]) => void;
  togglePopover: () => void;
  onClosePopover: () => void;
}

const SuggestUsersPopoverComponent: React.FC<SuggestUsersPopoverProps> = ({
  assignedUsersWithProfiles,
  currentUserProfile,
  isLoading,
  isPopoverOpen,
  onUsersChange,
  togglePopover,
  onClosePopover,
}) => {
  const { owner } = useCasesContext();
  const [searchTerm, setSearchTerm] = useState('');
  const { isUserTyping, onContentChange, onDebounce } = useIsUserTyping();

  const selectedProfiles = useMemo(() => {
    return bringCurrentUserToFrontAndSort(
      currentUserProfile,
      assignedUsersWithProfiles.map((assignee) => ({ ...assignee.profile }))
    );
  }, [assignedUsersWithProfiles, currentUserProfile]);

  const [selectedUsers, setSelectedUsers] = useState<UserProfileWithAvatar[] | undefined>();

  const onChange = useCallback(
    (users: UserProfileWithAvatar[]) => {
      const sortedUsers = bringCurrentUserToFrontAndSort(currentUserProfile, users);
      setSelectedUsers(sortedUsers);
      onUsersChange(sortedUsers ?? []);
    },
    [currentUserProfile, onUsersChange]
  );

  const selectedStatusMessage = useCallback(
    (selectedCount: number) => i18n.TOTAL_USERS_ASSIGNED(selectedCount),
    []
  );

  const limitReachedMessage = useCallback(
    (limit: number) => i18n.MAX_SELECTED_ASSIGNEES(limit),
    []
  );

  const {
    data: userProfiles,
    isLoading: isLoadingSuggest,
    isFetching: isFetchingSuggest,
  } = useSuggestUserProfiles({
    name: searchTerm,
    owners: owner,
    onDebounce,
  });

  const isLoadingData = isLoadingSuggest || isLoading || isFetchingSuggest || isUserTyping;
  const isDisabled = isLoading;

  const searchResultProfiles = useMemo(
    () => bringCurrentUserToFrontAndSort(currentUserProfile, userProfiles),
    [currentUserProfile, userProfiles]
  );

  return (
    <UserProfilesPopover
      title={i18n.EDIT_ASSIGNEES}
      button={<PopoverButton togglePopover={togglePopover} isDisabled={isDisabled} />}
      isOpen={isPopoverOpen}
      closePopover={onClosePopover}
      panelStyle={{
        width: 400,
      }}
      selectableProps={{
        onChange,
        onSearchChange: (term) => {
          setSearchTerm(term);
          onContentChange(term);
        },
        selectedStatusMessage,
        options: searchResultProfiles,
        selectedOptions: selectedUsers ?? selectedProfiles,
        isLoading: isLoadingData,
        height: 'full',
        limit: MAX_ASSIGNEES_PER_CASE,
        limitReachedMessage,
        searchPlaceholder: i18n.SEARCH_USERS,
        clearButtonLabel: i18n.REMOVE_ASSIGNEES,
        emptyMessage: <EmptyMessage />,
        noMatchesMessage: !isLoadingData ? <NoMatches /> : <EmptyMessage />,
      }}
    />
  );
};

SuggestUsersPopoverComponent.displayName = 'SuggestUsersPopover';

export const SuggestUsersPopover = React.memo(SuggestUsersPopoverComponent);
