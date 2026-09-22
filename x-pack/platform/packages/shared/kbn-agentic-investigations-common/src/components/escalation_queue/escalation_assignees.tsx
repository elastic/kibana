/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { UserAvatar, UserProfilesPopover, UserToolTip } from '@kbn/user-profile-components';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { ESCALATION_QUEUE_LABELS } from './translations';

interface EscalationAssigneesProps {
  escalationId: string;
  /** User profiles for currently assigned users (pre-fetched by the page). */
  selected: UserProfileWithAvatar[];
  /** User profiles returned by the search suggestion query. */
  suggestions: UserProfileWithAvatar[];
  /** Whether the suggestion query is loading. */
  isSuggestionsLoading: boolean;
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
 */
export const EscalationAssignees = memo<EscalationAssigneesProps>(
  ({ escalationId, selected, suggestions, isSuggestionsLoading, onSearchChange, onChange }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const closePopover = useCallback(() => setIsPopoverOpen(false), []);
    const togglePopover = useCallback(() => setIsPopoverOpen((open) => !open), []);

    const handleChange = useCallback(
      (newSelected: UserProfileWithAvatar[]) => {
        onChange(newSelected);
        closePopover();
      },
      [onChange, closePopover]
    );

    const button = (
      <EuiToolTip content={ESCALATION_QUEUE_LABELS.addAssignee} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="plusCircle"
          aria-label={ESCALATION_QUEUE_LABELS.addAssignee}
          color="text"
          onClick={togglePopover}
          data-test-subj={`escalationAssigneesAdd-${escalationId}`}
        />
      </EuiToolTip>
    );

    return (
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        {selected.length === 0 ? (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {ESCALATION_QUEUE_LABELS.unassigned}
            </EuiText>
          </EuiFlexItem>
        ) : (
          selected.map((profile) => (
            <EuiFlexItem key={profile.uid} grow={false}>
              <UserToolTip user={profile.user} avatar={profile.data?.avatar}>
                <UserAvatar user={profile.user} avatar={profile.data?.avatar} size="s" />
              </UserToolTip>
            </EuiFlexItem>
          ))
        )}
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
              isLoading: isSuggestionsLoading,
              singleSelection: false,
              loadingMessage: ESCALATION_QUEUE_LABELS.searchAssignees,
              'data-test-subj': `escalationAssigneesSelectable-${escalationId}`,
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

EscalationAssignees.displayName = 'EscalationAssignees';
