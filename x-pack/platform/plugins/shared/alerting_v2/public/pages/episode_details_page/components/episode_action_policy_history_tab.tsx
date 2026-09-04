/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiPanel,
  EuiSpacer,
  useEuiMinBreakpoint,
  type CriteriaWithPagination,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { PolicyExecutionOutcomeFilter } from '@kbn/alerting-v2-schemas';
import { ActionPolicyDetailsFlyoutContainer } from '../../../components/action_policy/details_flyout/action_policy_details_flyout_container';
import { useFetchExecutionHistory } from '../../../hooks/use_fetch_execution_history';
import type { PolicyExecutionHistoryItem } from '../../../services/execution_history_api';
import {
  ExecutionHistoryErrorState,
  ExecutionHistorySearchBar,
  FilteredEmptyState,
  PoliciesEmptyState,
  PoliciesExecutionHistoryTable,
  type PolicyOutcomeFilter,
} from '../../execution_history_page/components';

const DEFAULT_PER_PAGE = 10;
const DEFAULT_OUTCOME: PolicyOutcomeFilter = 'all';

const toOutcomeParam = (filter: PolicyOutcomeFilter): PolicyExecutionOutcomeFilter | undefined =>
  filter === 'all' ? undefined : [filter];

interface Props {
  episodeId: string;
  /**
   * Episode start. Used as the lower bound for the execution-history query.
   */
  episodeStart?: string;
}

export const EpisodeActionPolicyHistoryTab = ({ episodeId, episodeStart }: Props) => {
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [search, setSearch] = useState('');
  const [outcome, setOutcome] = useState<PolicyOutcomeFilter>(DEFAULT_OUTCOME);
  const [policyToViewId, setPolicyToViewId] = useState<string | null>(null);

  const trimmedSearch = search.trim();
  const searchParam = trimmedSearch.length > 0 ? trimmedSearch : undefined;
  const outcomeParam = toOutcomeParam(outcome);

  const { data, isFetching, isError, refetch } = useFetchExecutionHistory({
    page: page + 1,
    perPage,
    search: searchParam,
    outcome: outcomeParam,
    episodeIds: [episodeId],
    startDate: episodeStart,
  });

  const onSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(0);
  }, []);

  const onOutcomeChange = useCallback((value: PolicyOutcomeFilter) => {
    setOutcome(value);
    setPage(0);
  }, []);

  const onTableChange = useCallback(
    ({ page: tablePage }: CriteriaWithPagination<PolicyExecutionHistoryItem>) => {
      if (tablePage) {
        setPage(tablePage.index);
        setPerPage(tablePage.size);
      }
    },
    [setPage, setPerPage]
  );

  const items = data?.items ?? [];
  const totalEvents = data?.total_events ?? 0;
  const isFiltered = searchParam !== undefined || outcome !== DEFAULT_OUTCOME;

  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="l"
      css={css`
        ${useEuiMinBreakpoint('m')} {
          height: 100%;
          overflow-y: auto;
        }
      `}
      data-test-subj="episodeActionPolicyHistoryTab"
    >
      {isError ? (
        <ExecutionHistoryErrorState onRetry={() => refetch()} />
      ) : (
        <>
          <ExecutionHistorySearchBar
            onSearchChange={onSearchChange}
            outcome={outcome}
            onOutcomeChange={onOutcomeChange}
            showRuleFilter={false}
          />
          <EuiSpacer size="m" />
          <PoliciesExecutionHistoryTable
            tableCaption={i18n.translate(
              'xpack.alertingV2.episodeDetails.actionPolicyHistory.tableCaption',
              {
                defaultMessage: 'Action policy execution history for this episode',
              }
            )}
            items={items}
            loading={isFetching}
            pageIndex={page}
            pageSize={perPage}
            totalItemCount={totalEvents}
            onChange={onTableChange}
            onPolicyClick={setPolicyToViewId}
            noItemsMessage={isFiltered ? <FilteredEmptyState /> : <PoliciesEmptyState />}
            showEpisodeColumns={false}
            showRulesColumn={false}
          />
        </>
      )}
      {policyToViewId && (
        <ActionPolicyDetailsFlyoutContainer
          policyId={policyToViewId}
          onClose={() => setPolicyToViewId(null)}
        />
      )}
    </EuiPanel>
  );
};
