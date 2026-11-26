/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import {
  MAX_RESULTS_PER_SECTION,
  RULE_CREATE_SEARCH_SECTION_IDS,
  RULE_CREATE_SEARCH_SECTION_TITLES,
} from './constants';
import type {
  RuleCreateSearchItem,
  RuleCreateSearchSectionHeaderAction,
  RuleCreateSearchSectionId,
  RuleCreateSearchSections,
} from './types';

export interface RuleCreateSearchOptionData {
  readonly sectionId: RuleCreateSearchSectionId;
  readonly item?: RuleCreateSearchItem;
  readonly isLoading?: boolean;
  readonly headerAction?: RuleCreateSearchSectionHeaderAction;
}

export type RuleCreateSearchOption = EuiSelectableOption<RuleCreateSearchOptionData>;

/** Flattens the sections into selectable options: a group label per visible section followed by its items. */
export const getSearchOptions = (sections: RuleCreateSearchSections): RuleCreateSearchOption[] =>
  RULE_CREATE_SEARCH_SECTION_IDS.flatMap((sectionId): RuleCreateSearchOption[] => {
    const section = sections[sectionId];
    if (!section || section.error) {
      return [];
    }

    const { items, isLoading, headerAction } = section;
    const visibleItems = items.slice(0, MAX_RESULTS_PER_SECTION);
    if (visibleItems.length === 0 && !isLoading) {
      return [];
    }

    const groupLabel: RuleCreateSearchOption = {
      key: `group:${sectionId}`,
      label: RULE_CREATE_SEARCH_SECTION_TITLES[sectionId],
      isGroupLabel: true,
      sectionId,
      isLoading: isLoading && visibleItems.length === 0,
      headerAction,
    };

    const itemOptions = visibleItems.map(
      (item): RuleCreateSearchOption => ({
        key: `item:${sectionId}:${item.id}`,
        label: item.title,
        sectionId,
        item,
      })
    );

    return [groupLabel, ...itemOptions];
  });
