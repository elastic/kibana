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
import { FormattedMessage, FormattedTime } from '@kbn/i18n/react';
import { AgentsLib } from '../../../lib/agent';
import { AgentEvent, Agent } from '../../../../common/types/domain_data';
import { usePagination } from '../../../hooks/use_pagination';

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
  pagination: { currentPage: number; pageSize: number }
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
    try {
      const { list, total } = await agents.getAgentEvents(
        agent.id,
        search,
        pagination.currentPage,
        pagination.pageSize
      );

      setState({
        isLoading: false,
        total,
        list,
      });
    } catch (err) {
      setState({
        isLoading: false,
        total: 0,
        list: [],
      });
    }
  };
  useEffect(() => {
    fetchAgentEvents();
  }, [agent.id, search, pagination]);

  return { ...state, refresh: fetchAgentEvents };
}

export const AgentEventsTable: SFC<{ agents: AgentsLib; agent: Agent }> = ({ agents, agent }) => {
  const { pageSizeOptions, pagination, setPagination } = usePagination();
  const { search, setSearch } = useSearch();

  const { list, total, isLoading, refresh } = useGetAgentEvents(agents, agent, search, pagination);
  const paginationOptions = {
    pageIndex: pagination.currentPage - 1,
    pageSize: pagination.pageSize,
    totalItemCount: total,
    pageSizeOptions,
  };

  const columns = [
    {
      field: 'timestamp',
      name: i18n.translate('xpack.fleet.agentEventsList.timestampColumnTitle', {
        defaultMessage: 'Timestamp',
      }),
      render: (timestamp: string) => (
        <FormattedTime value={new Date(timestamp)} month="numeric" day="numeric" year="numeric" />
      ),
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
    const newPagination = {
      ...pagination,
      currentPage: page.index + 1,
      pageSize: page.size,
    };

    setPagination(newPagination);
  };

  return (
    <>
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
        pagination={paginationOptions}
        loading={isLoading}
      />
    </>
  );
};
