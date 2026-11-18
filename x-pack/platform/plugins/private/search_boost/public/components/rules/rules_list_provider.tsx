/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import type { ActiveFilters, ContentListItem, FindItemsParams } from '@kbn/content-list-provider';
import type { BoostRuleListItem } from '../../../common/types';
import { InMemoryListProvider } from '../in_memory_list_provider';
import { useItemActions } from '../item_actions';
import { createItemLookup, toItemsById } from '../item_lookup';
import { matchesIncludeExclude, matchesSearch } from '../list_matchers';
import { RowTypesProvider, TYPE_FIELD, TYPE_FIELD_DEFINITION } from '../type_filter';
import {
  PROFILE_FIELD,
  ProfileNamesProvider,
  createProfileFieldDefinition,
} from './profile_filter';
import { RULES_LIST_LABELS } from '../../translations';

type RuleItem = ContentListItem &
  BoostRuleListItem & { source: BoostRuleListItem; appliesTo: number; storageSizeInBytes: number };

const { ItemsProvider: RuleItemsProvider, useItemLookup } = createItemLookup<RuleItem>();

export const useRuleItem = useItemLookup;

const escapeQueryValue = (value: string) => value.replace(/["\\]/g, '\\$&');

const toItem = (rule: BoostRuleListItem): RuleItem => {
  const applied = rule.matches.filter(({ outrankedByRuleName }) => !outrankedByRuleName);
  return {
    ...rule,
    source: rule,
    id: rule.name,
    title: rule.name,
    appliesTo: applied.length,
    storageSizeInBytes: applied.reduce(
      (total, { storageSizeInBytes = 0 }) => total + storageSizeInBytes,
      0
    ),
  };
};

const createMatchers = (searchesProfileNames: boolean) => {
  const matchesOtherThanType = (rule: RuleItem, filters: ActiveFilters) =>
    matchesSearch(
      filters.search,
      searchesProfileNames ? [rule.name, rule.boost_profile] : [rule.name]
    ) && matchesIncludeExclude(filters, PROFILE_FIELD, rule.boost_profile);
  const matchesRule = (rule: RuleItem, { filters }: FindItemsParams) =>
    matchesOtherThanType(rule, filters) && matchesIncludeExclude(filters, TYPE_FIELD, rule.type);
  return { matchesOtherThanType, matchesRule };
};

const MATCHERS = createMatchers(true);
const NAME_ONLY_MATCHERS = createMatchers(false);

export interface RulesListProviderProps {
  /** Must keep its identity between renders, since a new array reloads the list. */
  rules: BoostRuleListItem[];
  queryKeyScope: string;
  initialProfileName?: string;
  searchesProfileNames?: boolean;
  canEdit?: boolean;
  onEdit?: (rule: BoostRuleListItem) => void;
  /** Custom rules only. */
  onDuplicate?: (rule: BoostRuleListItem) => void;
  /** Custom rules only. */
  onDelete?: (rule: BoostRuleListItem) => void;
  children: ReactNode;
}

export const RulesListProvider = ({
  rules,
  queryKeyScope,
  initialProfileName,
  searchesProfileNames = true,
  canEdit = false,
  onEdit,
  onDuplicate,
  onDelete,
  children,
}: RulesListProviderProps) => {
  const { items, ruleItems, profileNames } = useMemo(() => {
    const ruleItemList = rules.map(toItem);
    return {
      items: ruleItemList,
      ruleItems: toItemsById(ruleItemList),
      profileNames: [...new Set(rules.map(({ boost_profile: profileName }) => profileName))].sort(
        (a, b) => a.localeCompare(b)
      ),
    };
  }, [rules]);
  const fields = useMemo(
    () => [createProfileFieldDefinition(profileNames), TYPE_FIELD_DEFINITION],
    [profileNames]
  );
  const { matchesOtherThanType, matchesRule } = searchesProfileNames
    ? MATCHERS
    : NAME_ONLY_MATCHERS;
  const getRowTypes = (filters: ActiveFilters) =>
    items.filter((rule) => matchesOtherThanType(rule, filters)).map(({ type }) => type);

  const itemConfig = useItemActions({
    canEdit,
    getSource: (item) => ruleItems.get(item.id)?.source,
    onEdit,
    onDuplicate,
    onDelete,
  });

  return (
    <InMemoryListProvider
      items={items}
      queryKeyScope={queryKeyScope}
      labels={RULES_LIST_LABELS}
      matches={matchesRule}
      fields={fields}
      initialSearch={
        initialProfileName && `${PROFILE_FIELD}:"${escapeQueryValue(initialProfileName)}"`
      }
      item={itemConfig}
    >
      <RuleItemsProvider value={ruleItems}>
        <ProfileNamesProvider value={profileNames}>
          <RowTypesProvider value={getRowTypes}>{children}</RowTypesProvider>
        </ProfileNamesProvider>
      </RuleItemsProvider>
    </InMemoryListProvider>
  );
};
