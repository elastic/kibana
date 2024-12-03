/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState, useRef } from 'react';
import { isEmpty, sortBy } from 'lodash';
import {
  EuiSelectable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiTextColor,
  EuiHighlight,
  EuiIcon,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  EuiButtonEmpty,
  EuiLoadingSpinner,
} from '@elastic/eui';

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { getUserDisplayName } from '@kbn/user-profile-components';
import { useBulkGetUserProfiles } from '../../../containers/user_profiles/use_bulk_get_user_profiles';
import { useIsUserTyping } from '../../../common/use_is_user_typing';
import { useSuggestUserProfiles } from '../../../containers/user_profiles/use_suggest_user_profiles';
import type { CasesUI } from '../../../../common';
import * as i18n from './translations';
import { useItemsState } from '../use_items_state';
import type { ItemSelectableOption, ItemsSelectionState } from '../types';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { EmptyMessage } from '../../user_profiles/empty_message';
import { NoMatches } from '../../user_profiles/no_matches';
import { SmallUserAvatar } from '../../user_profiles/small_user_avatar';
import { NoSelectedAssignees } from './no_selected_assignees';

interface Props {
  selectedCases: CasesUI;
  onChangeAssignees: (args: ItemsSelectionState) => void;
}

type AssigneeSelectableOption = ItemSelectableOption<
  Partial<UserProfileWithAvatar> & { unknownUser?: boolean }
>;

const getUnknownUsers = (
  assignees: Set<string>,
  userProfiles?: Map<string, UserProfileWithAvatar>
) => {
  const unknownUsers: string[] = [];

  if (!userProfiles) {
    return unknownUsers;
  }

  for (const assignee of assignees) {
    if (!userProfiles.has(assignee)) {
      unknownUsers.push(assignee);
    }
  }

  return unknownUsers;
};

const EditAssigneesSelectableComponent: React.FC<Props> = ({
  selectedCases,
  onChangeAssignees,
}) => {
  const { owner: owners } = useCasesContext();
  const { euiTheme } = useEuiTheme();
  const { isUserTyping, onContentChange, onDebounce } = useIsUserTyping();
  const hasDataBeenSetToStateAfterFetched = useRef<boolean>(false);

  const assignees = useMemo(
    () => new Set(selectedCases.map((theCase) => theCase.assignees.map(({ uid }) => uid)).flat()),
    [selectedCases]
  );

  const { data, isFetching: isLoadingUserProfiles } = useBulkGetUserProfiles({
    uids: Array.from(assignees.values()),
  });

  const userProfiles = useMemo(() => data ?? new Map(), [data]);

  const unknownUsers = getUnknownUsers(assignees, userProfiles);

  const userProfileIds = [...userProfiles.keys(), ...unknownUsers];

  const [searchValue, setSearchValue] = useState<string>('');
  const { data: searchResultUserProfiles, isLoading: isLoadingSuggest } = useSuggestUserProfiles({
    name: searchValue,
    owners,
    onDebounce,
  });

  const itemToSelectableOption = useCallback(
    (item: { key: string; data: Record<string, unknown> }): AssigneeSelectableOption => {
      const userProfileFromData = item.data as unknown as Partial<UserProfileWithAvatar>;
      const userProfile = isEmpty(userProfileFromData)
        ? userProfiles.get(item.key)
        : userProfileFromData;

      if (isUserProfile(userProfile)) {
        return toSelectableOption(userProfile);
      }

      const profileInSuggestedUsers = searchResultUserProfiles?.find(
        (profile) => profile.uid === item.data.uid
      );

      if (profileInSuggestedUsers) {
        return toSelectableOption(profileInSuggestedUsers);
      }

      return {
        key: item.key,
        label: i18n.UNKNOWN,
        data: { unknownUser: true },
        'data-test-subj': `cases-actions-assignees-edit-selectable-assignee-${item.key}`,
      } as unknown as AssigneeSelectableOption;
    },
    [searchResultUserProfiles, userProfiles]
  );

  const { options, totalSelectedItems, onChange, onSelectNone, resetItems } = useItemsState({
    items: userProfileIds,
    selectedCases,
    fieldSelector: (theCase) => theCase.assignees.map(({ uid }) => uid),
    onChangeItems: onChangeAssignees,
    itemToSelectableOption,
  });

  if (data && !hasDataBeenSetToStateAfterFetched.current) {
    hasDataBeenSetToStateAfterFetched.current = true;
    resetItems(userProfileIds);
  }

  const finalOptions = getDisplayOptions({
    searchResultUserProfiles: searchResultUserProfiles ?? [],
    options,
    searchValue,
    initialUserProfiles: userProfiles,
  });

  const isLoadingData = isLoadingUserProfiles || isLoadingSuggest || isUserTyping;

  const renderOption = useCallback(
    (option: AssigneeSelectableOption, search: string) => {
      const icon = option.itemIcon ?? 'empty';
      const dataTestSubj = `cases-actions-assignees-edit-selectable-assignee-${option.key}-icon-${icon}`;
      const userInfo = option.user ? { user: option.user, data: option.data } : undefined;

      return (
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              justifyContent="center"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiIcon type={icon} data-test-subj={dataTestSubj} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <SmallUserAvatar userInfo={userInfo} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexGroup
            alignItems="center"
            justifyContent="spaceBetween"
            gutterSize="s"
            responsive={false}
          >
            <EuiFlexItem>
              <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
            </EuiFlexItem>
            {option.user?.email && option.user?.email !== option.label ? (
              <EuiFlexItem grow={false}>
                <EuiTextColor color={option.disabled ? 'disabled' : 'subdued'}>
                  {searchValue ? (
                    <EuiHighlight search={searchValue}>{option.user.email}</EuiHighlight>
                  ) : (
                    option.user.email
                  )}
                </EuiTextColor>
              </EuiFlexItem>
            ) : undefined}
          </EuiFlexGroup>
        </EuiFlexGroup>
      );
    },
    [searchValue]
  );

  const onSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);
      onContentChange(value);
    },
    [onContentChange]
  );

  if (isLoadingUserProfiles) {
    return <EuiLoadingSpinner />;
  }

  return (
    <EuiSelectable
      options={finalOptions}
      searchable
      searchProps={{
        placeholder: i18n.SEARCH_ASSIGNEES_PLACEHOLDER,
        isLoading: isLoadingData,
        isClearable: !isLoadingData,
        onChange: onSearchChange,
        value: searchValue,
        'data-test-subj': 'cases-actions-assignees-edit-selectable-search-input',
      }}
      renderOption={renderOption}
      listProps={{ showIcons: false }}
      onChange={onChange}
      noMatchesMessage={!isLoadingData ? <NoMatches /> : <EmptyMessage />}
      emptyMessage={<NoSelectedAssignees totalSelectedCases={selectedCases.length} />}
      data-test-subj="cases-actions-assignees-edit-selectable"
      height="full"
    >
      {(list, search) => {
        return (
          <>
            {search}
            <EuiSpacer size="s" />
            <EuiFlexGroup
              alignItems="center"
              justifyContent="spaceBetween"
              responsive={false}
              direction="row"
              css={{ flexGrow: 0 }}
              gutterSize="none"
            >
              <EuiFlexItem
                grow={false}
                css={{
                  paddingLeft: euiTheme.size.s,
                }}
              >
                <EuiText size="xs" color="subdued">
                  {i18n.SELECTED_ASSIGNEES(totalSelectedItems)}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false} css={{ marginLeft: 'auto' }}>
                <EuiFlexGroup
                  responsive={false}
                  direction="row"
                  alignItems="center"
                  justifyContent="flexEnd"
                  gutterSize="xs"
                >
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty size="xs" flush="right" onClick={onSelectNone}>
                      {i18n.REMOVE_ASSIGNEES}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiHorizontalRule margin="m" />
            {list}
          </>
        );
      }}
    </EuiSelectable>
  );
};

