/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiLink,
  EuiLoadingSpinner,
  EuiHorizontalRule,
} from '@elastic/eui';

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { CaseAssignees } from '../../../../common/types/domain';
import type { CasesPermissions } from '../../../../common';
import { useAssignees } from '../../../containers/user_profiles/use_assignees';
import * as i18n from '../translations';
import { SidebarTitle } from './sidebar_title';
import { RemovableUser } from '../../user_profiles/removable_user';
import { useCasesContext } from '../../cases_context/use_cases_context';
import type { Assignee } from '../../user_profiles/types';
import { SuggestUsersPopover } from './suggest_users_popover';
import type { CurrentUserProfile } from '../../types';

interface AssigneesListProps {
  assignees: Assignee[];
  currentUserProfile: CurrentUserProfile;
  permissions: CasesPermissions;
  assignSelf: () => void;
  togglePopOver: () => void;
  onAssigneeRemoved: (removedAssigneeUID: string) => void;
}

const AssigneesList: React.FC<AssigneesListProps> = ({
  assignees,
  currentUserProfile,
  permissions,
  assignSelf,
  togglePopOver,
  onAssigneeRemoved,
}) => {
  return (
    <>
      {assignees.length === 0 ? (
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              <p>
                {i18n.NO_ASSIGNEES}
                {permissions.update && (
                  <>
                    <br />
                    <EuiLink data-test-subj="case-view-assign-users-link" onClick={togglePopOver}>
                      {i18n.ASSIGN_A_USER}
                    </EuiLink>
                  </>
                )}
                {currentUserProfile && permissions.update && (
                  <>
                    <span>{i18n.SPACED_OR}</span>
                    <EuiLink data-test-subj="case-view-assign-yourself-link" onClick={assignSelf}>
                      {i18n.ASSIGN_YOURSELF}
                    </EuiLink>
                  </>
                )}
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiFlexGroup direction="column" gutterSize="s">
          {assignees.map((assignee) => (
            <EuiFlexItem key={assignee.uid} grow={false}>
              <RemovableUser assignee={assignee} onRemoveAssignee={onAssigneeRemoved} />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
    </>
  );
};
AssigneesList.displayName = 'AssigneesList';

export interface AssignUsersProps {
  caseAssignees: CaseAssignees;
  currentUserProfile: CurrentUserProfile;
  userProfiles: Map<string, UserProfileWithAvatar>;
  onAssigneesChanged: (assignees: Assignee[]) => void;
  isLoading: boolean;
}

const AssignUsersComponent: React.FC<AssignUsersProps> = ({
  caseAssignees,
  userProfiles,
  currentUserProfile,
  onAssigneesChanged,
  isLoading,
}) => {
  const { assigneesWithProfiles, assigneesWithoutProfiles, allAssignees } = useAssignees({
    caseAssignees,
    userProfiles,
  });

  const [selectedAssignees, setSelectedAssignees] = useState<Assignee[] | undefined>();
  const [needToUpdateAssignees, setNeedToUpdateAssignees] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopover = useCallback(() => {
    setIsPopoverOpen((value) => !value);
    setNeedToUpdateAssignees(true);
  }, []);

  const onClosePopover = useCallback(() => {
    // Order matters here because needToUpdateAssignees will likely be true already
    // from the togglePopover call when opening the popover, so if we set the popover to false
    // first, we'll get a rerender and then get another after we set needToUpdateAssignees to true again
    setNeedToUpdateAssignees(true);
    setIsPopoverOpen(false);
  }, []);

  const onAssigneeRemoved = useCallback(
    (removedAssigneeUID: string) => {
      const remainingAssignees = allAssignees.filter(
        (assignee) => assignee.uid !== removedAssigneeUID
      );
      setSelectedAssignees(remainingAssignees);
      setNeedToUpdateAssignees(true);
    },
    [allAssignees]
  );

  const onUsersChange = useCallback(
    (users: UserProfileWithAvatar[]) => {
      // if users are selected then also include the users without profiles
      if (users.length > 0) {
        setSelectedAssignees([...users, ...assigneesWithoutProfiles]);
      } else {
        // all users were deselected so lets remove the users without profiles as well
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

  const { permissions } = useCasesContext();

  useEffect(() => {
    // selectedAssignees will be undefined on initial render or a rerender occurs, so we only want to update the assignees
    // after the users have been changed in some manner not when it is an initial value
    if (isPopoverOpen === false && needToUpdateAssignees && selectedAssignees) {
      setNeedToUpdateAssignees(false);
      onAssigneesChanged(selectedAssignees);
    }
  }, [isPopoverOpen, needToUpdateAssignees, onAssigneesChanged, selectedAssignees]);

  return (
    <EuiFlexItem grow={false} data-test-subj="case-view-assignees">
      <EuiFlexGroup
        alignItems="center"
        gutterSize="xs"
        justifyContent="spaceBetween"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <SidebarTitle title={i18n.ASSIGNEES} />
        </EuiFlexItem>
        {isLoading && <EuiLoadingSpinner data-test-subj="case-view-assignees-button-loading" />}
        {!isLoading && permissions.assign && (
          <EuiFlexItem data-test-subj="case-view-assignees-edit" grow={false}>
            <SuggestUsersPopover
              assignedUsersWithProfiles={assigneesWithProfiles}
              currentUserProfile={currentUserProfile}
              isLoading={isLoading}
              isPopoverOpen={isPopoverOpen}
              onUsersChange={onUsersChange}
              onClosePopover={onClosePopover}
              togglePopover={togglePopover}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xs" />
      <AssigneesList
        assignees={allAssignees}
        currentUserProfile={currentUserProfile}
        permissions={permissions}
        assignSelf={assignSelf}
        togglePopOver={togglePopover}
        onAssigneeRemoved={onAssigneeRemoved}
      />
    </EuiFlexItem>
  );
};

AssignUsersComponent.displayName = 'AssignUsers';

export const AssignUsers = React.memo(AssignUsersComponent);
