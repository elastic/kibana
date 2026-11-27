/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useService } from '@kbn/core-di-browser';
import {
  UNIVERSAL_RULE_CREATE_OPTIONS,
  type UniversalRuleCreateOption,
  type UniversalRuleCreateOptionId,
} from '../components/rule_create_options/universal_rule_create_options';
import type {
  RuleCreateSearchItem,
  RuleCreateSearchSectionResult,
} from '../components/rule_create_search';
import { UserCapabilities } from '../services/user_capabilities';
import { useAlertingV2ExperimentalFeatures } from './use_alerting_v2_experimental_features';

export interface UniversalSearchSectionHandlers {
  readonly onCreateEsqlRule: () => void;
  readonly onCreateThresholdRule: () => void;
  readonly onBuildSequence?: () => void;
}

const EMPTY_SECTION_RESULT: RuleCreateSearchSectionResult = {
  items: [],
  isLoading: false,
};

/** Removes pipes and lowercases so queries like "esql" match "ES|QL". */
const normalizeForSearch = (value: string): string => value.replace(/\|/g, '').toLowerCase();

const matchesText = (text: string, rawQuery: string, normalizedQuery: string): boolean =>
  normalizedQuery === ''
    ? text.toLowerCase().includes(rawQuery)
    : normalizeForSearch(text).includes(normalizedQuery);

const matchesOption = (
  { title, description }: UniversalRuleCreateOption,
  rawQuery: string,
  normalizedQuery: string
): boolean =>
  matchesText(title, rawQuery, normalizedQuery) ||
  matchesText(description, rawQuery, normalizedQuery);

/** Filters the Universal rule creation options for the create rule search dropdown. */
export const useUniversalSearchSection = (
  query: string,
  { onCreateEsqlRule, onCreateThresholdRule, onBuildSequence }: UniversalSearchSectionHandlers
): RuleCreateSearchSectionResult => {
  const canWrite = useService(UserCapabilities).canWrite('rules');
  const isExperimentalEnabled = useAlertingV2ExperimentalFeatures();

  return useMemo(() => {
    const trimmedQuery = query.trim();
    if (!canWrite || trimmedQuery === '') {
      return EMPTY_SECTION_RESULT;
    }

    const rawQuery = trimmedQuery.toLowerCase();
    const normalizedQuery = normalizeForSearch(trimmedQuery);
    const handlersById: Record<UniversalRuleCreateOptionId, (() => void) | undefined> = {
      threshold: onCreateThresholdRule,
      sequence: isExperimentalEnabled ? onBuildSequence : undefined,
      esql: onCreateEsqlRule,
    };

    const items = UNIVERSAL_RULE_CREATE_OPTIONS.flatMap((option): RuleCreateSearchItem[] => {
      const onSelect = handlersById[option.id];
      if (!onSelect || !matchesOption(option, rawQuery, normalizedQuery)) {
        return [];
      }

      const { id, title, description, iconType } = option;
      return [{ id, title, description, iconType, onSelect }];
    });

    return { items, isLoading: false };
  }, [
    canWrite,
    isExperimentalEnabled,
    onBuildSequence,
    onCreateEsqlRule,
    onCreateThresholdRule,
    query,
  ]);
};