EditAssigneesSelectableComponent.displayName = 'EditAssigneesSelectable';

export const EditAssigneesSelectable = React.memo(EditAssigneesSelectableComponent);

const getDisplayOptions = ({
  searchResultUserProfiles,
  options,
  searchValue,
  initialUserProfiles,
}: {
  searchResultUserProfiles: UserProfileWithAvatar[];
  options: AssigneeSelectableOption[];
  searchValue: string;
  initialUserProfiles: Map<string, UserProfileWithAvatar>;
}) => {
  /**
   * If the user does not perform any search we do not want to show
   * the results of an empty search to the initial list of users.
   * We also filter out users that appears both in the initial list
   * and the search results
   */
  const searchResultsOptions = isEmpty(searchValue)
    ? []
    : searchResultUserProfiles
        ?.filter((profile) => !options.find((option) => isMatchingOption(option, profile)))
        ?.map((profile) => toSelectableOption(profile)) ?? [];
  /**
   * In the initial view, when the user does not perform any search,
   * we want to filter out options that are not in the initial user profile
   * mapping or profiles returned by the search result that are not selected.
   * We want to keep unknown users as they can only be available from the
   * selected cases and not from search results
   */
  const filteredOptions = isEmpty(searchValue)
    ? options.filter(
        (option) =>
          initialUserProfiles.has(option?.data?.uid) ||
          option?.data?.itemIcon !== 'empty' ||
          option.data?.unknownUser
      )
    : [...options];

  const finalOptions = sortOptionsAlphabetically([...searchResultsOptions, ...filteredOptions]);

  return finalOptions;
};

const sortOptionsAlphabetically = (options: AssigneeSelectableOption[]) =>
  /**
   * sortBy will not mutate the original array.
   * It will return a new sorted array
   *  */
  sortBy(options, (option) => option.label);

const toSelectableOption = (userProfile: UserProfileWithAvatar): AssigneeSelectableOption => {
  return {
    key: userProfile.uid,
    label: getUserDisplayName(userProfile.user),
    data: userProfile,
    'data-test-subj': `cases-actions-assignees-edit-selectable-assignee-${userProfile.uid}`,
  } as unknown as AssigneeSelectableOption;
};

const isMatchingOption = <Option extends UserProfileWithAvatar | null>(
  option: AssigneeSelectableOption,
  profile: UserProfileWithAvatar
) => {
  return option.key === profile.uid;
};

const isUserProfile = (
  userProfile?: Partial<UserProfileWithAvatar>
): userProfile is UserProfileWithAvatar => !!userProfile && !!userProfile.uid && !!userProfile.user;
