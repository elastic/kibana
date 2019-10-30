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
  EuiFilterGroup,
  EuiPopover,
  EuiFilterSelectItem,
  EuiFilterButton,
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

  // Policies state (for filtering)
  const [policies, setPolicies] = useState<any[]>([]);
  const [isPoliciesLoading, setIsPoliciesLoading] = useState<boolean>(false);
  const [isPoliciesFilterOpen, setIsPoliciesFilterOpen] = useState<boolean>(false);
  const currentFilteredPolicyIds: string[] = [];

  // Get list of filtered policy ids from current search string
  search.replace(/[\W]*agents\.policy_id[\W]*:[\W]*"?([\w]+)"?/, (match, policy) => {
    currentFilteredPolicyIds.push(policy);
    return policy;
  });

  // Add a policy id to current search
  const addPolicyFilter = (policyId: string) => {
    setSearch(`${search}${search.trim() ? ' or' : ''} agents.policy_id : "${policyId}"`);
  };

  // Remove a policy id from current search
  const removePolicyFilter = (policyId: string) => {
    setSearch(
      search.replace(new RegExp(`(and|or)?\\s+agents.policy_id\\s*:\\s*"?${policyId}"?`), '')
    );
  };

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

  // Fetch policies method
  const fetchPolicies = async () => {
    setIsPoliciesLoading(true);
    setPolicies(await libs.policies.getAll());
    setIsPoliciesLoading(false);
  };

  // Load initial list of agents
  useEffect(() => {
    fetchAgents();
    fetchPolicies();
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
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={3}>
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
              <EuiFlexItem grow={1}>
                <EuiFilterGroup>
                  <EuiPopover
                    ownFocus
                    button={
                      <EuiFilterButton
                        iconType="arrowDown"
                        onClick={() => setIsPoliciesFilterOpen(!isPoliciesFilterOpen)}
                        isSelected={isPoliciesFilterOpen}
                        hasActiveFilters={currentFilteredPolicyIds.length > 0}
                        disabled={isPoliciesLoading}
                      >
                        Policies
                      </EuiFilterButton>
                    }
                    isOpen={isPoliciesFilterOpen}
                    closePopover={() => setIsPoliciesFilterOpen(false)}
                    panelPaddingSize="none"
                  >
                    <div className="euiFilterSelect__items">
                      {policies.map((policy, index) => (
                        <EuiFilterSelectItem
                          checked={currentFilteredPolicyIds.includes(policy.id) ? 'on' : undefined}
                          key={index}
                          onClick={() => {
                            if (currentFilteredPolicyIds.includes(policy.id)) {
                              removePolicyFilter(policy.id);
                            } else {
                              addPolicyFilter(policy.id);
                            }
                          }}
                        >
                          {policy.name}
                        </EuiFilterSelectItem>
                      ))}
                    </div>
                  </EuiPopover>
                </EuiFilterGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
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
            isLoading ? (
              <FormattedMessage
                id="xpack.fleet.agentList.loadingAgentsMessage"
                defaultMessage="Loading agents…"
              />
            ) : !search.trim() && totalAgents === 0 ? (
              emptyPrompt
            ) : (
              <FormattedMessage
                id="xpack.fleet.agentList.noFilteredAgentsPrompt"
                defaultMessage="No agents found. {clearFiltersLink}"
                values={{
                  clearFiltersLink: (
                    <EuiLink onClick={() => setSearch('')}>
                      <FormattedMessage
                        id="xpack.fleet.agentList.clearFiltersLinkText"
                        defaultMessage="Clear filters"
                      />
                    </EuiLink>
                  ),
                }}
              />
            )
          }
          items={totalAgents ? agents : []}
          itemId="id"
          columns={columns}
          isSelectable={true}
          selection={{
            selectable: (agent: Agent) => agent.active,
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
