/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { MAX_SEARCH_LENGTH } from '@kbn/alerting-v2-schemas';
import type { RuleTemplateResponse } from '@kbn/alerting-v2-schemas';
import { useService } from '@kbn/core-di-browser';
import { useDebouncedValue } from '@kbn/react-hooks';
import {
  MAX_RESULTS_PER_SECTION,
  type RuleCreateSearchItem,
  type RuleCreateSearchSectionResult,
} from '../components/rule_create_search';
import { UserCapabilities } from '../services/user_capabilities';
import { useFetchRuleTemplates } from './use_fetch_rule_templates';

const SEARCH_DEBOUNCE_MS = 300;

const EMPTY_SECTION_RESULT: RuleCreateSearchSectionResult = {
  items: [],
  isLoading: false,
};

const LOADING_SECTION_RESULT: RuleCreateSearchSectionResult = {
  items: [],
  isLoading: true,
};

export interface TemplatesSearchSectionHandlers {
  readonly onSelectTemplate: (template: RuleTemplateResponse) => void;
}

/** Searches installed v2 rule templates for the "From templates" create rule search section. */
export const useTemplatesSearchSection = (
  query: string,
  { onSelectTemplate }: TemplatesSearchSectionHandlers
): RuleCreateSearchSectionResult => {
  const canWrite = useService(UserCapabilities).canWrite('rules');

  const trimmedQuery = query.trim();
  const canSearch = canWrite && trimmedQuery !== '' && trimmedQuery.length <= MAX_SEARCH_LENGTH;
  const debouncedQuery = useDebouncedValue(canSearch ? trimmedQuery : '', SEARCH_DEBOUNCE_MS);
  const isDebouncing = canSearch && debouncedQuery !== trimmedQuery;
  const isQueryEnabled = canSearch && !isDebouncing;

  const { data, isLoading, error } = useFetchRuleTemplates({
    page: 1,
    perPage: MAX_RESULTS_PER_SECTION,
    search: debouncedQuery || undefined,
    enabled: isQueryEnabled,
  });

  return useMemo<RuleCreateSearchSectionResult>(() => {
    if (!canSearch) {
      return EMPTY_SECTION_RESULT;
    }

    if (isDebouncing || isLoading) {
      return LOADING_SECTION_RESULT;
    }

    if (error) {
      return { items: [], isLoading: false, error };
    }

    const items: RuleCreateSearchItem[] = (data?.items ?? []).map((template) => ({
      id: template.id,
      title: template.rule.metadata.name,
      description: template.rule.metadata.description ?? undefined,
      onSelect: () => onSelectTemplate(template),
    }));

    return { items, isLoading: false };
  }, [canSearch, data?.items, error, isDebouncing, isLoading, onSelectTemplate]);
};
