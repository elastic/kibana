/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem, EuiPanel } from '@elastic/eui';
import React from 'react';

import { UserActionAvatar } from './user_action_avatar';
import { UserActionTitle } from './user_action_title';

interface UserActionItemProps {
  createdAt: string;
  id: string;
  isEditable: boolean;
  isLoading: boolean;
  labelAction?: string;
  labelTitle?: string;
  fullName: string;
  markdown: React.ReactNode;
  onEdit: (id: string) => void;
  userName: string;
}

export const UserActionItem = ({
  createdAt,
  id,
  isEditable,
  isLoading,
  labelAction,
  labelTitle,
  fullName,
  markdown,
  onEdit,
  userName,
}: UserActionItemProps) => (
  <>
    <EuiFlexItem data-test-subj={`user-action-${id}-avatar`} grow={false}>
      <UserActionAvatar name={fullName ?? userName} />
    </EuiFlexItem>
    <EuiFlexItem data-test-subj={`user-action-${id}`}>
      {isEditable && markdown}
      {!isEditable && (
        <EuiPanel className="userAction__panel" paddingSize="none">
          <UserActionTitle
            createdAt={createdAt}
            id={id}
            isLoading={isLoading}
            labelAction={labelAction ?? ''}
            labelTitle={labelTitle ?? ''}
            userName={userName}
            onEdit={onEdit}
          />
          {markdown}
        </EuiPanel>
      )}
    </EuiFlexItem>
  </>
);
