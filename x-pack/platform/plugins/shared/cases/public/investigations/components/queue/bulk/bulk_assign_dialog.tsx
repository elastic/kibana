/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { getUserDisplayName } from '@kbn/user-profile-components';
import { SuggestUsersPopover } from '../../../../components/case_view/components/suggest_users_popover';
import { CaseUserAvatar } from '../../../../components/user_profiles/user_avatar';
import type { AssigneeWithProfile } from '../../../../components/user_profiles/types';
import { useGetCurrentUserProfile } from '../../../../containers/user_profiles/use_get_current_user_profile';
import { BulkDialog } from './bulk_dialog';
import * as i18n from './translations';

export interface BulkAssignDialogProps {
  count: number;
  /** Called with the uids to add to every selected investigation. */
  onConfirm: (uids: string[]) => void;
  onClose: () => void;
}

/** Picks people, with the Cases user picker, to add as assignees of every selected investigation. */
export const BulkAssignDialog: React.FC<BulkAssignDialogProps> = ({
  count,
  onConfirm,
  onClose,
}) => {
  const { data: currentUserProfile } = useGetCurrentUserProfile();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [chosen, setChosen] = useState<UserProfileWithAvatar[]>([]);

  const assigned = useMemo<AssigneeWithProfile[]>(
    () => chosen.map((profile) => ({ uid: profile.uid, profile })),
    [chosen]
  );
  const togglePicker = useCallback(() => setIsPickerOpen((open) => !open), []);
  const closePicker = useCallback(() => setIsPickerOpen(false), []);

  return (
    <BulkDialog
      title={i18n.ASSIGN_TITLE}
      confirmLabel={i18n.ASSIGN_CONFIRM}
      isConfirmDisabled={chosen.length === 0}
      onConfirm={() => onConfirm(chosen.map(({ uid }) => uid))}
      onClose={onClose}
      data-test-subj="investigationBulkAssign"
    >
      <EuiText size="s">
        <p>{i18n.ASSIGN_BODY(count)}</p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFormRow label={i18n.ASSIGN_CHOSEN_LABEL} fullWidth>
        <div data-test-subj="investigationBulkAssignChosen">
          {chosen.length === 0 ? (
            <EuiText size="s" color="subdued">
              {i18n.ASSIGN_NONE_CHOSEN}
            </EuiText>
          ) : (
            <EuiFlexGroup direction="column" gutterSize="xs">
              {chosen.map((profile) => (
                <EuiFlexItem grow={false} key={profile.uid}>
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <CaseUserAvatar size="s" userInfo={profile} />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="s">{getUserDisplayName(profile.user)}</EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          )}
        </div>
      </EuiFormRow>
      <EuiSpacer size="s" />
      <SuggestUsersPopover
        assignedUsersWithProfiles={assigned}
        currentUserProfile={currentUserProfile}
        isLoading={false}
        isPopoverOpen={isPickerOpen}
        onUsersChange={setChosen}
        onClosePopover={closePicker}
        togglePopover={togglePicker}
        button={
          <EuiButton size="s" onClick={togglePicker} data-test-subj="investigationBulkAssignChoose">
            {i18n.ASSIGN_CHOOSE}
          </EuiButton>
        }
      />
    </BulkDialog>
  );
};
BulkAssignDialog.displayName = 'BulkAssignDialog';
