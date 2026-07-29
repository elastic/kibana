/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiPanel,
  logicalCSS,
  useEuiMaxBreakpoint,
  useEuiMinBreakpoint,
  type CriteriaWithPagination,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ActionPolicyDetailsFlyoutContainer } from '../../../components/action_policy/details_flyout/action_policy_details_flyout_container';
import { useFetchExecutionHistory } from '../../../hooks/use_fetch_execution_history';
import type { PolicyExecutionHistoryItem } from '../../../services/execution_history_api';
import {
  ExecutionHistoryErrorState,
  PoliciesEmptyState,
  PoliciesExecutionHistoryTable,
} from '../../execution_history_page/components';

const DEFAULT_PER_PAGE = 10;

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
  const [policyToViewId, setPolicyToViewId] = useState<string | null>(null);

  const { data, isFetching, isError, refetch } = useFetchExecutionHistory({
    page: page + 1,
    perPage,
    episodeIds: [episodeId],
    startDate: episodeStart,
  });

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
  const totalEvents = data?.totalEvents ?? 0;

  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="l"
      css={css`
        ${useEuiMaxBreakpoint('s')} {
          ${logicalCSS('padding-horizontal', '0')}
        }

        ${useEuiMinBreakpoint('m')} {
          height: 100%;
          overflow-y: auto;
          ${logicalCSS('padding-left', '0')}
        }
      `}
      data-test-subj="episodeActionPolicyHistoryTab"
    >
      {isError ? (
        <ExecutionHistoryErrorState onRetry={() => refetch()} />
      ) : (
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
          noItemsMessage={<PoliciesEmptyState />}
          showEpisodeColumns={false}
          showRulesColumn={false}
        />
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
