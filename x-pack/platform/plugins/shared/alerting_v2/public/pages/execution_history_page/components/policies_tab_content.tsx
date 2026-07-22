/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiSpacer, EuiText, type CriteriaWithPagination } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { PolicyExecutionOutcomeFilter } from '@kbn/alerting-v2-schemas';
import { useCountNewExecutionHistoryEvents } from '../../../hooks/use_count_new_execution_history_events';
import { useFetchExecutionHistory } from '../../../hooks/use_fetch_execution_history';
import type { PolicyExecutionHistoryItem } from '../../../services/execution_history_api';
import { ExecutionHistorySearchBar, type RuleOption } from './execution_history_search_bar';
import { FilteredEmptyState, PoliciesEmptyState } from './empty_state';
import { ExecutionHistoryErrorState } from './error_state';
import { NewEventsBanner } from './new_events_banner';
import { TruncatedCallout } from './truncated_callout';
import { PoliciesExecutionHistoryTable } from './policies_execution_history_table';

const DEFAULT_PER_PAGE = 10;
const DEFAULT_OUTCOME: PolicyExecutionOutcomeFilter = 'all';

interface Props {
  onPolicyClick: (policyId: string) => void;
  onRuleClick: (ruleId: string) => void;
  activeRuleId: string | null;
}

export const PoliciesTabContent = ({ onPolicyClick, onRuleClick, activeRuleId }: Props) => {
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [search, setSearch] = useState('');
  const [ruleFilters, setRuleFilters] = useState<RuleOption[]>([]);
  const [outcome, setOutcome] = useState<PolicyExecutionOutcomeFilter>(DEFAULT_OUTCOME);
  const [lastSeenAt, setLastSeenAt] = useState(() => new Date().toISOString());
  const [isLoadingNewEvents, setIsLoadingNewEvents] = useState(false);

  const trimmedSearch = search.trim();
  const searchParam = trimmedSearch.length > 0 ? trimmedSearch : undefined;
  const ruleIdsParam = ruleFilters.length > 0 ? ruleFilters.map((r) => r.id) : undefined;

  const { data, isFetching, isError, refetch } = useFetchExecutionHistory({
    page: page + 1,
    perPage,
    search: searchParam,
    ruleIds: ruleIdsParam,
    outcome,
  });

  const { data: newCountData } = useCountNewExecutionHistoryEvents({
    since: lastSeenAt,
    search: searchParam,
    ruleIds: ruleIdsParam,
    outcome,
    enabled: !isError,
  });
  const newEventsCount = newCountData?.count ?? 0;

  // Once the list refetch settles, hide the banner by advancing the lastSeenAt anchor.
  useEffect(() => {
    if (isLoadingNewEvents && !isFetching) {
      setLastSeenAt(new Date().toISOString());
      setIsLoadingNewEvents(false);
    }
  }, [isLoadingNewEvents, isFetching]);

  const onLoadNewEvents = () => {
    setIsLoadingNewEvents(true);
    setPage(0);
    refetch();
  };

  const onSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(0);
  }, []);

  const onOutcomeChange = useCallback((value: PolicyExecutionOutcomeFilter) => {
    setOutcome(value);
    setPage(0);
  }, []);

  const onRuleFiltersChange = useCallback((values: RuleOption[]) => {
    setRuleFilters(values);
    setPage(0);
  }, []);

  const onTableChange = ({
    page: tablePage,
  }: CriteriaWithPagination<PolicyExecutionHistoryItem>) => {
    if (tablePage) {
      setPage(tablePage.index);
      setPerPage(tablePage.size);
    }
  };

  const items = data?.items ?? [];
  const totalEvents = data?.totalEvents ?? 0;
  const showBanner = newEventsCount > 0 && !isError;
  const isFiltered =
    searchParam !== undefined || ruleFilters.length > 0 || outcome !== DEFAULT_OUTCOME;

  if (isError) {
    return <ExecutionHistoryErrorState onRetry={() => refetch()} />;
  }

  return (
    <>
      <ExecutionHistorySearchBar
        onSearchChange={onSearchChange}
        outcome={outcome}
        onOutcomeChange={onOutcomeChange}
        ruleFilters={ruleFilters}
        onRuleFiltersChange={onRuleFiltersChange}
      />
      <EuiSpacer size="m" />
      <EuiText size="s">
        <p>
          {i18n.translate('xpack.alertingV2.executionHistory.policiesTab.description', {
            defaultMessage: 'Showing dispatcher decisions from the last 24 hours.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      {showBanner && (
        <>
          <NewEventsBanner
            count={newEventsCount}
            isLoading={isLoadingNewEvents}
            onLoad={onLoadNewEvents}
          />
          <EuiSpacer size="m" />
        </>
      )}
      <TruncatedCallout data={data} searchParam={searchParam} />
      <PoliciesExecutionHistoryTable
        tableCaption={i18n.translate('xpack.alertingV2.executionHistory.tableCaption', {
          defaultMessage: 'Execution history policies',
        })}
        items={items}
        loading={isFetching}
        pageIndex={page}
        pageSize={perPage}
        totalItemCount={totalEvents}
        onChange={onTableChange}
        onPolicyClick={onPolicyClick}
        onRuleClick={onRuleClick}
        activeRuleId={activeRuleId}
        noItemsMessage={isFiltered ? <FilteredEmptyState /> : <PoliciesEmptyState />}
      />
    </>
  );
};
