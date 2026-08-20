/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { ActionOptionData, MenuSelectableOption } from './types';
import { isActionCategory } from './types';
import * as i18n from '../../translations';

interface UseDisplayOptionsArgs {
  /** Current browse-level options (root categories or a subgroup). */
  options: ActionOptionData[];
  /** Full category tree — used to section search results by root category. */
  categoryTree: ActionOptionData[];
  searchTerm: string;
  /** Empty path = root (section labels); non-empty = nested browse. */
  currentPath: string[];
  /** Prefixed onto leaf `data-test-subj` values (e.g. `templateActionsMenu`). */
  testSubjPrefix: string;
  /** When false, root items are listed without "Add field" / "Field rules" headers. */
  showSectionLabels?: boolean;
}

const MAX_ACTION_MATCH_RANK = 5;

const getActionMatchRank = (option: ActionOptionData, normalizedTerm: string): number => {
  if (!normalizedTerm) return 0;
  const id = option.id.toLowerCase();
  const label = option.label.toLowerCase();
  const description = option.description?.toLowerCase() ?? '';

  if (id === normalizedTerm) return 0;
  if (label === normalizedTerm) return 1;
  if (description === normalizedTerm) return 2;
  if (id.includes(normalizedTerm)) return 3;
  if (label.includes(normalizedTerm)) return 4;
  if (description.includes(normalizedTerm)) return 5;
  return MAX_ACTION_MATCH_RANK + 1;
};

const isActionSearchMatch = (option: ActionOptionData, normalizedTerm: string): boolean =>
  getActionMatchRank(option, normalizedTerm) <= MAX_ACTION_MATCH_RANK;

const toSelectableOption = (
  action: ActionOptionData,
  testSubjPrefix: string
): MenuSelectableOption => ({
  label: action.label,
  key: action.id,
  disabled: action.disabled || (action.kind === 'libraryField' && action.alreadyLinked),
  'data-test-subj': action.testSubj
    ? `${testSubjPrefix}-${action.testSubj}`
    : `${testSubjPrefix}-${action.id}`,
  data: { action },
});

/**
 * Collect matching leaves under a category. The category itself becomes the section header.
 */
const collectCategoryMatches = (
  node: ActionOptionData,
  term: string,
  ancestors: ActionOptionData[] = [],
  isCategoryRoot = true
): ActionOptionData[] => {
  const results: ActionOptionData[] = [];

  if (!isCategoryRoot && isActionSearchMatch(node, term)) {
    const parent = ancestors[ancestors.length - 1];
    results.push(
      parent
        ? {
            ...node,
            description: `${parent.label} — ${node.description ?? node.label}`,
          }
        : node
    );
  }

  if (isActionCategory(node)) {
    for (const child of node.options) {
      results.push(...collectCategoryMatches(child, term, [...ancestors, node], false));
    }
  }

  return results;
};

const buildBrowseOptions = (
  options: ActionOptionData[],
  testSubjPrefix: string,
  atRoot: boolean,
  showSectionLabels: boolean
): MenuSelectableOption[] => {
  const result: MenuSelectableOption[] = [];

  if (atRoot && showSectionLabels) {
    const fields = options.filter((o) => o.id === 'newField' || o.id === 'fieldLibrary');
    const rules = options.filter((o) => o.id === 'validation' || o.id === 'conditional');

    if (fields.length > 0) {
      result.push({
        label: i18n.ACTIONS_MENU_SECTION_FIELDS,
        isGroupLabel: true,
      });
      for (const action of fields) {
        result.push(toSelectableOption(action, testSubjPrefix));
      }
    }
    if (rules.length > 0) {
      result.push({
        label: i18n.ACTIONS_MENU_SECTION_RULES,
        isGroupLabel: true,
      });
      for (const action of rules) {
        result.push(toSelectableOption(action, testSubjPrefix));
      }
    }
    return result;
  }

  for (const action of options) {
    result.push(toSelectableOption(action, testSubjPrefix));
  }
  return result;
};

const buildSearchOptions = (
  categoryTree: ActionOptionData[],
  searchTerm: string,
  testSubjPrefix: string
): MenuSelectableOption[] => {
  const term = searchTerm.trim().toLowerCase();
  if (!term) {
    return buildBrowseOptions(categoryTree, testSubjPrefix, true, true);
  }

  const result: MenuSelectableOption[] = [];

  for (const category of categoryTree) {
    // Match the category itself (so users can find "Validation" by name).
    const categoryMatches = isActionSearchMatch(category, term);
    const childMatches = isActionCategory(category)
      ? collectCategoryMatches(category, term)
          .map((m) => ({ match: m, rank: getActionMatchRank(m, term) }))
          .sort((a, b) =>
            a.rank !== b.rank
              ? a.rank - b.rank
              : a.match.label.localeCompare(b.match.label, undefined, {
                  sensitivity: 'base',
                  numeric: true,
                })
          )
          .map(({ match }) => match)
      : [];

    if (categoryMatches || childMatches.length > 0) {
      result.push({
        label: category.label,
        isGroupLabel: true,
      });

      if (categoryMatches) {
        result.push(toSelectableOption(category, testSubjPrefix));
      }
      for (const match of childMatches) {
        result.push(toSelectableOption(match, testSubjPrefix));
      }
    }
  }

  return result;
};

export const useDisplayOptions = ({
  options,
  categoryTree,
  searchTerm,
  currentPath,
  testSubjPrefix,
  showSectionLabels = true,
}: UseDisplayOptionsArgs): MenuSelectableOption[] =>
  useMemo(() => {
    const trimmed = searchTerm.trim();
    if (trimmed.length > 0) {
      return buildSearchOptions(categoryTree, trimmed, testSubjPrefix);
    }
    return buildBrowseOptions(options, testSubjPrefix, currentPath.length === 0, showSectionLabels);
  }, [options, categoryTree, searchTerm, currentPath, testSubjPrefix, showSectionLabels]);
