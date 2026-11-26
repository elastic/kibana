/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import type { ActiveFilters, ContentListItem, FindItemsParams } from '@kbn/content-list-provider';
import type { BoostProfile, BoostProfileType, BoostRule } from '../../../common/types';
import { InMemoryListProvider } from '../in_memory_list_provider';
import { useItemActions } from '../item_actions';
import { createItemLookup, toItemsById } from '../item_lookup';
import { matchesIncludeExclude, matchesSearch } from '../list_matchers';
import { RowTypesProvider, TYPE_FIELD, TYPE_FIELD_DEFINITION } from '../type_filter';
import {
  MANAGED_EDIT_REASON,
  PROFILES_LIST_LABELS,
  PROFILE_TYPE_LABELS,
  USED_BY_DEFAULT_RULE_REASONS,
} from '../../translations';

type ProfileItem = ContentListItem &
  BoostProfile & {
    source: BoostProfile;
    minBoost: number;
    maxBoost: number;
    typeLabel: string;
    ruleCount: number;
    defaultRuleType?: BoostProfileType;
  };

const { ItemsProvider: ProfileItemsProvider, useItemLookup } = createItemLookup<ProfileItem>();

export const useProfileItem = useItemLookup;

const QUERY_KEY_SCOPE = 'search-boost-profiles';
const FIELDS = [TYPE_FIELD_DEFINITION];

const toItems = (profiles: BoostProfile[], rules: BoostRule[]): ProfileItem[] => {
  const ruleCounts = new Map<string, number>();
  const defaultRuleProfiles = new Set<string>();
  for (const { boost_profile: profileName, is_builtin: isBuiltin } of rules) {
    ruleCounts.set(profileName, (ruleCounts.get(profileName) ?? 0) + 1);
    if (isBuiltin) {
      defaultRuleProfiles.add(profileName);
    }
  }
  return profiles.map((profile) => {
    // Data streams profiles show their recent period's boost.
    const { min_boost: minBoost, max_boost: maxBoost } =
      profile.type === 'indices' ? profile : profile.recent;
    return {
      ...profile,
      source: profile,
      id: profile.name,
      title: profile.name,
      minBoost,
      maxBoost,
      typeLabel: PROFILE_TYPE_LABELS[profile.type],
      ruleCount: ruleCounts.get(profile.name) ?? 0,
      defaultRuleType: defaultRuleProfiles.has(profile.name) ? profile.type : undefined,
    };
  });
};

const matchesOtherThanType = (profile: ProfileItem, filters: ActiveFilters) =>
  matchesSearch(filters.search, [profile.name]);

const matchesProfile = (profile: ProfileItem, { filters }: FindItemsParams) =>
  matchesOtherThanType(profile, filters) &&
  matchesIncludeExclude(filters, TYPE_FIELD, profile.type);

export interface ProfilesListProviderProps {
  /** Must keep its identity between renders, as must `rules`, since a new array reloads the list. */
  profiles: BoostProfile[];
  /** Every rule, to count the ones using each profile. */
  rules: BoostRule[];
  canEdit?: boolean;
  /** Custom profiles only. */
  onEdit?: (profile: BoostProfile) => void;
  onDuplicate?: (profile: BoostProfile) => void;
  /** Custom profiles only, and disabled while a default rule uses the profile. */
  onDelete?: (profile: BoostProfile) => void;
  children: ReactNode;
}

export const ProfilesListProvider = ({
  profiles,
  rules,
  canEdit = false,
  onEdit,
  onDuplicate,
  onDelete,
  children,
}: ProfilesListProviderProps) => {
  const { items, profileItems } = useMemo(() => {
    const profileItemList = toItems(profiles, rules);
    return {
      items: profileItemList,
      profileItems: toItemsById(profileItemList),
    };
  }, [profiles, rules]);
  const getRowTypes = (filters: ActiveFilters) =>
    items.filter((profile) => matchesOtherThanType(profile, filters)).map(({ type }) => type);

  const getItem = (item: ContentListItem) => profileItems.get(item.id);
  const itemConfig = useItemActions({
    canEdit,
    getSource: (item) => getItem(item)?.source,
    onEdit,
    onDuplicate,
    onDelete,
    editRestriction: (item) => (getItem(item)?.is_builtin ? MANAGED_EDIT_REASON : undefined),
    deleteRestriction: (item) => {
      const defaultRuleType = getItem(item)?.defaultRuleType;
      return defaultRuleType && USED_BY_DEFAULT_RULE_REASONS[defaultRuleType];
    },
  });

  return (
    <InMemoryListProvider
      items={items}
      queryKeyScope={QUERY_KEY_SCOPE}
      labels={PROFILES_LIST_LABELS}
      matches={matchesProfile}
      fields={FIELDS}
      item={itemConfig}
    >
      <ProfileItemsProvider value={profileItems}>
        <RowTypesProvider value={getRowTypes}>{children}</RowTypesProvider>
      </ProfileItemsProvider>
    </InMemoryListProvider>
  );
};
