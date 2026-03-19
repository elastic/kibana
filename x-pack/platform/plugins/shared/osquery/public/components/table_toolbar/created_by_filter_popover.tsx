/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiFilterButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { UserAvatar } from '@kbn/user-profile-components';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';

const POPOVER_WIDTH = 300;

const CREATED_BY_LABEL = i18n.translate('xpack.osquery.tableToolbar.createdByLabel', {
  defaultMessage: 'Created by',
});

const SEARCH_USERS_PLACEHOLDER = i18n.translate(
  'xpack.osquery.tableToolbar.searchUsersPlaceholder',
  { defaultMessage: 'Search users' }
);

const POPOVER_CONTENT_STYLE = { width: POPOVER_WIDTH };

interface CreatedByFilterPopoverProps {
  /** Unique creator usernames extracted from current page data */
  creators: string[];
  selectedCreators: string[];
  onSelectionChange: (creators: string[]) => void;
  profilesMap: Map<string, UserProfileWithAvatar>;
  'data-test-subj'?: string;
}

const toSelectableOption = (
  username: string,
  isSelected: boolean,
  usernameToProfile: Map<string, UserProfileWithAvatar>
): EuiSelectableOption => {
  const profile = usernameToProfile.get(username);
  const user = profile?.user ?? { username };
  const displayName = profile?.user.full_name || username;

  return {
    label: displayName,
    key: username,
    checked: isSelected ? 'on' : undefined,
    prepend: <UserAvatar user={user} avatar={profile?.data?.avatar} size="s" />,
  };
};

const CreatedByFilterPopoverComponent: React.FC<CreatedByFilterPopoverProps> = ({
  creators,
  selectedCreators,
  onSelectionChange,
  profilesMap,
  'data-test-subj': dataTestSubj = 'created-by-filter',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const usernameToProfile = useMemo(() => {
    const map = new Map<string, UserProfileWithAvatar>();
    for (const p of profilesMap.values()) {
      map.set(p.user.username, p);
    }

    return map;
  }, [profilesMap]);

  const selectableOptions = useMemo(() => {
    const selectedSet = new Set(selectedCreators);
    const allCreators = Array.from(new Set([...creators, ...selectedCreators]));

    return allCreators
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .map((username) =>
        toSelectableOption(username, selectedSet.has(username), usernameToProfile)
      );
  }, [creators, selectedCreators, usernameToProfile]);

  const handleChange = useCallback(
    (_: EuiSelectableOption[], __: unknown, changedOption: EuiSelectableOption) => {
      const username = changedOption.key!;
      const isRemoving = selectedCreators.includes(username);
      const updated = isRemoving
        ? selectedCreators.filter((c) => c !== username)
        : [...selectedCreators, username];
      onSelectionChange(updated);
    },
    [selectedCreators, onSelectionChange]
  );

  const togglePopover = useCallback(() => setIsOpen((prev) => !prev), []);
  const closePopover = useCallback(() => setIsOpen(false), []);
  const panelProps = useMemo(
    () => ({ 'data-test-subj': `${dataTestSubj}-popover` }),
    [dataTestSubj]
  );

  const searchProps = useMemo(
    () => ({
      placeholder: SEARCH_USERS_PLACEHOLDER,
    }),
    []
  );

  const triggerButton = (
    <EuiFilterButton
      iconType="arrowDown"
      onClick={togglePopover}
      isSelected={isOpen}
      hasActiveFilters={selectedCreators.length > 0}
      numActiveFilters={selectedCreators.length}
      data-test-subj={`${dataTestSubj}-button`}
    >
      {CREATED_BY_LABEL}
    </EuiFilterButton>
  );

  return (
    <EuiPopover
      ownFocus
      button={triggerButton}
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      repositionOnScroll
      panelProps={panelProps}
    >
      <EuiSelectable
        searchable
        searchProps={searchProps}
        aria-label={CREATED_BY_LABEL}
        options={selectableOptions}
        onChange={handleChange}
        emptyMessage={i18n.translate('xpack.osquery.tableToolbar.noUsersAvailable', {
          defaultMessage: 'No users available',
        })}
        noMatchesMessage={i18n.translate('xpack.osquery.tableToolbar.noUsersMatch', {
          defaultMessage: 'No users match search',
        })}
      >
        {(list, search) => (
          <div style={POPOVER_CONTENT_STYLE}>
            <EuiPopoverTitle paddingSize="s">
              <EuiFlexGroup gutterSize="s" responsive={false}>
                <EuiFlexItem>{search}</EuiFlexItem>
              </EuiFlexGroup>
            </EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

CreatedByFilterPopoverComponent.displayName = 'CreatedByFilterPopover';

export const CreatedByFilterPopover = React.memo(CreatedByFilterPopoverComponent);
