/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useAssignees } from '../../../containers/user_profiles/use_assignees';
import { SuggestUsersPopover } from '../../../components/case_view/components/suggest_users_popover';
import { useAssigneesPicker } from '../../../components/case_view/components/sidebar/user_picker_field/use_assignees_picker';
import { CaseUserAvatar } from '../../../components/user_profiles/user_avatar';
import type { Assignee } from '../../../components/user_profiles/types';
import type { CurrentUserProfile } from '../../../components/types';
import {
  EDIT_ASSIGNEES,
  EDIT_ASSIGNEES_ARIA_LABEL,
} from '../../../components/case_view/translations';
import { ASSIGN_YOURSELF } from '../../../components/create/translations';
import { ICONS } from '../../icons';
import * as i18n from './translations';

const MAX_VISIBLE_AVATARS = 3;

export interface TaskAssigneesProps {
  /** Profile uids of the assignees. */
  assigneeUids: readonly string[];
  userProfiles: Map<string, UserProfileWithAvatar>;
  currentUserProfile: CurrentUserProfile;
  /** Whether the user holds the Cases assign privilege. */
  canAssign: boolean;
  isLoading?: boolean;
  /** Called with the new uids once the picker closes. */
  onChange: (uids: string[]) => void;
  'data-test-subj': string;
}

const getDisplayName = (profile: UserProfileWithAvatar | undefined, uid: string): string =>
  profile?.user.full_name || profile?.user.username || uid;

/** Avatars of the assignees with the Cases user-profile picker (up to 10 people). */
export const TaskAssignees: React.FC<TaskAssigneesProps> = ({
  assigneeUids,
  userProfiles,
  currentUserProfile,
  canAssign,
  isLoading = false,
  onChange,
  'data-test-subj': dataTestSubj,
}) => {
  const caseAssignees = useMemo(() => assigneeUids.map((uid) => ({ uid })), [assigneeUids]);
  const { assigneesWithProfiles, assigneesWithoutProfiles, allAssignees } = useAssignees({
    caseAssignees,
    userProfiles,
  });
  const onAssigneesChanged = useCallback(
    (assignees: Assignee[]) => onChange(assignees.map(({ uid }) => uid)),
    [onChange]
  );
  const { isPopoverOpen, togglePopover, onClosePopover, onUsersChange, assignSelf } =
    useAssigneesPicker({
      allAssignees,
      assigneesWithoutProfiles,
      currentUserProfile,
      onAssigneesChanged,
    });

  const visible = allAssignees.slice(0, MAX_VISIBLE_AVATARS);
  const hiddenCount = allAssignees.length - visible.length;
  const hasAssignees = allAssignees.length > 0;

  const editButton = (
    <EuiToolTip content={EDIT_ASSIGNEES} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType={hasAssignees ? ICONS.edit : ICONS.add}
        size="xs"
        color="text"
        aria-label={EDIT_ASSIGNEES_ARIA_LABEL}
        isDisabled={isLoading}
        onClick={togglePopover}
        data-test-subj={`${dataTestSubj}-edit`}
      />
    </EuiToolTip>
  );

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="xs"
      responsive={false}
      wrap={false}
      data-test-subj={dataTestSubj}
    >
      {visible.map((assignee) => (
        <EuiFlexItem grow={false} key={assignee.uid}>
          <EuiToolTip content={getDisplayName(assignee.profile, assignee.uid)}>
            <span tabIndex={0} data-test-subj={`${dataTestSubj}-avatar`}>
              <CaseUserAvatar size="s" userInfo={assignee.profile} />
            </span>
          </EuiToolTip>
        </EuiFlexItem>
      ))}
      {hiddenCount > 0 ? (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued" data-test-subj={`${dataTestSubj}-more`}>
            {i18n.MORE_ASSIGNEES(hiddenCount)}
          </EuiText>
        </EuiFlexItem>
      ) : null}
      {!hasAssignees && !canAssign ? (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.UNASSIGNED}
          </EuiText>
        </EuiFlexItem>
      ) : null}
      {!hasAssignees && canAssign && currentUserProfile ? (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            flush="left"
            onClick={assignSelf}
            data-test-subj={`${dataTestSubj}-assign-yourself`}
          >
            {ASSIGN_YOURSELF}
          </EuiButtonEmpty>
        </EuiFlexItem>
      ) : null}
      {canAssign ? (
        <EuiFlexItem grow={false}>
          <SuggestUsersPopover
            assignedUsersWithProfiles={assigneesWithProfiles}
            currentUserProfile={currentUserProfile}
            isLoading={isLoading}
            isPopoverOpen={isPopoverOpen}
            onUsersChange={onUsersChange}
            onClosePopover={onClosePopover}
            togglePopover={togglePopover}
            button={editButton}
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
TaskAssignees.displayName = 'TaskAssignees';
