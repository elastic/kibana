/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFieldSearch, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useDebouncedValue } from '@kbn/react-hooks';
import type { Streams } from '@kbn/streams-schema';
import React, { useMemo, useState } from 'react';
import { useFetchDiscoveryQueries } from '../../hooks/use_fetch_discovery_queries';
import { LoadingPanel } from '../loading_panel';
import { EmptyState } from './empty_state';
import { useFetchKnowledgeIndicators } from './hooks/use_knowledge_indicators_data';
import { KnowledgeIndicatorRulesSelector } from './knowledge_indicator_rules_selector';
import { KnowledgeIndicatorsStatusFilter } from './knowledge_indicators_status_filter';
import { KnowledgeIndicatorsTypeFilter } from './knowledge_indicators_type_filter';
import { RulesTable } from './rules_table';
import { SignificantEventsTable } from './significant_events_table';

interface Props {
  definition: Streams.all.GetResponse;
}

export function StreamDetailSignificantEventsView({ definition }: Props) {
  const [tableSearchValue, setTableSearchValue] = useState('');
  const debouncedTableSearchValue = useDebouncedValue(tableSearchValue, SEARCH_DEBOUNCE_MS);
  const [knowledgeIndicatorStatusFilter, setKnowledgeIndicatorStatusFilter] = useState<
    'active' | 'excluded'
  >('active');
  const [selectedKnowledgeIndicatorTypes, setSelectedKnowledgeIndicatorTypes] = useState<string[]>(
    []
  );
  const [typeFilterOptions, setTypeFilterOptions] = useState<EuiSelectableOption[]>([
    {
      key: 'knowledge_indicator',
      checked: 'on',
      label: KNOWLEDGE_INDICATORS_FILTER_LABEL,
    },
    {
      key: 'rule',
      label: RULES_FILTER_LABEL,
    },
  ]);
  const rulesQueriesFetchState = useFetchDiscoveryQueries({
    name: definition.stream.name,
    query: '',
    page: 1,
    perPage: 1000,
    status: ['active'],
  });
  const {
    knowledgeIndicators,
    isLoading: isKnowledgeIndicatorsLoading,
    isEmpty,
  } = useFetchKnowledgeIndicators({ definition });

  const ruleQueries = useMemo(
    () => (rulesQueriesFetchState.data?.queries ?? []).filter((queryRow) => queryRow.rule_backed),
    [rulesQueriesFetchState.data?.queries]
  );
  const occurrencesByQueryId = useMemo(
    () =>
      Object.fromEntries(
        ruleQueries.map((ruleQuery) => [ruleQuery.query.id, ruleQuery.occurrences] as const)
      ),
    [ruleQueries]
  );

  const isRulesSelected = useMemo(
    () => typeFilterOptions.some((option) => option.key === 'rule' && option.checked === 'on'),
    [typeFilterOptions]
  );

  if (isKnowledgeIndicatorsLoading || (isRulesSelected && rulesQueriesFetchState.isLoading)) {
    return <LoadingPanel size="xxl" />;
  }

  if (isEmpty) {
    return <EmptyState onManualEntryClick={() => {}} onGenerateSuggestionsClick={() => {}} />;
  }

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem grow={false}>
          <EuiPanel hasBorder={false} hasShadow={true}>
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              responsive={false}
              css={css`
                width: 100%;
                min-height: 44px;
              `}
            >
              <EuiFlexItem grow={false}>
                <KnowledgeIndicatorRulesSelector
                  options={typeFilterOptions}
                  onChange={setTypeFilterOptions}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFieldSearch
                  fullWidth
                  value={tableSearchValue}
                  onChange={(event) => setTableSearchValue(event.target.value)}
                  placeholder={SIGNIFICANT_EVENTS_SEARCH_PLACEHOLDER}
                  aria-label={SIGNIFICANT_EVENTS_SEARCH_ARIA_LABEL}
                />
              </EuiFlexItem>
              {!isRulesSelected ? (
                <EuiFlexItem grow={false}>
                  <KnowledgeIndicatorsStatusFilter
                    knowledgeIndicators={knowledgeIndicators}
                    searchTerm={debouncedTableSearchValue}
                    selectedTypes={selectedKnowledgeIndicatorTypes}
                    statusFilter={knowledgeIndicatorStatusFilter}
                    onStatusFilterChange={setKnowledgeIndicatorStatusFilter}
                  />
                </EuiFlexItem>
              ) : null}
              {!isRulesSelected ? (
                <EuiFlexItem grow={false}>
                  <KnowledgeIndicatorsTypeFilter
                    knowledgeIndicators={knowledgeIndicators}
                    searchTerm={debouncedTableSearchValue}
                    statusFilter={knowledgeIndicatorStatusFilter}
                    selectedTypes={selectedKnowledgeIndicatorTypes}
                    onSelectedTypesChange={setSelectedKnowledgeIndicatorTypes}
                  />
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            {isRulesSelected ? (
              <RulesTable rules={ruleQueries} searchTerm={debouncedTableSearchValue} />
            ) : (
              <SignificantEventsTable
                knowledgeIndicators={knowledgeIndicators}
                occurrencesByQueryId={occurrencesByQueryId}
                searchTerm={debouncedTableSearchValue}
                selectedTypes={selectedKnowledgeIndicatorTypes}
                statusFilter={knowledgeIndicatorStatusFilter}
              />
            )}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

const KNOWLEDGE_INDICATORS_FILTER_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.typeFilter.knowledgeIndicatorsLabel',
  {
    defaultMessage: 'Knowledge Indicators',
  }
);

const RULES_FILTER_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.typeFilter.rulesLabel',
  {
    defaultMessage: 'Rules',
  }
);

const SIGNIFICANT_EVENTS_SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.streams.significantEventsTable.searchPlaceholder',
  {
    defaultMessage: 'Search significant events',
  }
);

const SIGNIFICANT_EVENTS_SEARCH_ARIA_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.searchAriaLabel',
  {
    defaultMessage: 'Search significant events',
  }
);

const SEARCH_DEBOUNCE_MS = 300;
