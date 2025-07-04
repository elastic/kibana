/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import * as i18n from './translations';
import type { Assignee } from './types';
import { HoverableUserWithAvatar } from './hoverable_user_with_avatar';
import { RemovableItem } from '../removable_item/removable_item';

export interface UserRepresentationProps {
  assignee: Assignee;
  onRemoveAssignee: (removedAssigneeUID: string) => void;
}

const RemovableUserComponent: React.FC<UserRepresentationProps> = ({
  assignee,
  onRemoveAssignee,
}) => {
  const removeAssigneeCallback = useCallback(
    () => onRemoveAssignee(assignee.uid),
    [onRemoveAssignee, assignee.uid]
  );

  const usernameDataTestSubj = assignee.profile?.user.username ?? assignee.uid;

  return (
    <RemovableItem
      onRemoveItem={removeAssigneeCallback}
      tooltipContent={i18n.REMOVE_ASSIGNEE}
      buttonAriaLabel={i18n.REMOVE_ASSIGNEE_ARIA_LABEL}
      dataTestSubjPrefix={`user-profile-assigned-user-${usernameDataTestSubj}`}
    >
      <HoverableUserWithAvatar userInfo={assignee.profile} />
    </RemovableItem>
  );
};

RemovableUserComponent.displayName = 'RemovableUser';

export const RemovableUser = React.memo(RemovableUserComponent);
