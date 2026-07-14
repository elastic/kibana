/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiComboBox, EuiFieldSearch, EuiFlexGroup, EuiFlexItem, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useDebounce from 'react-use/lib/useDebounce';
import { useService } from '@kbn/core-di-browser';
import type { PolicyExecutionOutcomeFilter } from '@kbn/alerting-v2-schemas';
import { useFetchRules } from '../../../hooks/use_fetch_rules';
import { UserCapabilities } from '../../../services/user_capabilities';

const SEARCH_DEBOUNCE_MS = 300;
const RULE_FILTER_MAX_RESULTS = 20;

const OUTCOME_OPTIONS: Array<{ value: PolicyExecutionOutcomeFilter; text: string }> = [
  {
    value: 'all',
    text: i18n.translate('xpack.alertingV2.executionHistory.searchBar.outcome.all', {
      defaultMessage: 'All',
    }),
  },
  {
    value: 'dispatched',
    text: i18n.translate('xpack.alertingV2.executionHistory.searchBar.outcome.dispatched', {
      defaultMessage: 'Dispatched',
    }),
  },
  {
    value: 'throttled',
    text: i18n.translate('xpack.alertingV2.executionHistory.searchBar.outcome.throttled', {
      defaultMessage: 'Throttled',
    }),
  },
];

export interface RuleOption {
  id: string;
  name: string;
}

interface ExecutionHistorySearchBarProps {
  onSearchChange: (search: string) => void;
  outcome: PolicyExecutionOutcomeFilter;
  onOutcomeChange: (outcome: PolicyExecutionOutcomeFilter) => void;
  ruleFilters: RuleOption[];
  onRuleFiltersChange: (rules: RuleOption[]) => void;
}

export const ExecutionHistorySearchBar = ({
  onSearchChange,
  outcome,
  onOutcomeChange,
  ruleFilters,
  onRuleFiltersChange,
}: ExecutionHistorySearchBarProps) => {
  const [searchInput, setSearchInput] = useState('');
  const [ruleSearchInput, setRuleSearchInput] = useState('');
  const [debouncedRuleSearch, setDebouncedRuleSearch] = useState('');

  const canReadRules = useService(UserCapabilities).canRead('rules');

  useDebounce(
    () => {
      onSearchChange(searchInput);
    },
    SEARCH_DEBOUNCE_MS,
    [onSearchChange, searchInput]
  );

  useDebounce(
    () => {
      setDebouncedRuleSearch(ruleSearchInput);
    },
    SEARCH_DEBOUNCE_MS,
    [ruleSearchInput]
  );

  const { data: rulesData, isFetching: isFetchingRules } = useFetchRules({
    page: 1,
    perPage: RULE_FILTER_MAX_RESULTS,
    search: debouncedRuleSearch.trim() || undefined,
    enabled: canReadRules,
  });

  const ruleOptions = (rulesData?.items ?? []).map((r) => ({
    key: r.id,
    label: r.metadata.name,
    value: { id: r.id, name: r.metadata.name },
  }));

  const selectedOptions = ruleFilters.map((r) => ({ key: r.id, label: r.name, value: r }));

  return (
    <EuiFlexGroup gutterSize="s" direction="row" responsive={false} css={{ flexGrow: 0 }}>
      <EuiFlexItem grow>
        <EuiFieldSearch
          compressed
          fullWidth
          data-test-subj="executionHistorySearchBar"
          placeholder={i18n.translate(
            'xpack.alertingV2.executionHistory.searchBar.searchPlaceholder',
            { defaultMessage: 'Search execution history...' }
          )}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          aria-label={i18n.translate(
            'xpack.alertingV2.executionHistory.searchBar.searchAriaLabel',
            { defaultMessage: 'Search execution history by policy or rule' }
          )}
        />
      </EuiFlexItem>
      {canReadRules && (
        <EuiFlexItem grow={false} style={{ minWidth: 260 }}>
          <EuiComboBox<RuleOption>
            compressed
            data-test-subj="executionHistoryRuleFilter"
            async
            isClearable
            isLoading={isFetchingRules}
            placeholder={i18n.translate(
              'xpack.alertingV2.executionHistory.searchBar.rulePlaceholder',
              { defaultMessage: 'Filter by rules' }
            )}
            options={ruleOptions}
            selectedOptions={selectedOptions}
            onSearchChange={setRuleSearchInput}
            onChange={(picked) => {
              const values = picked
                .map((opt) => opt.value)
                .filter((v): v is RuleOption => v !== undefined);
              onRuleFiltersChange(values);
            }}
            aria-label={i18n.translate(
              'xpack.alertingV2.executionHistory.searchBar.ruleAriaLabel',
              {
                defaultMessage: 'Filter by rules',
              }
            )}
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiSelect
          compressed
          data-test-subj="executionHistoryOutcomeFilter"
          options={OUTCOME_OPTIONS}
          value={outcome}
          onChange={(e) => onOutcomeChange(e.target.value as PolicyExecutionOutcomeFilter)}
          prepend={i18n.translate('xpack.alertingV2.executionHistory.searchBar.outcomeLabel', {
            defaultMessage: 'Outcome',
          })}
          aria-label={i18n.translate(
            'xpack.alertingV2.executionHistory.searchBar.outcomeAriaLabel',
            { defaultMessage: 'Filter by outcome' }
          )}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
