/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, SFC } from 'react';
import {
  EuiBasicTable,
  // @ts-ignore
  EuiSearchBar,
  EuiFlexGroup,
  EuiButton,
  EuiSpacer,
  EuiFlexItem,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { AgentsLib } from '../../lib/agent';
import { AgentEvent, Agent } from '../../../common/types/domain_data';
import { formatDate } from '../../utils/date';

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZES = [10, 20, 50];

function usePagination() {
  const [pageIndex, setCurrentPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  return {
    pageIndex,
    setCurrentPageIndex,
    pageSize,
    setPageSize,
  };
}

function useSearch() {
  const [search, setSearch] = useState('');

  return {
    search,
    setSearch,
  };
}

function useGetAgentEvents(
  agents: AgentsLib,
  agent: Agent,
  search: string,
  page: number,
  pageSize: number
) {
  const [state, setState] = useState<{ list: AgentEvent[]; total: number; isLoading: boolean }>({
    list: [],
    total: 0,
    isLoading: false,
  });
  const fetchAgentEvents = async () => {
    setState({
      isLoading: true,
      total: state.total,
      list: state.list,
    });
    const { list, total } = await agents.getAgentEvents(agent.id, search, page, pageSize);

    setState({
      isLoading: false,
      total,
      list,
    });
  };
  useEffect(() => {
    fetchAgentEvents();
  }, [agent.id, search, page, pageSize]);

  return { ...state, refresh: fetchAgentEvents };
}

export const AgentEventsTable: SFC<{ agents: AgentsLib; agent: Agent }> = ({ agents, agent }) => {
  const { pageIndex, setCurrentPageIndex, setPageSize, pageSize } = usePagination();
  const { search, setSearch } = useSearch();

  const { list, total, isLoading, refresh } = useGetAgentEvents(
    agents,
    agent,
    search,
    pageIndex + 1,
    pageSize
  );
  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: total,
    pageSizeOptions: PAGE_SIZES,
  };

  const columns = [
    {
      field: 'timestamp',
      name: i18n.translate('xpack.fleet.agentEventsList.timestampColumnTitle', {
        defaultMessage: 'Timestamp',
      }),
      render: (timestamp: string) => formatDate(timestamp),
      sortable: true,
    },
    {
      field: 'type',
      name: i18n.translate('xpack.fleet.agentEventsList.typeColumnTitle', {
        defaultMessage: 'Type',
      }),
      width: '90px',
    },
    {
      field: 'subtype',
      name: i18n.translate('xpack.fleet.agentEventsList.subtypeColumnTitle', {
        defaultMessage: 'Subtype',
      }),
      width: '90px',
    },
    {
      field: 'message',
      name: i18n.translate('xpack.fleet.agentEventsList.messageColumnTitle', {
        defaultMessage: 'Message',
      }),
    },
    {
      field: 'payload',
      name: i18n.translate('xpack.fleet.agentEventsList.paylodColumnTitle', {
        defaultMessage: 'Payload',
      }),
      truncateText: true,
      render: (payload: any) => (
        <span>
          <code>{payload && JSON.stringify(payload, null, 2)}</code>
        </span>
      ),
    },
  ];

  const onClickRefresh = () => {
    refresh();
  };
  const onChangeQuery = (e: any) => {
    setSearch(e.queryText);
  };
  const onChange = ({ page }: { page: { index: number; size: number } }) => {
    setCurrentPageIndex(page.index);
    setPageSize(page.size);
  };

  return (
    <div>
      <EuiTitle size="s">
        <h3>
          <FormattedMessage id="xpack.fleet.agentEventsList.title" defaultMessage="Activity Log" />
        </h3>
      </EuiTitle>
      <EuiSpacer size="l" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiSearchBar
            query={search}
            box={{
              placeholder: 'e.g. type:STATE',
              incremental: true,
              schema: {},
            }}
            onChange={onChangeQuery}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={null}>
          <EuiButton color="secondary" iconType="refresh" onClick={onClickRefresh}>
            <FormattedMessage
              id="xpack.fleet.agentEventsList.refreshButton"
              defaultMessage="Refresh"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiBasicTable
        onChange={onChange}
        items={list}
        columns={columns}
        pagination={pagination}
        loading={isLoading}
      />
    </div>
  );
};
