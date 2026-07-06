/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, type MouseEvent, type ReactNode } from 'react';
import { css } from '@emotion/react';
import { sortBy } from 'lodash';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { CaseAssignees } from '../../../../../../common/types/domain';
import type { CasesPermissions } from '../../../../../../common';
import { useAssignees } from '../../../../../containers/user_profiles/use_assignees';
import * as i18n from '../../../../case_view/translations';
import * as redesignI18n from '../../../translations';
import { useCasesContext } from '../../../../cases_context/use_cases_context';
import type { Assignee, CaseUserWithProfileInfo } from '../../../../user_profiles/types';
import { convertToUserInfo } from '../../../../user_profiles/user_converter';
import { getSortField } from '../../../../user_profiles/sort';
import { SuggestUsersPopover } from '../../../../case_view/components/suggest_users_popover';
import type { CurrentUserProfile } from '../../../../types';
import { useAssigneesPicker } from './use_assignees_picker';
import { UserAvatarWithEmail } from './user_avatar_with_email';

interface UserPickerFieldPanelLayoutProps {
  title: string;
  dataTestSubj: string;
  labelTestSubj: string;
  isLoading: boolean;
  hasUsers: boolean;
  children: ReactNode;
}

const UserPickerFieldPanelLayout: React.FC<UserPickerFieldPanelLayoutProps> = ({
  title,
  dataTestSubj,
  labelTestSubj,
  isLoading,
  hasUsers,
  children,
}) => {
  const { euiTheme } = useEuiTheme();

  const labelStyles = useMemo(
    () => css`
      font-weight: ${euiTheme.font.weight.semiBold};
    `,
    [euiTheme]
  );

  return (
    <EuiPanel data-test-subj={dataTestSubj} hasShadow={false} hasBorder={true} paddingSize="m">
      <EuiText size="xs" color="subdued" data-test-subj={labelTestSubj}>
        <span css={labelStyles}>{title}</span>
      </EuiText>
      <EuiSpacer size="m" />
      {isLoading && !hasUsers ? (
        <EuiLoadingSpinner data-test-subj="case-view-assignees-button-loading" />
      ) : (
        children
      )}
    </EuiPanel>
  );
};

UserPickerFieldPanelLayout.displayName = 'UserPickerFieldPanelLayout';

const UserAvatarList: React.FC<{
  users: Assignee[];
  caseId: string;
  caseTitle: string;
}> = ({ users, caseId, caseTitle }) => (
  <>
    {users.map((user) => (
      <EuiFlexItem grow={false} key={user.uid}>
        <UserAvatarWithEmail userInfo={user.profile} caseId={caseId} caseTitle={caseTitle} />
      </EuiFlexItem>
    ))}
  </>
);

UserAvatarList.displayName = 'UserAvatarList';

interface UserPickerFieldPanelCommonProps {
  title: string;
  dataTestSubj: string;
  isLoading: boolean;
  caseId: string;
  caseTitle: string;
  userProfiles: Map<string, UserProfileWithAvatar>;
  // Each of these is only used in one of the two modes below, but declared here (optional) so
  // the component can destructure them with defaults regardless of mode, since hooks must run
  // unconditionally.
  caseAssignees?: CaseAssignees;
  currentUserProfile?: CurrentUserProfile;
  onAssigneesChanged?: (assignees: Assignee[]) => void;
  users?: CaseUserWithProfileInfo[];
}

export interface ReadonlyUserPickerFieldPanelProps extends UserPickerFieldPanelCommonProps {
  isEditable?: false;
  users: CaseUserWithProfileInfo[];
}

export interface EditableUserPickerFieldPanelProps extends UserPickerFieldPanelCommonProps {
  isEditable: true;
  caseAssignees: CaseAssignees;
  currentUserProfile: CurrentUserProfile;
  onAssigneesChanged: (assignees: Assignee[]) => void;
}

export type UserPickerFieldPanelProps =
  | ReadonlyUserPickerFieldPanelProps
  | EditableUserPickerFieldPanelProps;

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

const toDisplayAssignees = (
  users: CaseUserWithProfileInfo[],
  userProfiles: Map<string, UserProfileWithAvatar>
): Assignee[] => {
  const displayUsers = users.reduce<Map<string, Assignee>>((acc, user) => {
    const convertedUser = convertToUserInfo(
      {
        email: user.user.email,
        fullName: user.user.full_name,
        username: user.user.username,
        profileUid: user.uid,
      },
      userProfiles
    );

    if (convertedUser != null) {
      const profile = convertedUser.userInfo as UserProfileWithAvatar | undefined;

      acc.set(convertedUser.key, {
        uid: convertedUser.key,
        profile: profile?.user != null ? profile : undefined,
      });
    }

    return acc;
  }, new Map());

  return sortBy(Array.from(displayUsers.values()), (assignee) =>
    getSortField(assignee.profile ?? {})
  );
};

const UserPickerFieldPanelComponent: React.FC<UserPickerFieldPanelProps> = (props) => {
  const isEditable = props.isEditable === true;
  const {
    title = redesignI18n.ASSIGNED_TITLE,
    dataTestSubj = 'case-view-assignees-field-panel',
    isLoading,
    caseId,
    caseTitle,
    userProfiles,
    caseAssignees = [],
    currentUserProfile,
    onAssigneesChanged = () => {},
    users = [],
  } = props;

  const { assigneesWithProfiles, assigneesWithoutProfiles, allAssignees } = useAssignees({
    caseAssignees,
    userProfiles,
  });

  const displayUsers = useMemo(
    () => (isEditable ? allAssignees : toDisplayAssignees(users, userProfiles)),
    [allAssignees, isEditable, users, userProfiles]
  );

  const { isPopoverOpen, togglePopover, openPopover, onClosePopover, onUsersChange, assignSelf } =
    useAssigneesPicker({
      allAssignees,
      assigneesWithoutProfiles,
      currentUserProfile,
      onAssigneesChanged,
    });

  const { permissions } = useCasesContext();

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

  const hasUsers = displayUsers.length > 0;
  const showEditControls = isEditable && !isLoading && permissions.assign;
  const labelTestSubj = isEditable ? 'case-view-assignees-field-label' : `${dataTestSubj}-label`;

  if (!isEditable && !isLoading && !hasUsers) {
    return null;
  }

  return (
    <UserPickerFieldPanelLayout
      title={title}
      dataTestSubj={dataTestSubj}
      labelTestSubj={labelTestSubj}
      isLoading={isLoading}
      hasUsers={hasUsers}
    >
      {(hasUsers || showEditControls) && (
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          responsive={false}
          wrap={hasUsers || !isEditable}
        >
          {hasUsers ? (
            <UserAvatarList users={displayUsers} caseId={caseId} caseTitle={caseTitle} />
          ) : null}
          {isLoading && hasUsers ? (
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner data-test-subj="case-view-assignees-button-loading" />
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
      {isEditable && !hasUsers && !isLoading ? (
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

UserPickerFieldPanelComponent.displayName = 'UserPickerFieldPanel';

export const UserPickerFieldPanel = React.memo(UserPickerFieldPanelComponent);
