/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiFilterButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';
import { UserAvatar, getUserDisplayName } from '@kbn/user-profile-components';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useCasesContext } from '../../../components/cases_context/use_cases_context';
import { useBulkGetUserProfiles } from '../../../containers/user_profiles/use_bulk_get_user_profiles';
import { useGetCurrentUserProfile } from '../../../containers/user_profiles/use_get_current_user_profile';
import { useSuggestUserProfiles } from '../../../containers/user_profiles/use_suggest_user_profiles';
import { ICONS } from '../../icons';
import * as i18n from './translations';
import { ASSIGNED_TO_ME, UNASSIGNED } from './use_queue_url_state';

export interface AssigneesFilterProps {
  /** `me`, `none` and user profile uids. */
  selected: string[];
  onChange: (selected: string[]) => void;
}

const isPerson = (value: string): boolean => value !== ASSIGNED_TO_ME && value !== UNASSIGNED;

const toOption = (
  profile: UserProfileWithAvatar,
  isChecked: boolean
): EuiSelectableOption<{ profile: UserProfileWithAvatar }> => ({
  key: profile.uid,
  label: getUserDisplayName(profile.user),
  checked: isChecked ? 'on' : undefined,
  profile,
  'data-test-subj': `investigationsFilterAssignees-option-${profile.user.username}`,
});

/** "Assigned to me", "Unassigned" and the people Cases lets you assign, with their avatars. */
export const AssigneesFilter: React.FC<AssigneesFilterProps> = ({ selected, onChange }) => {
  const { euiTheme } = useEuiTheme();
  const { owner: owners } = useCasesContext();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const popoverId = useGeneratedHtmlId({ prefix: 'investigationsAssigneesFilter' });

  const { data: currentUser } = useGetCurrentUserProfile();
  const { data: suggested = [], isLoading: isSearching } = useSuggestUserProfiles({
    name: searchTerm,
    owners,
  });
  const selectedPeople = useMemo(() => selected.filter(isPerson), [selected]);
  const { data: selectedProfiles } = useBulkGetUserProfiles({ uids: selectedPeople });

  const options = useMemo<EuiSelectableOption[]>(() => {
    const result: EuiSelectableOption[] = [];
    if (searchTerm.trim().length === 0) {
      result.push(
        {
          key: ASSIGNED_TO_ME,
          label: i18n.ASSIGNEES_ME,
          checked: selected.includes(ASSIGNED_TO_ME) ? 'on' : undefined,
          'data-test-subj': 'investigationsFilterAssignees-option-me',
        },
        {
          key: UNASSIGNED,
          label: i18n.ASSIGNEES_NONE,
          checked: selected.includes(UNASSIGNED) ? 'on' : undefined,
          'data-test-subj': 'investigationsFilterAssignees-option-none',
        }
      );
    }
    // People already chosen stay in the list even when the search no longer finds them.
    const people = new Map<string, UserProfileWithAvatar>();
    selectedPeople.forEach((uid) => {
      const profile = selectedProfiles?.get(uid);
      if (profile && searchTerm.trim().length === 0) people.set(uid, profile);
    });
    suggested.forEach((profile) => {
      if (profile.uid !== currentUser?.uid) people.set(profile.uid, profile);
    });
    people.forEach((profile) => result.push(toOption(profile, selected.includes(profile.uid))));
    return result;
  }, [searchTerm, selected, selectedPeople, selectedProfiles, suggested, currentUser?.uid]);

  const handleChange = (changed: EuiSelectableOption[]) => {
    const next = changed.filter(({ checked }) => checked === 'on').map(({ key }) => String(key));
    // Choices hidden by the current search are kept.
    const hiddenSelected = selected.filter((value) => !changed.some(({ key }) => key === value));
    onChange([...next, ...hiddenSelected]);
  };

  return (
    <EuiPopover
      id={popoverId}
      aria-label={i18n.FILTER_ASSIGNEES}
      button={
        <EuiFilterButton
          iconType={ICONS.chevronDown}
          onClick={() => setIsOpen((open) => !open)}
          isSelected={isOpen}
          hasActiveFilters={selected.length > 0}
          numActiveFilters={selected.length > 0 ? selected.length : undefined}
          aria-label={
            selected.length > 0
              ? i18n.FILTER_ACTIVE_COUNT(i18n.FILTER_ASSIGNEES, selected.length)
              : i18n.FILTER_ASSIGNEES
          }
          data-test-subj="investigationsFilterAssignees"
        >
          {i18n.FILTER_ASSIGNEES}
        </EuiFilterButton>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiSelectable<EuiSelectableOption<{ profile?: UserProfileWithAvatar }>>
        aria-label={i18n.FILTER_ASSIGNEES}
        searchable
        isPreFiltered
        isLoading={isSearching}
        searchProps={{
          placeholder: i18n.ASSIGNEES_SEARCH,
          compressed: true,
          onChange: (value: string) => setSearchTerm(value),
          'data-test-subj': 'investigationsFilterAssigneesSearch',
        }}
        options={options}
        onChange={handleChange}
        emptyMessage={i18n.FILTER_NO_OPTIONS}
        noMatchesMessage={i18n.FILTER_NO_MATCH}
        renderOption={(option) =>
          option.profile ? (
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <UserAvatar
                  user={option.profile.user}
                  avatar={option.profile.data.avatar}
                  size="s"
                />
              </EuiFlexItem>
              <EuiFlexItem>{option.label}</EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            option.label
          )
        }
        listProps={{ onFocusBadge: false }}
      >
        {(list, search) => (
          <div
            css={css`
              width: ${euiTheme.base * 18}px;
            `}
          >
            <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
AssigneesFilter.displayName = 'AssigneesFilter';
