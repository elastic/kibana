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
  // @ts-ignore
  EuiSearchBar,
  EuiLink,
  EuiSwitch,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { AGENT_POLLING_THRESHOLD_MS } from '../../../common/constants';
import { Agent } from '../../../common/types/domain_data';
import { AgentHealth } from '../../components/agent_health';
import { AgentUnenrollProvider } from '../../components/agent_unenroll_provider';
import { ConnectedLink } from '../../components/navigation/connected_link';
import { usePagination } from '../../hooks/use_pagination';
import { SearchBar } from '../../components/search_bar';
import { AgentEnrollmentFlyout } from './components/agent_enrollment';
import { useLibs } from '../../hooks/use_libs';

export const AgentListPage: React.SFC<{}> = () => {
  const libs = useLibs();
  // Agent data states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [lastPolledAgentsMs, setLastPolledAgentsMs] = useState<number>(0);
  const [totalAgents, setTotalAgents] = useState<number>(0);
  const [showInactive, setShowInactive] = useState<boolean>(false);

  // Table and search states
  const [search, setSearch] = useState('');
  const { pagination, pageSizeOptions, setPagination } = usePagination();
  const [selectedAgents, setSelectedAgents] = useState<Agent[]>([]);
  const [areAllAgentsSelected, setAreAllAgentsSelected] = useState<boolean>(false);

  // Agent enrollment flyout state
  const [isEnrollmentFlyoutOpen, setIsEnrollmentFlyoutOpen] = useState<boolean>(false);

  // Fetch agents method
  const fetchAgents = async () => {
    setIsLoading(true);
    setLastPolledAgentsMs(new Date().getTime());
    const { list, total } = await libs.agents.getAll(
      pagination.currentPage,
      pagination.pageSize,
      search,
      showInactive
    );
    setAgents(list);
    setTotalAgents(total);
    setIsLoading(false);
  };

  // Load initial list of agents
  useEffect(() => {
    fetchAgents();
  }, [showInactive]);

  // Update agents if pagination or query state changes
  useEffect(() => {
    fetchAgents();
    setAreAllAgentsSelected(false);
  }, [pagination, search]);

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
      footer: () => {
        if (selectedAgents.length === agents.length && totalAgents > selectedAgents.length) {
          return areAllAgentsSelected ? (
            <FormattedMessage
              id="xpack.fleet.agentList.allAgentsSelectedMessage"
              defaultMessage="All {count} agents are selected. {clearSelectionLink}"
              values={{
                count: totalAgents,
                clearSelectionLink: (
                  <EuiLink onClick={() => setAreAllAgentsSelected(false)}>
                    <FormattedMessage
                      id="xpack.fleet.agentList.selectPageAgentsLinkText"
                      defaultMessage="Select just this page"
                    />
                  </EuiLink>
                ),
              }}
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.agentList.agentsOnPageSelectedMessage"
              defaultMessage="{count, plural, one {# agent} other {# agents}} on this page are selected. {selectAllLink}"
              values={{
                count: selectedAgents.length,
                selectAllLink: (
                  <EuiLink onClick={() => setAreAllAgentsSelected(true)}>
                    <FormattedMessage
                      id="xpack.fleet.agentList.selectAllAgentsLinkText"
                      defaultMessage="Select all {count} agents"
                      values={{
                        count: totalAgents,
                      }}
                    />
                  </EuiLink>
                ),
              }}
            />
          );
        }
        return null;
      },
    },
    {
      field: 'policy_id',
      name: i18n.translate('xpack.fleet.agentList.policyColumnTitle', {
        defaultMessage: 'Policy',
      }),
      truncateText: true,
    },
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
          render: (agent: Agent) => {
            return (
              <ConnectedLink color="primary" path={`/agents/${agent.id}`}>
                <FormattedMessage
                  id="xpack.fleet.agentList.viewActionLinkText"
                  defaultMessage="view"
                />
              </ConnectedLink>
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
        libs.framework.capabilities.write ? (
          <EuiButton fill iconType="plusInCircle" onClick={() => setIsEnrollmentFlyoutOpen(true)}>
            <FormattedMessage
              id="xpack.fleet.agentList.addButton"
              defaultMessage="Install new agent"
            />
          </EuiButton>
        ) : null
      }
    />
  );

  return (
    <EuiPageBody>
      <EuiPageContent>
        {isEnrollmentFlyoutOpen ? (
          <AgentEnrollmentFlyout onClose={() => setIsEnrollmentFlyoutOpen(false)} />
        ) : null}

        <EuiTitle size="l">
          <h1>
            <FormattedMessage id="xpack.fleet.agentList.pageTitle" defaultMessage="Elastic Fleet" />
          </h1>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup alignItems={'center'} justifyContent={'spaceBetween'}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <EuiText color="subdued">
                <FormattedMessage
                  id="xpack.fleet.agentList.pageDescription"
                  defaultMessage="Use agents to faciliate data collection for your Elastic stack."
                />
              </EuiText>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label={i18n.translate('xpack.fleet.agentList.showInactiveSwitchLabel', {
                defaultMessage: 'Show inactive agents',
              })}
              checked={showInactive}
              onChange={() => setShowInactive(!showInactive)}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />

        <EuiFlexGroup alignItems={'center'}>
          {selectedAgents.length ? (
            <EuiFlexItem>
              <AgentUnenrollProvider>
                {unenrollAgentsPrompt => (
                  <EuiButton
                    color="danger"
                    onClick={() => {
                      unenrollAgentsPrompt(
                        areAllAgentsSelected ? search : selectedAgents.map(agent => agent.id),
                        areAllAgentsSelected ? totalAgents : selectedAgents.length,
                        () => {
                          // Reload agents if on first page and no search query, otherwise
                          // reset to first page and reset search, which will trigger a reload
                          if (pagination.currentPage === 1 && !search) {
                            fetchAgents();
                          } else {
                            setPagination({
                              ...pagination,
                              currentPage: 1,
                            });
                            setSearch('');
                          }

                          setAreAllAgentsSelected(false);
                          setSelectedAgents([]);
                        }
                      );
                    }}
                  >
                    <FormattedMessage
                      id="xpack.fleet.agentList.unenrollButton"
                      defaultMessage="Unenroll {count, plural, one {# agent} other {# agents}}"
                      values={{
                        count: areAllAgentsSelected ? totalAgents : selectedAgents.length,
                      }}
                    />
                  </EuiButton>
                )}
              </AgentUnenrollProvider>
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={4}>
            <SearchBar
              value={search}
              onChange={newSearch => {
                setPagination({
                  ...pagination,
                  currentPage: 1,
                });
                setSearch(newSearch);
              }}
              fieldPrefix="agents"
            />
          </EuiFlexItem>
          {libs.framework.capabilities.write && (
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                iconType="plusInCircle"
                onClick={() => setIsEnrollmentFlyoutOpen(true)}
              >
                <FormattedMessage
                  id="xpack.fleet.agentList.addButton"
                  defaultMessage="Install new agent"
                />
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        <EuiSpacer size="m" />
        <EuiBasicTable
          className="fleet__agentList__table"
          loading={isLoading}
          noItemsMessage={
            isLoading
              ? i18n.translate('xpack.fleet.agentList.loadingAgentsMessage', {
                  defaultMessage: 'Loading agents…',
                })
              : !search.trim() && totalAgents === 0
              ? emptyPrompt
              : i18n.translate('xpack.fleet.agentList.noFilteredAgentsPrompt', {
                  defaultMessage: 'No agents found',
                })
          }
          items={totalAgents ? agents : []}
          itemId="id"
          columns={columns}
          isSelectable={true}
          selection={{
            selectable: () => true,
            onSelectionChange: (newSelectedAgents: Agent[]) => {
              setSelectedAgents(newSelectedAgents);
              setAreAllAgentsSelected(false);
            },
          }}
          pagination={{
            pageIndex: pagination.currentPage - 1,
            pageSize: pagination.pageSize,
            totalItemCount: totalAgents,
            pageSizeOptions,
          }}
          onChange={({ page }: { page: { index: number; size: number } }) => {
            const newPagination = {
              ...pagination,
              currentPage: page.index + 1,
              pageSize: page.size,
            };
            setPagination(newPagination);
          }}
        />
      </EuiPageContent>
    </EuiPageBody>
  );
};
