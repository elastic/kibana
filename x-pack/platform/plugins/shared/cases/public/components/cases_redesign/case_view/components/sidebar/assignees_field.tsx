/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, type MouseEvent } from 'react';
import { css } from '@emotion/react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { CaseAssignees } from '../../../../../../common/types/domain';
import type { CasesPermissions } from '../../../../../../common';
import { useAssignees } from '../../../../../containers/user_profiles/use_assignees';
import * as i18n from '../../../../case_view/translations';
import { useCasesContext } from '../../../../cases_context/use_cases_context';
import type { Assignee } from '../../../../user_profiles/types';
import { SuggestUsersPopover } from '../../../../case_view/components/suggest_users_popover';
import type { CurrentUserProfile } from '../../../../types';
import { useAssigneesPicker } from './user_picker_field/use_assignees_picker';
import {
  UserPickerFieldPanelLayout,
  UserAvatarList,
} from './user_picker_field/user_picker_field_layout';

export interface AssigneesFieldProps {
  title: string;
  dataTestSubj: string;
  isLoading: boolean;
  caseId: string;
  caseTitle: string;
  userProfiles: Map<string, UserProfileWithAvatar>;
  caseAssignees: CaseAssignees;
  currentUserProfile: CurrentUserProfile;
  onAssigneesChanged: (assignees: Assignee[]) => void;
}

interface AssigneesEmptyStateProps {
  currentUserProfile: CurrentUserProfile;
  permissions: CasesPermissions;
  assignSelf: () => void;
  openPopover: () => void;
}

const AssigneesEmptyState: React.FC<AssigneesEmptyStateProps> = ({
  currentUserProfile,
  permissions,
  assignSelf,
  openPopover,
}) => {
  const onAssignUserClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    openPopover();
  };

  const onAssignSelfClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    assignSelf();
  };

  return (
    <EuiText size="s" color="subdued">
      <p>
        {i18n.NO_ASSIGNEES}
        {permissions.assign && (
          <>
            <br />
            <EuiLink
              data-test-subj="case-view-assign-users-link"
              href="#"
              onClick={onAssignUserClick}
            >
              {i18n.ASSIGN_A_USER}
            </EuiLink>
          </>
        )}
        {currentUserProfile && permissions.assign && (
          <>
            <span>{i18n.SPACED_OR}</span>
            <EuiLink
              data-test-subj="case-view-assign-yourself-link"
              href="#"
              onClick={onAssignSelfClick}
            >
              {i18n.ASSIGN_YOURSELF}
            </EuiLink>
          </>
        )}
      </p>
    </EuiText>
  );
};

AssigneesEmptyState.displayName = 'AssigneesEmptyState';

const AssigneesFieldComponent: React.FC<AssigneesFieldProps> = ({
  title,
  dataTestSubj,
  isLoading,
  caseId,
  caseTitle,
  userProfiles,
  caseAssignees,
  currentUserProfile,
  onAssigneesChanged,
}) => {
  const { assigneesWithProfiles, assigneesWithoutProfiles, allAssignees } = useAssignees({
    caseAssignees,
    userProfiles,
  });

  const { isPopoverOpen, togglePopover, openPopover, onClosePopover, onUsersChange, assignSelf } =
    useAssigneesPicker({
      allAssignees,
      assigneesWithoutProfiles,
      currentUserProfile,
      onAssigneesChanged,
    });

  const { permissions } = useCasesContext();

  // Intentionally not `EuiScreenReaderOnly`: that utility moves its content off-screen
  // (`left: -10000px`) to hide it, which also displaces the popover anchored to it,
  // breaking the popover's positioning/visibility. This mixin instead clips the anchor
  // to zero size in place, so the popover it anchors still opens where the user expects.
  const hiddenPopoverAnchorStyles = useMemo(
    () => css`
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      border: 0;
    `,
    []
  );

  const addAssigneeButton = useMemo(
    () => (
      <EuiToolTip position="left" content={i18n.EDIT_ASSIGNEES}>
        <EuiButtonIcon
          data-test-subj="case-view-assignees-add-button"
          aria-label={i18n.EDIT_ASSIGNEES_ARIA_LABEL}
          iconType="plusInCircle"
          color="primary"
          onClick={togglePopover}
          disabled={isLoading}
        />
      </EuiToolTip>
    ),
    [isLoading, togglePopover]
  );

  const assigneesPopover = useMemo(
    () => (
      <SuggestUsersPopover
        assignedUsersWithProfiles={assigneesWithProfiles}
        currentUserProfile={currentUserProfile}
        isLoading={isLoading}
        isPopoverOpen={isPopoverOpen}
        onUsersChange={onUsersChange}
        onClosePopover={onClosePopover}
        togglePopover={togglePopover}
        button={addAssigneeButton}
      />
    ),
    [
      addAssigneeButton,
      assigneesWithProfiles,
      currentUserProfile,
      isLoading,
      isPopoverOpen,
      onClosePopover,
      onUsersChange,
      togglePopover,
    ]
  );

  const hasUsers = allAssignees.length > 0;
  const showEditControls = !isLoading && permissions.assign;

  return (
    <UserPickerFieldPanelLayout
      title={title}
      dataTestSubj={dataTestSubj}
      labelTestSubj="case-view-assignees-field-label"
      isLoading={isLoading}
      hasUsers={hasUsers}
    >
      {(hasUsers || showEditControls) && (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={hasUsers}>
          {hasUsers ? (
            <UserAvatarList users={allAssignees} caseId={caseId} caseTitle={caseTitle} />
          ) : null}
          {isLoading && hasUsers ? (
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner data-test-subj={`${dataTestSubj}-updating`} />
            </EuiFlexItem>
          ) : null}
          {showEditControls ? (
            <EuiFlexItem
              grow={false}
              css={!hasUsers ? hiddenPopoverAnchorStyles : undefined}
              data-test-subj="case-view-assignees-edit"
            >
              {assigneesPopover}
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      )}
      {!hasUsers && !isLoading ? (
        <AssigneesEmptyState
          currentUserProfile={currentUserProfile}
          permissions={permissions}
          assignSelf={assignSelf}
          openPopover={openPopover}
        />
      ) : null}
    </UserPickerFieldPanelLayout>
  );
};

AssigneesFieldComponent.displayName = 'AssigneesField';

export const AssigneesField = React.memo(AssigneesFieldComponent);
