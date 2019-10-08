/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect } from 'react';
import useInterval from '@use-it/interval';
import {
  EuiBasicTable,
  EuiPageBody,
  EuiPageContent,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiEmptyPrompt,
  EuiLink,
  // @ts-ignore
  EuiSearchBar,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  DEFAULT_AGENTS_PAGE_SIZE,
  AGENTS_PAGE_SIZE_OPTIONS,
  AGENT_POLLING_THRESHOLD_MS,
} from '../../../common/constants';
import { Agent } from '../../../common/types/domain_data';
import { FrontendLibs } from '../../lib/types';
import { AgentHealth } from '../../components/agent_health';

interface RouterProps {
  libs: FrontendLibs;
}

export const AgentListPage: React.SFC<RouterProps> = ({ libs }) => {
  // Agent data states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [lastPolledAgentsMs, setLastPolledAgentsMs] = useState<number>(0);
  const [totalAgents, setTotalAgents] = useState<number>(0);

  // Table and search states
  const [currentQuery, setCurrentQuery] = useState<typeof EuiSearchBar.Query>(
    EuiSearchBar.Query.MATCH_ALL
  );
  const [currentPagination, setCurrentPagination] = useState<{
    pageSize: number;
    currentPage: number;
  }>({
    pageSize: DEFAULT_AGENTS_PAGE_SIZE,
    currentPage: 1,
  });

  // Fetch agents method
  const fetchAgents = async () => {
    setIsLoading(true);
    setLastPolledAgentsMs(new Date().getTime());
    const { list, total } = await libs.agents.getAll(
      currentPagination.currentPage,
      currentPagination.pageSize
      // TODO: Adjust list endpoint to support query string
      // currentQuery
    );
    setAgents(list);
    setTotalAgents(total);
    setIsLoading(false);
  };

  // Load initial list of agents
  useEffect(() => {
    fetchAgents();
  }, []);

  // Update agents if pagination or query state changes
  useEffect(() => {
    fetchAgents();
  }, [currentPagination, currentQuery]);

  // Poll for agents on interval
  useInterval(() => {
    if (new Date().getTime() - lastPolledAgentsMs >= AGENT_POLLING_THRESHOLD_MS) {
      fetchAgents();
    }
  }, AGENT_POLLING_THRESHOLD_MS);

  // Some agents retrieved, set up table props
  const columns = [
    {
      field: 'local_metadata.host',
      name: i18n.translate('xpack.fleet.agentList.hostColumnTitle', {
        defaultMessage: 'Host',
      }),
      truncateText: true,
    },
    // {
    //   field: 'id',
    //   name: i18n.translate('xpack.fleet.agentList.metaColumnTitle', {
    //     defaultMessage: 'Meta',
    //   }),
    //   truncateText: true,
    //   sortable: true,
    //   render: () => <span>some-region</span>,
    // },
    {
      field: 'policy_id',
      name: i18n.translate('xpack.fleet.agentList.policyColumnTitle', {
        defaultMessage: 'Policy',
      }),
      truncateText: true,
    },
    // {
    //   field: 'event_rate',
    //   name: i18n.translate('xpack.fleet.agentList.eventsColumnTitle', {
    //     defaultMessage: 'Events (24h)',
    //   }),
    //   truncateText: true,
    //   sortable: true,
    //   render: () => <span>34</span>,
    // },
    {
      field: 'active',
      name: i18n.translate('xpack.fleet.agentList.statusColumnTitle', {
        defaultMessage: 'Status',
      }),
      truncateText: true,
      render: (active: boolean, agent: any) => <AgentHealth agent={agent} />,
    },
    {
      name: i18n.translate('xpack.fleet.agentList.actionsColumnTitle', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          render: () => {
            return (
              <EuiLink color="primary" onClick={() => {}}>
                <FormattedMessage
                  id="xpack.fleet.agentList.viewActionLinkText"
                  defaultMessage="view"
                />
              </EuiLink>
            );
          },
        },
      ],
      width: '100px',
    },
  ];

  const emptyPrompt = (
    <EuiEmptyPrompt
      title={
        <h2>
          <FormattedMessage
            id="xpack.fleet.agentList.noAgentsPrompt"
            defaultMessage="No agents installed"
          />
        </h2>
      }
      actions={
        <EuiButton fill iconType="plusInCircle">
          <FormattedMessage
            id="xpack.fleet.agentList.addButton"
            defaultMessage="Install new agent"
          />
        </EuiButton>
      }
    />
  );

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiTitle size="l">
          <h1>
            <FormattedMessage id="xpack.fleet.agentList.pageTitle" defaultMessage="Elastic Fleet" />
          </h1>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiTitle size="s">
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.fleet.agentList.pageDescription"
              defaultMessage="Use agents to faciliate data collection for your Elastic stack."
            />
          </EuiText>
        </EuiTitle>
        <EuiSpacer size="m" />

        <EuiFlexGroup>
          <EuiFlexItem grow={4}>
            <EuiSearchBar
              query={currentQuery}
              box={{
                incremental: true,
                schema: {
                  strict: true,
                  fields: {
                    policy_id: {
                      type: 'string',
                    },
                  },
                },
              }}
              filters={[
                {
                  type: 'field_value_selection',
                  field: 'policy_id',
                  name: i18n.translate('xpack.fleet.agentList.policyFilterLabel', {
                    defaultMessage: 'Policy',
                  }),
                  multiSelect: 'or',
                  cache: AGENT_POLLING_THRESHOLD_MS,
                  // Temporary until we can load list of policies
                  options: [...new Set(agents.map(agent => agent.policy_id))].map(policy => ({
                    value: policy,
                  })),
                },
              ]}
              onChange={({ query, error }: { query: any; error: any }) => {
                if (error) {
                  // TODO: Handle malformed query error
                } else {
                  setCurrentQuery(query);
                }
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton fill iconType="plusInCircle">
              <FormattedMessage
                id="xpack.fleet.agentList.addButton"
                defaultMessage="Install new agent"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />
        <EuiBasicTable
          loading={isLoading}
          message={
            isLoading
              ? i18n.translate('xpack.fleet.agentList.loadingAgentsMessage', {
                  defaultMessage: 'Loading agents…',
                })
              : agents.length === 0
              ? emptyPrompt
              : i18n.translate('xpack.fleet.agentList.noFilteredAgentsPrompt', {
                  defaultMessage: 'No agents found',
                })
          }
          items={agents}
          itemId="id"
          columns={columns}
          pagination={{
            pageIndex: currentPagination.currentPage - 1,
            pageSize: currentPagination.pageSize,
            totalItemCount: totalAgents,
            pageSizeOptions: AGENTS_PAGE_SIZE_OPTIONS,
          }}
          onChange={({ page }: { page: { index: number; size: number } }) => {
            const newPagination = {
              ...currentPagination,
              currentPage: page.index + 1,
              pageSize: page.size,
            };
            setCurrentPagination(newPagination);
          }}
        />
      </EuiPageContent>
    </EuiPageBody>
  );
};
