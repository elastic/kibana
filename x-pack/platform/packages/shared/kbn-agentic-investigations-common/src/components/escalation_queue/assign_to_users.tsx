/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { UserAvatar, UserProfilesPopover, UserToolTip } from '@kbn/user-profile-components';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { ESCALATION_QUEUE_LABELS } from './translations';

interface AssignToUsersProps {
  conversationId: string;
  /** User profiles for currently assigned users (pre-fetched by the page). */
  selected: UserProfileWithAvatar[];
  /** User profiles returned by the search suggestion query. */
  suggestions: UserProfileWithAvatar[];
  /** Whether the suggestion query is loading. */
  isSuggestionsLoading: boolean;
  /**
   * When true, the picker `+` button is disabled and no popover is shown.
   * Set while the bulk profile fetch is still in flight so a change cannot
   * accidentally drop unresolved assignee UIDs from the replace-in-full payload.
   */
  isProfilesLoading?: boolean;
  /**
   * When true, a spinner replaces the `+` button to signal that an update is
   * in flight. The popover is also closed so the user cannot submit a second
   * change while the first is still being processed.
   */
  isUpdating?: boolean;
  /**
   * When false the component renders the assignee display without the `+` button
   * or picker popover. Use this to honour `manageEscalations` capability.
   */
  canManage: boolean;
  /** Called when the search term in the popover changes. */
  onSearchChange: (term: string) => void;
  /** Called with the new full selection when the user makes a change. */
  onChange: (selected: UserProfileWithAvatar[]) => void;
}

/**
 * Assignee display + picker for one escalation row.
 *
 * Purely presentational — all data and mutations live in the page. The component
 * opens a `UserProfilesPopover` on the `+` button and calls `onChange` with the
 * full replacement selection.
 *
 * Rendering rules:
 * - `canManage: false` → read-only avatar stack (empty when unassigned), no picker.
 * - `isProfilesLoading: true` → picker button disabled; prevents a change that
 *   would silently drop unresolved UIDs from the replace-in-full payload.
 */
export const AssignToUsers = memo<AssignToUsersProps>(
  ({
    conversationId,
    selected,
    suggestions,
    isSuggestionsLoading,
    isProfilesLoading = false,
    isUpdating = false,
    canManage,
    onSearchChange,
    onChange,
  }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const closePopover = useCallback(() => setIsPopoverOpen(false), []);
    const togglePopover = useCallback(() => setIsPopoverOpen((open) => !open), []);

    const handleChange = useCallback(
      (newSelected: UserProfileWithAvatar[]) => {
        onChange(newSelected);
      },
      [onChange]
    );

    const avatarStack = selected.map((profile) => (
      <EuiFlexItem key={profile.uid} grow={false}>
        <UserToolTip user={profile.user} avatar={profile.data?.avatar}>
          <UserAvatar user={profile.user} avatar={profile.data?.avatar} size="s" />
        </UserToolTip>
      </EuiFlexItem>
    ));

    if (!canManage) {
      return (
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          {avatarStack}
        </EuiFlexGroup>
      );
    }

    const button = (
      <EuiToolTip content={ESCALATION_QUEUE_LABELS.addAssignee} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="plusCircle"
          aria-label={ESCALATION_QUEUE_LABELS.addAssignee}
          color="text"
          onClick={togglePopover}
          isDisabled={isProfilesLoading}
          data-test-subj={`assignToUsersAdd-${conversationId}`}
        />
      </EuiToolTip>
    );

    return (
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        {avatarStack}
        <EuiFlexItem grow={false}>
          <UserProfilesPopover
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            button={button}
            panelStyle={{ width: 280 }}
            selectableProps={{
              selectedOptions: selected,
              options: suggestions,
              onChange: handleChange,
              onSearchChange,
              isLoading: isSuggestionsLoading || isUpdating,
              singleSelection: false,
              loadingMessage: ESCALATION_QUEUE_LABELS.searchAssignees,
              'data-test-subj': `assignToUsersSelectable-${conversationId}`,
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

AssignToUsers.displayName = 'AssignToUsers';
