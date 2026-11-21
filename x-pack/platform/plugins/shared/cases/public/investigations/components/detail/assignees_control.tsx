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
  EuiIconTip,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useAssigneesPicker } from '../../../components/case_view/components/sidebar/user_picker_field/use_assignees_picker';
import { SuggestUsersPopover } from '../../../components/case_view/components/suggest_users_popover';
import { useCasesContext } from '../../../components/cases_context/use_cases_context';
import { CaseUserAvatar } from '../../../components/user_profiles/user_avatar';
import { UserToolTip } from '../../../components/user_profiles/user_tooltip';
import type { Assignee } from '../../../components/user_profiles/types';
import { useAssignees } from '../../../containers/user_profiles/use_assignees';
import { useBulkGetUserProfiles } from '../../../containers/user_profiles/use_bulk_get_user_profiles';
import { useGetCurrentUserProfile } from '../../../containers/user_profiles/use_get_current_user_profile';
import { MAX_ASSIGNEES_PER_CASE } from '../../../../common/constants';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { useUpdateRecord } from '../../hooks';
import { useInvestigationsServices } from '../../services';
import { ICONS } from '../../icons';
import * as i18n from './translations';

const NO_PROFILES = new Map<string, UserProfileWithAvatar>();
const MAX_VISIBLE_AVATARS = 5;

const getUids = (assignees: Assignee[]): string[] => [
  ...new Set(assignees.map((assignee) => assignee.uid)),
];

const isSameSet = (first: string[], second: string[]): boolean =>
  first.length === second.length && first.every((uid) => second.includes(uid));

const AssigneeAvatars: React.FC<{ assignees: Assignee[] }> = ({ assignees }) => {
  const visible = assignees.slice(0, MAX_VISIBLE_AVATARS);
  const hidden = assignees.length - visible.length;

  return (
    <>
      {visible.length === 0 ? (
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued" data-test-subj="investigationAssigneesEmpty">
            {i18n.NO_ASSIGNEES}
          </EuiText>
        </EuiFlexItem>
      ) : (
        visible.map((assignee) => (
          <EuiFlexItem grow={false} key={assignee.uid} data-test-subj="investigationAssignee">
            <UserToolTip userInfo={assignee.profile}>
              <CaseUserAvatar size="s" userInfo={assignee.profile} />
            </UserToolTip>
          </EuiFlexItem>
        ))
      )}
      {hidden > 0 ? (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.PARTICIPANTS_MORE(hidden)}
          </EuiText>
        </EuiFlexItem>
      ) : null}
    </>
  );
};
AssigneeAvatars.displayName = 'AssigneeAvatars';

export interface AssigneesControlProps {
  record: InvestigationRecord;
  isDisabled?: boolean;
}

/**
 * The people assigned to the investigation (the case assignees), picked with the Cases user
 * picker. A person who owns the investigation is always an assignee, so the picker cannot remove
 * them while they own it.
 */
export const AssigneesControl: React.FC<AssigneesControlProps> = ({
  record,
  isDisabled = false,
}) => {
  const { permissions } = useCasesContext();
  const { notifications } = useInvestigationsServices();
  const { data: currentUserProfile } = useGetCurrentUserProfile();
  const uids = record.assignees;
  const { data: profiles } = useBulkGetUserProfiles({ uids });
  const { mutate: updateRecord, isLoading } = useUpdateRecord(record.id, {
    successMessage: i18n.ASSIGNEES_SAVED,
  });

  const caseAssignees = useMemo(() => uids.map((uid) => ({ uid })), [uids]);
  const { assigneesWithProfiles, assigneesWithoutProfiles, allAssignees } = useAssignees({
    caseAssignees,
    userProfiles: profiles ?? NO_PROFILES,
  });

  const ownerUid = record.owner?.type === 'user' ? record.owner.profile_uid ?? null : null;
  const canEdit = permissions.assign && !isDisabled;

  const onAssigneesChanged = useCallback(
    (next: Assignee[]) => {
      const nextUids = getUids(next);
      const ownerWasRemoved = ownerUid !== null && !nextUids.includes(ownerUid);
      const finalUids = ownerWasRemoved && ownerUid ? [ownerUid, ...nextUids] : nextUids;
      if (ownerWasRemoved) {
        notifications.toasts.addInfo({
          title: i18n.OWNER_STAYS_ASSIGNED_TOAST(record.owner?.name ?? i18n.OWNER_FALLBACK_NAME),
        });
      }
      if (isSameSet(finalUids, uids)) {
        return;
      }
      updateRecord({ assignees: finalUids });
    },
    [notifications.toasts, ownerUid, record.owner?.name, uids, updateRecord]
  );

  const { isPopoverOpen, togglePopover, onClosePopover, onUsersChange } = useAssigneesPicker({
    allAssignees,
    assigneesWithoutProfiles,
    currentUserProfile,
    onAssigneesChanged,
  });

  const currentUid = currentUserProfile?.uid;
  const isSelfAssigned = currentUid !== undefined && uids.includes(currentUid);
  const isSelfOwner = currentUid !== undefined && currentUid === ownerUid;
  const isOwnerAssigned = ownerUid !== null && uids.includes(ownerUid);

  const assignSelf = () => {
    if (currentUid === undefined || uids.length >= MAX_ASSIGNEES_PER_CASE) {
      return;
    }
    updateRecord({ assignees: [...uids, currentUid] });
  };

  const unassignSelf = () => {
    if (currentUid === undefined) {
      return;
    }
    updateRecord({ assignees: uids.filter((uid) => uid !== currentUid) });
  };

  const editButton = (
    <EuiToolTip content={i18n.EDIT_ASSIGNEES} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType={ICONS.edit}
        aria-label={i18n.EDIT_ASSIGNEES}
        onClick={togglePopover}
        isDisabled={isLoading}
        data-test-subj="investigationAssigneesEdit"
      />
    </EuiToolTip>
  );

  return (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="center"
      responsive={false}
      wrap={false}
      data-test-subj="investigationAssignees"
    >
      <AssigneeAvatars assignees={allAssignees} />
      {isOwnerAssigned ? (
        <EuiFlexItem grow={false} data-test-subj="investigationAssigneesOwnerNote">
          <EuiIconTip
            type={ICONS.info}
            content={i18n.OWNER_STAYS_ASSIGNED}
            aria-label={i18n.OWNER_STAYS_ASSIGNED}
          />
        </EuiFlexItem>
      ) : null}
      {canEdit && currentUserProfile && !isSelfAssigned ? (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            onClick={assignSelf}
            isLoading={isLoading}
            data-test-subj="investigationAssignSelf"
          >
            {i18n.ASSIGN_YOURSELF}
          </EuiButtonEmpty>
        </EuiFlexItem>
      ) : null}
      {canEdit && currentUserProfile && isSelfAssigned && !isSelfOwner ? (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            onClick={unassignSelf}
            isLoading={isLoading}
            aria-label={i18n.UNASSIGN_ARIA}
            data-test-subj="investigationUnassignSelf"
          >
            {i18n.UNASSIGN}
          </EuiButtonEmpty>
        </EuiFlexItem>
      ) : null}
      {canEdit ? (
        <EuiFlexItem grow={false} data-test-subj="investigationAssigneesPicker">
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
AssigneesControl.displayName = 'AssigneesControl';
