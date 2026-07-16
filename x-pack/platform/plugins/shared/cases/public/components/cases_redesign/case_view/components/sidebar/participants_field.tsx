/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { sortBy } from 'lodash';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import type { Assignee, CaseUserWithProfileInfo } from '../../../../user_profiles/types';
import { convertToUserInfo } from '../../../../user_profiles/user_converter';
import { getSortField } from '../../../../user_profiles/sort';
import {
  UserPickerFieldPanelLayout,
  UserAvatarList,
} from './user_picker_field/user_picker_field_layout';

export interface ParticipantsFieldProps {
  title: string;
  dataTestSubj: string;
  isLoading: boolean;
  caseId: string;
  caseTitle: string;
  userProfiles: Map<string, UserProfileWithAvatar>;
  users: CaseUserWithProfileInfo[];
}

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

const ParticipantsFieldComponent: React.FC<ParticipantsFieldProps> = ({
  title,
  dataTestSubj,
  isLoading,
  caseId,
  caseTitle,
  userProfiles,
  users,
}) => {
  const displayUsers = useMemo(
    () => toDisplayAssignees(users, userProfiles),
    [users, userProfiles]
  );
  const hasUsers = displayUsers.length > 0;

  if (!isLoading && !hasUsers) {
    return null;
  }

  return (
    <UserPickerFieldPanelLayout
      title={title}
      dataTestSubj={dataTestSubj}
      labelTestSubj={`${dataTestSubj}-label`}
      isLoading={isLoading}
      hasUsers={hasUsers}
    >
      {hasUsers ? (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
          <UserAvatarList users={displayUsers} caseId={caseId} caseTitle={caseTitle} />
          {isLoading ? (
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner data-test-subj={`${dataTestSubj}-updating`} />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      ) : null}
    </UserPickerFieldPanelLayout>
  );
};

ParticipantsFieldComponent.displayName = 'ParticipantsField';

export const ParticipantsField = React.memo(ParticipantsFieldComponent);
