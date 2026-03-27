/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiPopover, EuiFilterButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDebouncedValue } from '@kbn/react-hooks';
import useAsync from 'react-use/lib/useAsync';
import type { HttpStart } from '@kbn/core-http-browser';
import { InlineFilterPopover } from './inline_filter_popover';
import { fetchRulesSearch } from '../apis/fetch_rules_search';

const RULE_SEARCH_DEBOUNCE_MS = 250;

interface RuleFilterProps {
  selectedRuleId?: string | null;
  onRuleChange: (ruleId: string | undefined) => void;
  ruleOptions: Array<{ label: string; value: string }>;
  services: { http: HttpStart };
  'data-test-subj'?: string;
}

export function RuleFilter({
  selectedRuleId,
  onRuleChange,
  ruleOptions,
  services: { http },
  'data-test-subj': dataTestSubj = 'ruleFilter',
}: RuleFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, RULE_SEARCH_DEBOUNCE_MS);

  const searchRules = useCallback((query: string) => fetchRulesSearch({ http, query }), [http]);

  const { value: searchResults = [] } = useAsync(async () => {
    if (!searchRules || !debouncedSearch.trim()) {
      return [];
    }
    return searchRules(debouncedSearch.trim());
  }, [searchRules, debouncedSearch]);

  const effectiveOptions = useMemo(() => {
    if (!search.trim()) return ruleOptions;
    if (debouncedSearch.trim() && searchResults.length > 0) {
      const selectedIds = selectedRuleId ? new Set([selectedRuleId]) : new Set<string>();
      const selectedFromInitial = ruleOptions.filter((o) => selectedIds.has(o.value));
      const resultIds = new Set(searchResults.map((o) => o.value));
      const missingSelected = selectedFromInitial.filter((o) => !resultIds.has(o.value));
      return [...missingSelected, ...searchResults];
    }
    const q = search.toLowerCase();
    return ruleOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [debouncedSearch, searchResults, ruleOptions, selectedRuleId, search]);

  const handleSelectionChange = useCallback(
    (values: string[]) => {
      onRuleChange(values.length > 0 ? values[0] : undefined);
    },
    [onRuleChange]
  );

  return (
    <EuiPopover
      aria-label={i18n.translate('xpack.alertingV2EpisodesUi.ruleFilter.ariaLabel', {
        defaultMessage: 'Rule filter',
      })}
      button={
        <EuiFilterButton
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setIsOpen(!isOpen)}
          isSelected={isOpen}
          hasActiveFilters={!!selectedRuleId}
          numFilters={ruleOptions.length}
          numActiveFilters={selectedRuleId ? 1 : undefined}
          data-test-subj={`${dataTestSubj}-button`}
        >
          {i18n.translate('xpack.alertingV2EpisodesUi.ruleFilter.label', {
            defaultMessage: 'Rule',
          })}
        </EuiFilterButton>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      panelPaddingSize="none"
    >
      <InlineFilterPopover
        options={effectiveOptions}
        selectedValues={selectedRuleId ? [selectedRuleId] : []}
        singleSelect
        onSelectionChange={handleSelectionChange}
        searchable={true}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={i18n.translate(
          'xpack.alertingV2EpisodesUi.ruleFilter.searchPlaceholder',
          {
            defaultMessage: 'Search rules…',
          }
        )}
        emptyMessage={i18n.translate('xpack.alertingV2EpisodesUi.ruleFilter.noMatch', {
          defaultMessage: 'No matching rules',
        })}
        data-test-subj={`${dataTestSubj}-popover`}
      />
    </EuiPopover>
  );
}
