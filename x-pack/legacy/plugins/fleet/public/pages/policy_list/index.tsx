/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect } from 'react';
import {
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
  EuiBasicTable,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { Policy } from '../../../common/types/domain_data';
import { useLibs, usePagination } from '../../hooks';
import { ConnectedLink, SearchBar } from '../../components';
import { CreatePolicyFlyout } from './components';

export const PolicyListPage: React.FC<{}> = () => {
  const libs = useLibs();
  // Policy data states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [totalPolicies, setTotalPolicies] = useState<number>(0);

  // Create policy flyout state
  const [isCreatePolicyFlyoutOpen, setIsCreatePolicyFlyoutOpen] = useState<boolean>(false);

  // Table and search states
  const [search, setSearch] = useState<string>('');
  const { pagination, pageSizeOptions, setPagination } = usePagination();

  // Fetch policies method
  const fetchPolicies = async () => {
    setIsLoading(true);

    const { list, total } = await libs.policies.getAll(
      pagination.currentPage,
      pagination.pageSize,
      search.trim()
    );

    setPolicies(list);
    setTotalPolicies(total);
    setIsLoading(false);
  };

  // Load initial list of policies
  useEffect(() => {
    fetchPolicies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Some policies retrieved, set up table props
  const columns = [
    {
      field: 'name',
      name: i18n.translate('xpack.fleet.policyList.nameColumnTitle', {
        defaultMessage: 'Name/ID',
      }),
      render: (name: string, policy: Policy) => name || policy.id,
    },
    {
      field: 'description',
      name: i18n.translate('xpack.fleet.policyList.descriptionColumnTitle', {
        defaultMessage: 'Description',
      }),
    },
    {
      field: 'datasources',
      name: i18n.translate('xpack.fleet.policyList.datasourcesCountColumnTitle', {
        defaultMessage: 'Datasources assigned',
      }),
      render: (datasources: Policy['datasources']) => (datasources ? datasources.length : 0),
    },
    {
      name: i18n.translate('xpack.fleet.policyList.actionsColumnTitle', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          render: (policy: Policy) => {
            return (
              <ConnectedLink color="primary" path={`/policies/${policy.id}`}>
                <FormattedMessage
                  id="xpack.fleet.policyList.viewActionLinkText"
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
            id="xpack.fleet.policyList.noPoliciesPrompt"
            defaultMessage="No agent policies"
          />
        </h2>
      }
      actions={
        libs.framework.capabilities.write ? (
          <EuiButton fill iconType="plusInCircle" onClick={() => setIsCreatePolicyFlyoutOpen(true)}>
            <FormattedMessage
              id="xpack.fleet.policyList.addButton"
              defaultMessage="Create new policy"
            />
          </EuiButton>
        ) : null
      }
    />
  );

  return (
    <EuiPageBody>
      <EuiPageContent>
        {isCreatePolicyFlyoutOpen ? (
          <CreatePolicyFlyout
            onClose={() => {
              setIsCreatePolicyFlyoutOpen(false);
              fetchPolicies();
            }}
          />
        ) : null}

        <EuiTitle size="l">
          <h1>
            <FormattedMessage id="xpack.fleet.policyList.pageTitle" defaultMessage="Policies" />
          </h1>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup alignItems={'center'} justifyContent={'spaceBetween'}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <EuiText color="subdued">
                <FormattedMessage
                  id="xpack.fleet.policyList.pageDescription"
                  defaultMessage="Use policies to manage your agents and the data they collect."
                />
              </EuiText>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />

        <EuiFlexGroup alignItems={'center'} gutterSize="m">
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
              fieldPrefix="policies"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton color="secondary" iconType="refresh" onClick={() => fetchPolicies()}>
              <FormattedMessage
                id="xpack.fleet.policyList.reloadPoliciesButtonText"
                defaultMessage="Reload"
              />
            </EuiButton>
          </EuiFlexItem>
          {libs.framework.capabilities.write && (
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                iconType="plusInCircle"
                onClick={() => setIsCreatePolicyFlyoutOpen(true)}
              >
                <FormattedMessage
                  id="xpack.fleet.policyList.addButton"
                  defaultMessage="Create new policy"
                />
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        <EuiSpacer size="m" />
        <EuiBasicTable
          loading={isLoading}
          noItemsMessage={
            isLoading ? (
              <FormattedMessage
                id="xpack.fleet.policyList.loadingPoliciesMessage"
                defaultMessage="Loading policies…"
              />
            ) : !search.trim() && totalPolicies === 0 ? (
              emptyPrompt
            ) : (
              <FormattedMessage
                id="xpack.fleet.policyList.noFilteredPoliciesPrompt"
                defaultMessage="No policies found. {clearFiltersLink}"
                values={{
                  clearFiltersLink: (
                    <EuiLink onClick={() => setSearch('')}>
                      <FormattedMessage
                        id="xpack.fleet.policyList.clearFiltersLinkText"
                        defaultMessage="Clear filters"
                      />
                    </EuiLink>
                  ),
                }}
              />
            )
          }
          items={totalPolicies ? policies : []}
          itemId="id"
          columns={columns}
          isSelectable={true}
          pagination={{
            pageIndex: pagination.currentPage - 1,
            pageSize: pagination.pageSize,
            totalItemCount: totalPolicies,
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
